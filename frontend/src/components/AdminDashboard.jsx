import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ apiUrl }) {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchMetrics();
    fetchStatus();
  }, []);

  const fetchMetrics = async () => {
    const res = await fetch(`${apiUrl}/api/admin/metrics`);
    const data = await res.json();
    setMetrics(data.metrics);
  };

  const fetchStatus = async () => {
    const res = await fetch(`${apiUrl}/api/status`);
    const data = await res.json();
    setStatus(data.channels);
  };

  if (!metrics) return <div>Loading dashboard...</div>;

  return (
    <div>
      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-title">Active Conversations</div>
          <div className="metric-value">{metrics.activeConversations}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Escalated Cases</div>
          <div className="metric-value" style={{ color: 'var(--status-urgent)' }}>{metrics.escalatedCases}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Open Tickets</div>
          <div className="metric-value">{metrics.openTickets}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Resolved Tickets</div>
          <div className="metric-value" style={{ color: 'var(--status-resolved)' }}>{metrics.resolvedTickets}</div>
        </div>
      </div>

      <div className="metric-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Channel Integrations Readiness</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {status && Object.entries(status).map(([channel, info]) => (
            <div key={channel} style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 6 }}>
              <div style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{channel}</div>
              <div style={{ fontSize: '0.8rem', color: info.live ? 'var(--status-resolved)' : 'var(--status-pending)' }}>
                {info.live ? '● Live API Connected' : '◌ Demo Mode Active'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

