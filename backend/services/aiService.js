import { supabase } from '../supabaseClient.js';

export const aiService = {
  async processMessage(conversationId, userMessage) {
    // 1. Fetch grounding FAQs
    const { data: faqs } = await supabase.from('faqs').select('question, answer');
    const faqList = faqs || [];

    const lower = userMessage.toLowerCase();
    
    // Explicit escalation signals
    const escalationKeywords = ['human', 'agent', 'operator', 'representative', 'talk to person', 'escalate', 'lawyer', 'complaint'];
    const shouldEscalate = escalationKeywords.some(kw => lower.includes(kw));

    if (shouldEscalate) {
      return {
        reply: "I am routing your request to a live support agent right away. A team member will join this conversation shortly.",
        confidence: 0.1,
        needsEscalation: true,
        reason: 'Customer explicitly requested a human agent.'
      };
    }

    // 2. Simple Semantic/Keyword Match against FAQ dataset
    let matchedFaq = null;
    for (const item of faqList) {
      const qWords = item.question.toLowerCase().split(/\s+/);
      const matches = qWords.filter(w => w.length > 3 && lower.includes(w));
      if (matches.length >= 2) {
        matchedFaq = item;
        break;
      }
    }

    if (matchedFaq) {
      return {
        reply: matchedFaq.answer,
        confidence: 0.95,
        needsEscalation: false
      };
    }

    // 3. Fallback LLM logic if configured, otherwise smart rule-based guidance
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: `You are an enterprise customer support agent. Ground your answers strictly on the business context. FAQs:\n${JSON.stringify(faqList)}` },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.3
          })
        });
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        return {
          reply: reply || "I'm having trouble processing that right now. Let me hand you off to a representative.",
          confidence: 0.85,
          needsEscalation: false
        };
      } catch (err) {
        console.error('LLM error:', err);
      }
    }

    // Low confidence fallback: triggers automatic ticket/escalation offer
    return {
      reply: "I couldn't locate a precise answer in our knowledge base. Would you like me to connect you with a human agent or file a support ticket?",
      confidence: 0.4,
      needsEscalation: true,
      reason: 'Low AI confidence score.'
    };
  }
};

