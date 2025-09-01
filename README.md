# AI Assistant Web App

A comprehensive web application that provides a voice and chat interface to your 11.ai agent with seamless MCP server authentication.

## 🎯 **Project Overview**

This application solves the authentication challenges with 11.ai MCP integration by creating a custom web interface that provides:

- **🎤 Hands-free voice interaction** with your 11.ai agent
- **💬 Chat interface** for quiet environments  
- **📱 Cross-platform PWA** (works on desktop, mobile, tablet)
- **🔐 Seamless MCP authentication** via popup windows
- **📢 Siri integration** via webhooks ("Hey Siri, ask my assistant...")
- **💾 Persistent device authentication** (remember login)
- **🔄 Real-time responses** with WebSocket/SSE

## 🏗️ **Technical Architecture**

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  User Device        │    │  Next.js Web App     │    │  11.ai Agent        │
│  (Browser/Mobile)   │◄──►│  (Your Backend)      │◄──►│  (External API)     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
          │                          │                           │
          │                          ▼                           ▼
          │                ┌──────────────────────┐    ┌─────────────────────┐
          │                │  Supabase Database   │    │  MCP Servers        │
          └────────────────┤  - Device Auth       │    │  - M365             │
                           │  - Session Data      │    │  - Universal Auth   │
                           │  - Conversation Log  │    │  - Others...        │
                           └──────────────────────┘    └─────────────────────┘
```

## 🛠️ **Tech Stack**

### **Frontend Framework**
- **Next.js 14** with TypeScript and App Router ✅
- **Tailwind CSS** for responsive styling ✅
- **Shadcn/ui** for component library
- **PWA** capabilities for mobile installation

### **Backend & Database**
- **Next.js API Routes** for server-side logic
- **Supabase** for PostgreSQL database and real-time subscriptions
- **Upstash Redis** for session management and caching
- **NextAuth.js** for authentication with device persistence

### **Voice & Real-time**
- **Web Speech API** for speech-to-text and text-to-speech
- **WebSockets/Server-Sent Events** for real-time conversation
- **Audio processing** for voice activity detection

### **Integrations**
- **11.ai Agent API** for AI conversation
- **MCP Server Integration** for M365, Universal Auth, etc.
- **Siri Shortcuts** webhook for voice activation
- **Push Notifications** for background responses

### **Deployment**
- **Vercel** for Next.js hosting with edge functions
- **Custom Domain** with HTTPS (required for voice APIs)

## 🗄️ **Database Schema**

### **Enhanced Tables for Multi-User & Multi-Agent Support**

```sql
-- Users table with role-based access
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agents table for ElevenLabs agent management
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elevenlabs_agent_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  voice_settings JSONB,
  configuration JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Agent relationships (many-to-many)
CREATE TABLE user_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

-- Enhanced conversations with agent tracking
ALTER TABLE conversations ADD COLUMN agent_id UUID REFERENCES agents(id);
ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES users(id);

-- Agent usage analytics
CREATE TABLE agent_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  conversation_id UUID REFERENCES conversations(id),
  message_count INTEGER DEFAULT 0,
  voice_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📋 **Implementation Progress**

### **Phase 1: Foundation Setup** ✅
- [x] **1.1** Initialize Next.js 14 project with TypeScript
- [x] **1.2** Set up Tailwind CSS and Shadcn/ui components
- [x] **1.3** Configure PWA manifest and service worker
- [x] **1.4** Set up Supabase project and database schema
- [x] **1.5** Configure Upstash Redis for sessions
- [x] **1.6** Set up basic authentication with NextAuth.js
- [x] **1.7** Deploy to Vercel with custom domain

### **Phase 2: Core Interface** ✅
- [x] **2.1** Build responsive chat interface
- [x] **2.2** Implement Web Speech API for voice input/output
- [x] **2.3** Add voice activity detection and controls
- [ ] **2.4** Create device fingerprinting for persistent auth
- [ ] **2.5** Build settings page for user preferences
- [ ] **2.6** Add dark/light mode toggle
- [ ] **2.7** Implement offline capability indicators

### **Phase 3: 11.ai Integration** ✅
- [x] **3.1** Create ElevenLabs API integration service
- [x] **3.2** Build conversation state management with WebSocket
- [x] **3.3** Implement real-time message streaming and audio playback
- [x] **3.4** Add conversation history and persistence
- [x] **3.5** Handle typing indicators and loading states
- [x] **3.6** Error handling and retry logic with auto-reconnect
- [ ] **3.7** Rate limiting and usage tracking

### **Phase 4: User Management & Authentication** ⏳
- [ ] **4.1** Create user registration and authentication system
- [ ] **4.2** Implement role-based access control (Admin/User)
- [ ] **4.3** Build user profile management
- [ ] **4.4** Add password reset functionality
- [ ] **4.5** Implement email verification system
- [ ] **4.6** Create user session management
- [ ] **4.7** Build device fingerprinting for persistent auth

