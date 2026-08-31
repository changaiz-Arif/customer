import React, { useState } from 'react';
import ChatWidget from './components/ChatWidget';
import TicketManager from './components/TicketManager';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="app-container">
      <header className="navbar">
        <h2>Multi-Channel Support Hub</h2>
        <div className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Customer Chat
          </button>
          <button
            className={`nav-btn ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            Tickets
          </button>
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Admin Dashboard
          </button>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'chat' && <ChatWidget apiUrl={API_URL} />}
        {activeTab === 'tickets' && <TicketManager apiUrl={API_URL} />}
        {activeTab === 'dashboard' && <AdminDashboard apiUrl={API_URL} />}
      </main>
    </div>
  );
}
