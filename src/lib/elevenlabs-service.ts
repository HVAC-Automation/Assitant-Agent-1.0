import { AgentManager, ElevenLabsAgentInfo, AgentConfiguration } from './agent-management'

export interface ElevenLabsAPIResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface ElevenLabsAgent {
  agent_id: string
  name: string
  voice_id: string
  description?: string
  prompt?: string
  first_message?: string
  language?: string
  conversation_config?: {
    max_turns?: number
    timeout_seconds?: number
    interruptible?: boolean
  }
  voice_config?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
    model_id?: string
  }
  created_at?: string
  updated_at?: string
}

export interface ElevenLabsConversationConfig {
  agent_id: string
  require_user_input: boolean
  conversation_config_override?: {
    max_turns?: number
    timeout_seconds?: number
    interruptible?: boolean
  }
}

export class ElevenLabsService {
  private static readonly API_BASE_URL = 'https://api.elevenlabs.io/v1'
  private static readonly API_KEY = process.env.ELEVEN_AI_API_KEY

  /**
   * Get all available agents from ElevenLabs
   */
  static async discoverAgents(): Promise<ElevenLabsAgent[]> {
    if (!this.API_KEY) {
      throw new Error('ElevenLabs API key not configured')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/convai/agents`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.agents || data || []
    } catch (error: any) {
      console.error('Error discovering ElevenLabs agents:', error)
      throw new Error(`Failed to discover agents: ${error.message}`)
    }
  }

  /**
   * Get specific agent details from ElevenLabs
   */
  static async getAgent(agentId: string): Promise<ElevenLabsAgent> {
    if (!this.API_KEY) {
      throw new Error('ElevenLabs API key not configured')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/convai/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Agent not found')
        }
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error getting ElevenLabs agent:', error)
      throw new Error(`Failed to get agent: ${error.message}`)
    }
  }

  /**
   * Test agent connectivity and health
   */
  static async testAgent(agentId: string): Promise<boolean> {
    try {
      await this.getAgent(agentId)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Sync a single ElevenLabs agent to our database
   */
  static async syncAgent(elevenLabsAgent: ElevenLabsAgent, createdBy?: string): Promise<void> {
    try {
      // Check if agent already exists in our database
      const existingAgent = await AgentManager.getAgentByElevenLabsId(elevenLabsAgent.agent_id)

      const configuration: AgentConfiguration = {
        name: elevenLabsAgent.name,
        prompt: elevenLabsAgent.prompt,
        firstMessage: elevenLabsAgent.first_message,
        language: elevenLabsAgent.language || 'en',
        voiceSettings: elevenLabsAgent.voice_config,
        conversationSettings: elevenLabsAgent.conversation_config,
        capabilities: ['voice', 'text'], // Default capabilities
      }

      if (existingAgent) {
        // Update existing agent
        await AgentManager.updateAgent(existingAgent.id, {
          name: elevenLabsAgent.name,
          description: elevenLabsAgent.description,
          voiceSettings: elevenLabsAgent.voice_config || null,
          configuration,
        })
        console.log(`Updated agent: ${elevenLabsAgent.name}`)
      } else {
        // Create new agent
        await AgentManager.createAgent({
          elevenLabsAgentId: elevenLabsAgent.agent_id,
          name: elevenLabsAgent.name,
          description: elevenLabsAgent.description,
          voiceSettings: elevenLabsAgent.voice_config || null,
          configuration,
          createdBy,
        })
        console.log(`Created agent: ${elevenLabsAgent.name}`)
      }
    } catch (error: any) {
      console.error(`Error syncing agent ${elevenLabsAgent.name}:`, error)
      throw error
    }
  }

  /**
   * Sync all agents from ElevenLabs to our database
   */
  static async syncAllAgents(createdBy?: string): Promise<{
    synced: number
    errors: Array<{ agentId: string; error: string }>
  }> {
    try {
      const elevenLabsAgents = await this.discoverAgents()
      const results = {
        synced: 0,
        errors: [] as Array<{ agentId: string; error: string }>
      }

      for (const agent of elevenLabsAgents) {
        try {
          await this.syncAgent(agent, createdBy)
          results.synced++
        } catch (error: any) {
          results.errors.push({
            agentId: agent.agent_id,
            error: error.message
          })
        }
      }

      return results
    } catch (error: any) {
      console.error('Error syncing all agents:', error)
      throw new Error(`Failed to sync agents: ${error.message}`)
    }
  }

  /**
   * Get agent health status
   */
  static async getAgentHealth(agentId: string): Promise<{
    isHealthy: boolean
    lastChecked: Date
    responseTime?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      await this.getAgent(agentId)
      const responseTime = Date.now() - startTime
      
      return {
        isHealthy: true,
        lastChecked: new Date(),
        responseTime
      }
    } catch (error: any) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        error: error.message
      }
    }
  }

  /**
   * Convert ElevenLabs agent to our AgentInfo format
   */
  static convertToAgentInfo(elevenLabsAgent: ElevenLabsAgent): ElevenLabsAgentInfo {
    return {
      agent_id: elevenLabsAgent.agent_id,
      name: elevenLabsAgent.name,
      voice_id: elevenLabsAgent.voice_id,
      description: elevenLabsAgent.description,
      prompt: elevenLabsAgent.prompt,
      first_message: elevenLabsAgent.first_message,
      language: elevenLabsAgent.language,
      conversation_config: elevenLabsAgent.conversation_config,
      voice_config: elevenLabsAgent.voice_config,
    }
  }

  /**
   * Create websocket URL for agent conversation
   */
  static async createConversationWebSocketUrl(
    agentId: string, 
    userId?: string
  ): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('ElevenLabs API key not configured')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/convai/conversations`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          require_user_input: false,
          conversation_config_override: {
            interruptible: true,
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.conversation_id
    } catch (error: any) {
      console.error('Error creating conversation:', error)
      throw new Error(`Failed to create conversation: ${error.message}`)
    }
  }

  /**
   * Validate API key and connectivity
   */
  static async validateConnection(): Promise<boolean> {
    if (!this.API_KEY) {
      return false
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.API_KEY,
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get usage statistics from ElevenLabs (if available)
   */
  static async getUsageStats(): Promise<{
    characterCount?: number
    characterLimit?: number
    resetDate?: string
  }> {
    if (!this.API_KEY) {
      throw new Error('ElevenLabs API key not configured')
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/user`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      }

      const userData = await response.json()
      return {
        characterCount: userData.subscription?.character_count || 0,
        characterLimit: userData.subscription?.character_limit || 0,
        resetDate: userData.subscription?.next_character_count_reset_unix 
          ? new Date(userData.subscription.next_character_count_reset_unix * 1000).toISOString()
          : undefined
      }
    } catch (error: any) {
      console.error('Error getting usage stats:', error)
      return {}
    }
  }
}