-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('agent', 'admin')),
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel TEXT NOT NULL CHECK (channel IN ('website', 'whatsapp', 'slack', 'telegram', 'facebook')),
  customer_identifier TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'handoff', 'resolved')),
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_identifier TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('General', 'Technical', 'Billing', 'Account', 'Other')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'Resolved')),
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: faqs (Grounding dataset for AI)
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Default FAQs and Agent
INSERT INTO agents (name, email, role, is_online)
VALUES ('Demo Support Agent', 'support@example.com', 'admin', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO faqs (question, answer, category) VALUES
('What are your business hours?', 'Our support team is available Monday through Friday from 9:00 AM to 6:00 PM EST. The AI assistant operates 24/7.', 'General'),
('How can I track my order or request a refund?', 'You can check your order status under your Account Dashboard. Refunds are processed within 5-7 business days upon receipt of the returned item.', 'Billing'),
('How do I reset my password?', 'Click on "Forgot Password" on the login page and enter your registered email address to receive a secure password reset link.', 'Account'),
('Where can I see warranty coverage?', 'Standard coverage includes 1-year limited warranty on all manufactured components excluding intentional physical damage or water wear beyond depth ratings.', 'Technical')
ON CONFLICT DO NOTHING;

