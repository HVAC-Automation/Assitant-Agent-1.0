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

### **Phase 3: 11.ai Integration** ⏳
- [ ] **3.1** Create 11.ai API integration service
- [ ] **3.2** Build conversation state management
- [ ] **3.3** Implement real-time message streaming
- [ ] **3.4** Add conversation history and persistence
- [ ] **3.5** Handle typing indicators and loading states
- [ ] **3.6** Error handling and retry logic
- [ ] **3.7** Rate limiting and usage tracking

### **Phase 4: MCP Authentication** ⏳
- [ ] **4.1** Build MCP server proxy endpoints
- [ ] **4.2** Implement popup-based OAuth flows
- [ ] **4.3** Add M365 MCP server integration
- [ ] **4.4** Handle Universal Auth Service flows
- [ ] **4.5** Token refresh and session management
- [ ] **4.6** Multi-MCP server support
- [ ] **4.7** Authentication status monitoring

### **Phase 5: Voice Features** ⏳
- [ ] **5.1** Advanced voice processing and noise reduction
- [ ] **5.2** Conversation context and memory
- [ ] **5.3** Voice commands and shortcuts
- [ ] **5.4** Multi-language support
- [ ] **5.5** Voice settings and calibration
- [ ] **5.6** Push-to-talk and hands-free modes
- [ ] **5.7** Voice feedback and confirmations

### **Phase 6: Siri Integration** ⏳
- [ ] **6.1** Create webhook endpoint for Siri Shortcuts
- [ ] **6.2** Build Siri Shortcut automation
- [ ] **6.3** Handle background voice requests
- [ ] **6.4** Push notification responses
- [ ] **6.5** Context preservation across Siri calls
- [ ] **6.6** iOS Shortcuts app integration
- [ ] **6.7** Testing and optimization

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

**Status**: ✅ **Phase 2 Complete** - Modern chat interface with full Web Speech API integration

**Key Features Implemented:**
- 🗣️ **Voice Input**: Speech-to-text with real-time transcription
- 🔊 **Voice Output**: Text-to-speech with auto-speak toggle  
- 💬 **Responsive Chat**: Mobile-friendly interface with typing indicators
- 🎯 **Voice Controls**: Visual feedback and error handling
- 📱 **Cross-browser Support**: Works on Chrome, Edge, Safari with HTTPS

**Next Steps**: Begin Phase 3 with 11.ai integration and real-time streaming