-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User sessions table for device persistence
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  user_agent TEXT NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP authentication sessions for popup-based auth
CREATE TABLE IF NOT EXISTS mcp_auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, service_name)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id ON user_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_mcp_auth_sessions_device_id ON mcp_auth_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_mcp_auth_sessions_service ON mcp_auth_sessions(service_name);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcp_auth_sessions_updated_at BEFORE UPDATE ON mcp_auth_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions (device-based access)
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (device_id = current_setting('app.device_id', true));

-- Policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (user_id IN (
    SELECT id FROM user_sessions WHERE device_id = current_setting('app.device_id', true)
  ));

CREATE POLICY "Users can insert their own conversations" ON conversations
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM user_sessions WHERE device_id = current_setting('app.device_id', true)
  ));

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (user_id IN (
    SELECT id FROM user_sessions WHERE device_id = current_setting('app.device_id', true)
  ));

-- Policies for messages
CREATE POLICY "Users can view messages from their conversations" ON messages
  FOR SELECT USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN user_sessions us ON c.user_id = us.id
    WHERE us.device_id = current_setting('app.device_id', true)
  ));

CREATE POLICY "Users can insert messages to their conversations" ON messages
  FOR INSERT WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN user_sessions us ON c.user_id = us.id
    WHERE us.device_id = current_setting('app.device_id', true)
  ));

-- Policies for MCP auth sessions
CREATE POLICY "Users can view their own MCP auth sessions" ON mcp_auth_sessions
  FOR SELECT USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can insert their own MCP auth sessions" ON mcp_auth_sessions
  FOR INSERT WITH CHECK (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can update their own MCP auth sessions" ON mcp_auth_sessions
  FOR UPDATE USING (device_id = current_setting('app.device_id', true));

CREATE POLICY "Users can delete their own MCP auth sessions" ON mcp_auth_sessions
  FOR DELETE USING (device_id = current_setting('app.device_id', true));