### **Phase 5: Admin Dashboard** ⏳
- [ ] **5.1** Create protected admin routes and middleware
- [ ] **5.2** Build admin dashboard layout and navigation
- [ ] **5.3** Implement user management interface (CRUD)
- [ ] **5.4** Add user search, filtering, and pagination
- [ ] **5.5** Create bulk user operations (activate/deactivate/delete)
- [ ] **5.6** Build password reset admin controls
- [ ] **5.7** Add user activity monitoring and analytics

### **Phase 6: Agent Management System** ⏳
- [ ] **6.1** Create agent database schema and models
- [ ] **6.2** Build ElevenLabs agent discovery and sync
- [ ] **6.3** Implement agent CRUD operations (admin)
- [ ] **6.4** Create agent configuration interface
- [ ] **6.5** Build user-agent provisioning system
- [ ] **6.6** Add agent usage tracking and analytics
- [ ] **6.7** Implement agent health monitoring

### **Phase 7: Multi-Agent User Interface** ⏳
- [ ] **7.1** Update database schema for user-agent relationships
- [ ] **7.2** Create agent selection dropdown in chat interface
- [ ] **7.3** Build user settings page for agent management
- [ ] **7.4** Implement agent switching with conversation context
- [ ] **7.5** Add agent-specific conversation history
- [ ] **7.6** Create agent availability indicators
- [ ] **7.7** Build agent preference settings per user

### **Phase 8: MCP Authentication** ⏳
- [ ] **8.1** Build MCP server proxy endpoints
- [ ] **8.2** Implement popup-based OAuth flows
- [ ] **8.3** Add M365 MCP server integration
- [ ] **8.4** Handle Universal Auth Service flows
- [ ] **8.5** Token refresh and session management
- [ ] **8.6** Multi-MCP server support
- [ ] **8.7** Authentication status monitoring

### **Phase 9: Advanced Voice Features** ⏳
- [ ] **9.1** Advanced voice processing and noise reduction
- [ ] **9.2** Conversation context and memory
- [ ] **9.3** Voice commands and shortcuts
- [ ] **9.4** Multi-language support
- [ ] **9.5** Voice settings and calibration
- [ ] **9.6** Push-to-talk and hands-free modes
- [ ] **9.7** Voice feedback and confirmations

### **Phase 10: Siri Integration** ⏳
- [ ] **10.1** Create webhook endpoint for Siri Shortcuts
- [ ] **10.2** Build Siri Shortcut automation
- [ ] **10.3** Handle background voice requests
- [ ] **10.4** Push notification responses
- [ ] **10.5** Context preservation across Siri calls
- [ ] **10.6** iOS Shortcuts app integration
- [ ] **10.7** Testing and optimization

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ and npm
- Supabase account and project
- Upstash Redis account  
- Vercel account for deployment
- 11.ai account and API access

### **Development**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript checking
npm run lint         # ESLint checking
```

### **Environment Variables**
Create `.env.local`:
```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="AI Assistant"

# 11.ai Integration
ELEVEN_AI_API_KEY=your-11ai-api-key
ELEVEN_AI_AGENT_ID=your-agent-id

# MCP Servers
M365_MCP_SERVER_URL=https://m365mcp-production.up.railway.app
UNIVERSAL_AUTH_SERVICE_URL=https://universal-auth-service-production.up.railway.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

---

**Status**: ✅ **Phase 3 Complete** - Full ElevenLabs voice agent integration with modern interface

**Key Features Implemented:**
- 🎤 **ElevenLabs Voice Agent**: Real-time conversational AI with WebSocket streaming
- 🎨 **Modern UI**: Clean circular call interface with glass effect styling
- 🗣️ **Advanced Voice Processing**: AI voice feedback detection and interruption handling
- 💬 **Dual Mode Interface**: Seamless switching between voice-only and text-only modes
- 🔄 **Real-time Audio**: PCM audio streaming with queue management and auto-reconnect
- 📱 **Responsive Design**: Optimized for desktop and mobile with proper hydration
- ⚡ **Smart Controls**: Voice/text mode toggle with immediate state cleanup

**Next Major Features to Implement:**
- 👥 **Multi-User System**: User registration, authentication, and role-based access
- 🎛️ **Admin Dashboard**: Complete user management and analytics interface
- 🤖 **Multi-Agent Support**: Dynamic agent provisioning and user-specific agent access
- 🔧 **Agent Management**: ElevenLabs agent discovery, configuration, and monitoring

**Next Steps**: Begin Phase 4 (User Management & Authentication) to establish the foundation for multi-user and admin capabilities