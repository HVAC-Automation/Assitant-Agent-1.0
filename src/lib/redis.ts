import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

function getRedisInstance() {
  if (!redisInstance) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    
    if (!url || !token) {
      throw new Error('Redis environment variables not configured')
    }
    
    redisInstance = new Redis({ url, token })
  }
  
  return redisInstance
}

export const redis = {
  get: (...args: Parameters<Redis['get']>) => getRedisInstance().get(...args),
  set: (...args: Parameters<Redis['set']>) => getRedisInstance().set(...args),
  setex: (...args: Parameters<Redis['setex']>) => getRedisInstance().setex(...args),
  del: (...args: Parameters<Redis['del']>) => getRedisInstance().del(...args),
  expire: (...args: Parameters<Redis['expire']>) => getRedisInstance().expire(...args),
  incr: (...args: Parameters<Redis['incr']>) => getRedisInstance().incr(...args),
}

// Session management utilities
export interface DeviceSession {
  deviceId: string
  userAgent: string
  createdAt: string
  lastActive: string
  clientFingerprint?: string
  serverFingerprint?: string
}

export interface MCPAuthData {
  accessToken: string
  refreshToken?: string
  expiresAt: string
  service: string
}

export interface ConversationState {
  conversationId: string
  lastMessageId?: string
  context?: Record<string, unknown>
}

export class SessionManager {
  private static readonly SESSION_TTL = 60 * 60 * 24 * 30 // 30 days in seconds
  private static readonly DEVICE_PREFIX = 'device:'
  private static readonly SESSION_PREFIX = 'session:'

  static async createDeviceSession(deviceId: string, sessionData: DeviceSession) {
    const sessionKey = `${this.SESSION_PREFIX}${deviceId}`
    await redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData))
    return sessionKey
  }

  static async getDeviceSession(deviceId: string): Promise<DeviceSession | null> {
    const sessionKey = `${this.SESSION_PREFIX}${deviceId}`
    const session = await redis.get(sessionKey)
    
    if (session) {
      // Extend TTL on access
      await redis.expire(sessionKey, this.SESSION_TTL)
      return JSON.parse(session as string) as DeviceSession
    }
    
    return null
  }

  static async updateDeviceSession(deviceId: string, sessionData: DeviceSession) {
    const sessionKey = `${this.SESSION_PREFIX}${deviceId}`
    await redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData))
  }

  static async deleteDeviceSession(deviceId: string) {
    const sessionKey = `${this.SESSION_PREFIX}${deviceId}`
    await redis.del(sessionKey)
  }

  // MCP Authentication session management
  static async storeMCPAuthSession(deviceId: string, service: string, authData: MCPAuthData) {
    const key = `mcp:${deviceId}:${service}`
    await redis.setex(key, this.SESSION_TTL, JSON.stringify(authData))
  }

  static async getMCPAuthSession(deviceId: string, service: string): Promise<MCPAuthData | null> {
    const key = `mcp:${deviceId}:${service}`
    const session = await redis.get(key)
    
    if (session) {
      await redis.expire(key, this.SESSION_TTL)
      return JSON.parse(session as string) as MCPAuthData
    }
    
    return null
  }

  static async deleteMCPAuthSession(deviceId: string, service: string) {
    const key = `mcp:${deviceId}:${service}`
    await redis.del(key)
  }

  // Conversation state management
  static async storeConversationState(conversationId: string, state: ConversationState) {
    const key = `conversation:${conversationId}`
    await redis.setex(key, 60 * 60 * 2, JSON.stringify(state)) // 2 hours TTL
  }

  static async getConversationState(conversationId: string): Promise<ConversationState | null> {
    const key = `conversation:${conversationId}`
    const state = await redis.get(key)
    
    if (state) {
      await redis.expire(key, 60 * 60 * 2)
      return JSON.parse(state as string) as ConversationState
    }
    
    return null
  }

  // Rate limiting
  static async checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number) {
    const key = `ratelimit:${identifier}`
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }
    
    return current <= maxRequests
  }
}