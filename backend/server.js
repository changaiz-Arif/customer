import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';
import { aiService } from './services/aiService.js';
import { whatsappService } from './services/whatsappService.js';
import { slackService } from './services/slackService.js';
import { telegramService } from './services/telegramService.js';
import { facebookService } from './services/facebookService.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Health & Integration Status
app.get('/api/status', (req, res) => {
  res.json({
    channels: {
      whatsapp: { live: whatsappService.isConfigured() },
      slack: { live: slackService.isConfigured() },
      telegram: { live: telegramService.isConfigured() },
      facebook: { live: facebookService.isConfigured() },
      website: { live: true }
    }
  });
});

// 2. Chat: Initialize or Retrieve Conversation
app.post('/api/chat/init', async (req, res) => {
  const { customerIdentifier, channel = 'website' } = req.body;
  try {
    let { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('customer_identifier', customerIdentifier)
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!convo) {
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert([{ customer_identifier: customerIdentifier, channel, status: 'active' }])
        .select()
        .single();
      if (error) throw error;
      convo = newConvo;

      // Post welcome message
      await supabase.from('messages').insert([{
        conversation_id: convo.id,
        sender_type: 'ai',
        content: 'Hello! I am your AI Support Assistant. How can I help you today?'
      }]);
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true });

    res.json({ conversation: convo, messages: messages || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Chat: Send Message
app.post('/api/chat/message', async (req, res) => {
  const { conversationId, content, senderType = 'customer', senderId } = req.body;
  try {
    // Record inbound message
    const { data: userMsg, error: userMsgErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: conversationId, sender_type: senderType, sender_id: senderId, content }])
      .select()
      .single();

    if (userMsgErr) throw userMsgErr;

    const { data: convo } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convo.status === 'handoff') {
      return res.json({ message: userMsg, handoff: true });
    }

    // Process via AI Engine
    const aiResult = await aiService.processMessage(conversationId, content);

    // Save AI response
    const { data: aiMsg } = await supabase
      .from('messages')
      .insert([{ conversation_id: conversationId, sender_type: 'ai', content: aiResult.reply }])
      .select()
      .single();

    // Check if auto-escalation is required
    if (aiResult.needsEscalation) {
      await supabase
        .from('conversations')
        .update({ status: 'escalated' })
        .eq('id', conversationId);

      // Notify Slack support channel
      await slackService.notifyChannel('#support-escalations', `Escalation trigger in conversation ${conversationId}: ${aiResult.reason}`);
    }

    res.json({
      customerMessage: userMsg,
      aiMessage: aiMsg,
      escalated: aiResult.needsEscalation,
      confidence: aiResult.confidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Escalation & Human Handoff
app.post('/api/chat/escalate', async (req, res) => {
  const { conversationId, reason } = req.body;
  try {
    const { data: convo } = await supabase
      .from('conversations')
      .update({ status: 'escalated' })
      .eq('id', conversationId)
      .select()
      .single();

    // System event note
    await supabase.from('messages').insert([{
      conversation_id: conversationId,
      sender_type: 'system',
      content: `System: Conversation flagged for human escalation. Reason: ${reason || 'Customer request'}`
    }]);

    await slackService.notifyChannel('#support-escalations', `Case ${conversationId} manually escalated.`);
    res.json({ success: true, conversation: convo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat/handoff', async (req, res) => {
  const { conversationId, agentId } = req.body;
  try {
    const { data: convo } = await supabase
      .from('conversations')
      .update({ status: 'handoff', assigned_agent_id: agentId })
      .eq('id', conversationId)
      .select()
      .single();

    await supabase.from('messages').insert([{
      conversation_id: conversationId,
      sender_type: 'system',
      content: 'A human agent has connected and is reviewing your message history.'
    }]);

    res.json({ success: true, conversation: convo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Tickets Endpoint
app.post('/api/tickets', async (req, res) => {
  const { conversationId, customerIdentifier, subject, description, category, priority } = req.body;
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        conversation_id: conversationId || null,
        customer_identifier: customerIdentifier,
        subject,
        description,
        category: category || 'General',
        priority: priority || 'Medium',
        status: 'Open'
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, ticket: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tickets', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { status, priority, assigned_agent_id } = req.body;
  try {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status, priority, assigned_agent_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Admin Overview Metrics
app.get('/api/admin/metrics', async (req, res) => {
  try {
    const [convos, tickets] = await Promise.all([
      supabase.from('conversations').select('id, status, channel, created_at'),
      supabase.from('tickets').select('id, status, priority, created_at')
    ]);

    const convoData = convos.data || [];
    const ticketData = tickets.data || [];

    const metrics = {
      activeConversations: convoData.filter(c => c.status === 'active').length,
      escalatedCases: convoData.filter(c => c.status === 'escalated' || c.status === 'handoff').length,
      openTickets: ticketData.filter(t => t.status === 'Open').length,
      pendingTickets: ticketData.filter(t => t.status === 'Pending').length,
      resolvedTickets: ticketData.filter(t => t.status === 'Resolved').length,
      highPriorityTickets: ticketData.filter(t => t.priority === 'High' || t.priority === 'Urgent').length
    };

    res.json({ metrics, conversations: convoData, tickets: ticketData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Support Backend running on port ${PORT}`));

