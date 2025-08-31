# Deployment Guide

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project** - Create project at [supabase.com](https://supabase.com)
3. **Upstash Redis** - Create database at [upstash.com](https://upstash.com)
4. **Custom Domain** (optional) - For production use

## Environment Variables

Create these environment variables in Vercel dashboard:

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=AI Assistant
```

### 11.ai Integration
```
ELEVEN_AI_API_KEY=your-11ai-api-key
ELEVEN_AI_AGENT_ID=your-agent-id
```

### MCP Servers
```
M365_MCP_SERVER_URL=https://m365mcp-production.up.railway.app
UNIVERSAL_AUTH_SERVICE_URL=https://universal-auth-service-production.up.railway.app
```

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

### Authentication
```
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### Redis (Upstash)
```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Deployment Steps

### 1. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Push code to GitHub repository
2. Import project in Vercel dashboard
3. Connect GitHub repository
4. Configure environment variables
5. Deploy

### 2. Set up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the schema from `database/schema.sql`
4. Enable RLS on all tables
5. Test database connection

### 3. Configure Custom Domain (Optional)

1. In Vercel dashboard, go to Project Settings
2. Navigate to Domains tab
3. Add your custom domain
4. Configure DNS records as instructed
5. Wait for SSL certificate provisioning

### 4. Test Deployment

1. Visit your deployed URL
2. Test PWA installation
3. Verify service worker registration
4. Test device session creation
5. Check Redis session storage

## Post-Deployment Checklist

- [ ] App loads successfully
- [ ] PWA manifest works
- [ ] Service worker registers
- [ ] Database connection established
- [ ] Redis sessions working
- [ ] Environment variables configured
- [ ] Custom domain (if applicable)
- [ ] SSL certificate active
- [ ] Device fingerprinting functional

## Troubleshooting

### Build Errors
- Check all environment variables are set
- Verify database schema is applied
- Ensure Redis connection is configured

### Runtime Errors
- Check Vercel function logs
- Verify Supabase RLS policies
- Test Redis connectivity

### PWA Issues
- Ensure HTTPS is enabled
- Check service worker registration
- Verify manifest.json is accessible

## Monitoring

### Vercel Dashboard
- Function invocations
- Build logs
- Performance analytics

### Supabase Dashboard
- Database usage
- API requests
- Authentication logs

### Upstash Console
- Redis operations
- Memory usage
- Connection metrics