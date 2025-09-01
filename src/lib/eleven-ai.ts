// import { SessionManager } from './redis'

export interface ElevenAIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ElevenAIResponse {
  response: string
  conversation_id: string
  message_id: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ElevenAIStreamResponse {
  delta: string
  conversation_id: string
  message_id: string
  finished: boolean
}

export interface WebSocketMessage {
  type: string
  text?: string
  audio?: string
  [key: string]: unknown
}

export interface ElevenAIConversation {
  id: string
  messages: ElevenAIMessage[]
  created_at: string
  updated_at: string
}

export class ElevenAIService {
  private apiKey: string
  private agentId: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.ELEVEN_AI_API_KEY || ''
    this.agentId = process.env.ELEVEN_AI_AGENT_ID || ''
    this.baseUrl = 'https://api.elevenlabs.io/v1'
    
    // Only throw error at runtime, not during build
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
      if (!this.apiKey) {
        throw new Error('ELEVEN_AI_API_KEY environment variable is required')
      }
      
      if (!this.agentId) {
        throw new Error('ELEVEN_AI_AGENT_ID environment variable is required')
      }
    }
  }

  /**
   * Send a message to the 11.ai agent
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    deviceId?: string
  ): Promise<ElevenAIResponse> {
    try {
      // Rate limiting check - temporarily disabled without Redis
      // if (deviceId) {
      //   const canProceed = await SessionManager.checkRateLimit(
      //     `elevenlabs:${deviceId}`,
      //     10, // 10 requests
      //     60 // per minute
      //   )
      //   
      //   if (!canProceed) {
      //     throw new Error('Rate limit exceeded. Please wait before sending another message.')
      //   }
      // }

      const response = await fetch(`${this.baseUrl}/convai/agents/${this.agentId}/simulate-conversation`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Assistant-Web-App/1.0'
        },
        body: JSON.stringify({
          simulation_specification: {
            simulated_user_config: {
              first_message: message,
              language: 'en'
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`11.ai API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`)
      }

      const data = await response.json()
      
      return {
        response: data.response || data.message || '',
        conversation_id: data.conversation_id || conversationId || this.generateConversationId(),
        message_id: data.message_id || this.generateMessageId(),
        usage: data.usage
      }
    } catch (error) {
      console.error('11.ai API Error:', error)
      throw error instanceof Error ? error : new Error('Failed to send message to 11.ai')
    }
  }

  /**
   * Stream a message response from 11.ai agent
   */
  async streamMessage(
    message: string,
    conversationId?: string,
    deviceId?: string
  ): Promise<ReadableStream<ElevenAIStreamResponse>> {
    try {
      // Rate limiting check - temporarily disabled without Redis
      // if (deviceId) {
      //   const canProceed = await SessionManager.checkRateLimit(
      //     `elevenlabs:stream:${deviceId}`,
      //     5, // 5 stream requests
      //     60 // per minute
      //   )
      //   
      //   if (!canProceed) {
      //     throw new Error('Streaming rate limit exceeded. Please wait before starting another stream.')
      //   }
      // }

      const response = await fetch(`${this.baseUrl}/convai/agents/simulate-conversation-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Assistant-Web-App/1.0'
        },
        body: JSON.stringify({
          agent_id: this.agentId,
          message: message,
          conversation_id: conversationId,
          context: await this.getMCPContext(deviceId)
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`11.ai Streaming API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body available for streaming')
      }

      return new ReadableStream({
        start(controller) {
          const pump = async (): Promise<void> => {
            try {
              const { done, value } = await reader.read()
              
              if (done) {
                controller.close()
                return
              }

              // Parse SSE format
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    controller.close()
                    return
                  }
                  
                  try {
                    const parsed = JSON.parse(data)
                    controller.enqueue({
                      delta: parsed.delta || parsed.response || '',
                      conversation_id: parsed.conversation_id || conversationId || '',
                      message_id: parsed.message_id || '',
                      finished: parsed.finished || false
                    })
                  } catch (parseError) {
                    console.warn('Failed to parse streaming response:', data)
                  }
                }
              }

              return pump()
            } catch (error) {
              controller.error(error)
            }
          }
          
          return pump()
        }
      })
    } catch (error) {
      console.error('11.ai Streaming Error:', error)
      throw error instanceof Error ? error : new Error('Failed to stream message from 11.ai')
    }
  }

  /**
   * Get conversation history from 11.ai
   */
  async getConversation(conversationId: string): Promise<ElevenAIConversation | null> {
    try {
      const response = await fetch(`${this.baseUrl}/convai/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'AI-Assistant-Web-App/1.0'
        }
      })

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
      return null
    }
  }

  /**
   * Get context from MCP servers for enhanced responses
   */
  private async getMCPContext(deviceId?: string): Promise<Record<string, unknown> | undefined> {
    if (!deviceId) return undefined

    try {
      // MCP context temporarily disabled without Redis
      // In the future, this will check authentication status for:
      // - M365 (email, calendar, files, contacts)
      // - Universal Auth Service
      // - Other MCP servers
      
      return {
        authenticated_services: {
          m365: false,
          universal_auth: false
        },
        capabilities: {
          email: false,
          calendar: false,
          files: false,
          contacts: false
        }
      }
    } catch (error) {
      console.warn('Failed to get MCP context:', error)
      return undefined
    }
  }

  /**
   * Generate a unique conversation ID
   */
  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Health check for 11.ai API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'AI-Assistant-Web-App/1.0'
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('11.ai health check failed:', error)
      return false
    }
  }
}