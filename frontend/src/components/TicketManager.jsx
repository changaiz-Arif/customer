import React, { useState, useEffect } from 'react';

export default function TicketManager({ apiUrl }) {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({
    customerIdentifier: 'user@example.com',
    subject: '',
    description: '',
    category: 'General',
    priority: 'Medium'
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const res = await fetch(`${apiUrl}/api/tickets`);
    const data = await res.json();
    setTickets(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description) return;

    await fetch(`${apiUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    setForm({ customerIdentifier: 'user@example.com', subject: '', description: '', category: 'General', priority: 'Medium' });
    loadTickets();
  };

  const updateStatus = async (id, status) => {
    await fetch(`${apiUrl}/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadTickets();
  };

  return (
    <div>
      <div className="metric-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Submit a Support Ticket</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <input
            className="chat-input"
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
          <select
            className="chat-input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>General</option>
            <option>Technical</option>
            <option>Billing</option>
            <option>Account</option>
          </select>
          <select
            className="chat-input"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
          <input
            className="chat-input"
            placeholder="Customer Email"
            value={form.customerIdentifier}
            onChange={(e) => setForm({ ...form, customerIdentifier: e.target.value })}
            required
          />
          <textarea
            className="chat-input"
            style={{ gridColumn: 'span 2', minHeight: 80 }}
            placeholder="Describe the issue in detail..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2' }}>
            Submit Ticket
          </button>
        </form>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id}>
                <td>{t.id.slice(0, 8)}...</td>
                <td>{t.customer_identifier}</td>
                <td>{t.subject}</td>
                <td>{t.category}</td>
                <td>
                  <span className={`badge badge-${t.priority === 'Urgent' || t.priority === 'High' ? 'urgent' : 'open'}`}>
                    {t.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${t.status.toLowerCase()}`}>
                    {t.status}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ marginRight: 5 }} onClick={() => updateStatus(t.id, 'Pending')}>Pending</button>
                  <button className="btn-secondary" onClick={() => updateStatus(t.id, 'Resolved')}>Resolve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

