import React, { useState, useEffect } from 'react';

export default function ChatWidget({ apiUrl }) {
  const [customerEmail, setCustomerEmail] = useState('customer@example.com');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIdentifier: customerEmail, channel: 'website' })
      });
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to init chat', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), sender_type: 'customer', content: userText }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: userText,
          senderType: 'customer'
        })
      });
      const data = await res.json();
      if (data.aiMessage) {
        setMessages(prev => [...prev, data.aiMessage]);
      }
      if (data.escalated) {
        setConversation(prev => ({ ...prev, status: 'escalated' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!conversation) return;
    try {
      const res = await fetch(`${apiUrl}/api/chat/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversation.id, reason: 'Customer requested human support' })
      });
      const data = await res.json();
      setConversation(data.conversation);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender_type: 'system',
        content: 'System: You have requested an escalation. An agent will connect shortly.'
      }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <strong>AI Assistant Support</strong>
          <span style={{ marginLeft: 10 }} className="channel-tag">Channel: Web</span>
          {conversation?.status === 'escalated' && <span className="badge badge-urgent" style={{ marginLeft: 8 }}>Escalated</span>}
        </div>
        <button className="btn-secondary" onClick={handleEscalate}>Talk to Human</button>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`message-bubble message-${m.sender_type}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="message-bubble message-ai">Typing...</div>}
      </div>

      <form onSubmit={sendMessage} className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question or describe an issue..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>Send</button>
      </form>
    </div>
  );
}

