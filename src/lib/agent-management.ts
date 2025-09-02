import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

export interface ElevenLabsVoiceSettings {
  stability?: number
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
  voice_id?: string
  model_id?: string
}

export interface AgentConfiguration {
  name: string
  prompt?: string
  firstMessage?: string
  language?: string
  voiceSettings?: ElevenLabsVoiceSettings
  conversationSettings?: {
    maxTurns?: number
    timeoutSeconds?: number
    interruptible?: boolean
  }
  mcpServers?: string[]
  capabilities?: string[]
}

export interface AgentProfile {
  id: string
  elevenLabsAgentId: string
  name: string
  description: string | null
  voiceSettings: ElevenLabsVoiceSettings | null
  configuration: AgentConfiguration
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface UserAgentAssignment {
  id: string
  userId: string
  agentId: string
  isDefault: boolean
  createdAt: string
}

export interface AgentUsage {
  id: string
  userId: string
  agentId: string
  conversationId: string | null
  messageCount: number
  voiceTimeSeconds: number
  createdAt: string
}

export interface CreateAgentData {
  elevenLabsAgentId: string
  name: string
  description?: string
  voiceSettings?: ElevenLabsVoiceSettings
  configuration: AgentConfiguration
  createdBy?: string
}

export interface UpdateAgentData {
  name?: string
  description?: string
  voiceSettings?: ElevenLabsVoiceSettings
  configuration?: AgentConfiguration
  isActive?: boolean
}

export interface ElevenLabsAgentInfo {
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
  voice_config?: ElevenLabsVoiceSettings
}

export class AgentManager {
  /**
   * Create a new agent in the database
   */
  static async createAgent(agentData: CreateAgentData): Promise<AgentProfile> {
    const {
      elevenLabsAgentId,
      name,
      description,
      voiceSettings,
      configuration,
      createdBy
    } = agentData

    // Validate required fields
    if (!elevenLabsAgentId || !name) {
      throw new Error('Agent ID and name are required')
    }

    // Check if agent already exists
    const { data: existingAgent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('elevenlabs_agent_id', elevenLabsAgentId)
      .single()

    if (existingAgent) {
      throw new Error('Agent with this ElevenLabs ID already exists')
    }

    // Create agent
    const { data: newAgent, error } = await supabaseAdmin
      .from('agents')
      .insert({
        elevenlabs_agent_id: elevenLabsAgentId,
        name,
        description: description || null,
        voice_settings: voiceSettings || null,
        configuration,
        is_active: true,
        created_by: createdBy || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating agent:', error)
      throw new Error('Failed to create agent')
    }

    return {
      id: newAgent.id,
      elevenLabsAgentId: newAgent.elevenlabs_agent_id,
      name: newAgent.name,
      description: newAgent.description,
      voiceSettings: newAgent.voice_settings,
      configuration: newAgent.configuration,
      isActive: newAgent.is_active,
      createdBy: newAgent.created_by,
      createdAt: newAgent.created_at,
      updatedAt: newAgent.updated_at,
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(agentId: string): Promise<AgentProfile | null> {
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return null
    }

    return {
      id: agent.id,
      elevenLabsAgentId: agent.elevenlabs_agent_id,
      name: agent.name,
      description: agent.description,
      voiceSettings: agent.voice_settings,
      configuration: agent.configuration,
      isActive: agent.is_active,
      createdBy: agent.created_by,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }
  }

  /**
   * Get agent by ElevenLabs agent ID
   */
  static async getAgentByElevenLabsId(elevenLabsAgentId: string): Promise<AgentProfile | null> {
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('elevenlabs_agent_id', elevenLabsAgentId)
      .single()

    if (error || !agent) {
      return null
    }

    return {
      id: agent.id,
      elevenLabsAgentId: agent.elevenlabs_agent_id,
      name: agent.name,
      description: agent.description,
      voiceSettings: agent.voice_settings,
      configuration: agent.configuration,
      isActive: agent.is_active,
      createdBy: agent.created_by,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }
  }

  /**
   * Update agent
   */
  static async updateAgent(agentId: string, updates: UpdateAgentData): Promise<AgentProfile> {
    const updateData: any = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.voiceSettings !== undefined) updateData.voice_settings = updates.voiceSettings
    if (updates.configuration !== undefined) updateData.configuration = updates.configuration
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive

    const { data: updatedAgent, error } = await supabaseAdmin
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating agent:', error)
      throw new Error('Failed to update agent')
    }

    return {
      id: updatedAgent.id,
      elevenLabsAgentId: updatedAgent.elevenlabs_agent_id,
      name: updatedAgent.name,
      description: updatedAgent.description,
      voiceSettings: updatedAgent.voice_settings,
      configuration: updatedAgent.configuration,
      isActive: updatedAgent.is_active,
      createdBy: updatedAgent.created_by,
      createdAt: updatedAgent.created_at,
      updatedAt: updatedAgent.updated_at,
    }
  }

  /**
   * Delete agent
   */
  static async deleteAgent(agentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId)

    if (error) {
      console.error('Error deleting agent:', error)
      throw new Error('Failed to delete agent')
    }
  }

  /**
   * List all agents with pagination and filtering
   */
  static async listAgents(
    page: number = 1, 
    limit: number = 50,
    filters?: {
      search?: string
      isActive?: boolean
      createdBy?: string
    }
  ): Promise<{
    agents: AgentProfile[]
    total: number
    page: number
    totalPages: number
  }> {
    const offset = (page - 1) * limit

    // Build query for both count and data retrieval
    let countQuery = supabaseAdmin.from('agents').select('*', { count: 'exact', head: true })
    let dataQuery = supabaseAdmin
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters) {
      // Search by name or description
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`
        countQuery = countQuery.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        dataQuery = dataQuery.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        countQuery = countQuery.eq('is_active', filters.isActive)
        dataQuery = dataQuery.eq('is_active', filters.isActive)
      }

      // Filter by creator
      if (filters.createdBy) {
        countQuery = countQuery.eq('created_by', filters.createdBy)
        dataQuery = dataQuery.eq('created_by', filters.createdBy)
      }
    }

    // Apply pagination to data query
    dataQuery = dataQuery.range(offset, offset + limit - 1)

    // Execute queries
    const { count } = await countQuery
    const { data: agents, error } = await dataQuery

    if (error) {
      console.error('Error listing agents:', error)
      throw new Error('Failed to retrieve agents')
    }

    const agentProfiles: AgentProfile[] = agents.map(agent => ({
      id: agent.id,
      elevenLabsAgentId: agent.elevenlabs_agent_id,
      name: agent.name,
      description: agent.description,
      voiceSettings: agent.voice_settings,
      configuration: agent.configuration,
      isActive: agent.is_active,
      createdBy: agent.created_by,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }))

    return {
      agents: agentProfiles,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  /**
   * Assign agent to user
   */
  static async assignAgentToUser(userId: string, agentId: string, isDefault: boolean = false): Promise<UserAgentAssignment> {
    // If this is set as default, unset any existing defaults for this user
    if (isDefault) {
      await supabaseAdmin
        .from('user_agents')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const { data: assignment, error } = await supabaseAdmin
      .from('user_agents')
      .insert({
        user_id: userId,
        agent_id: agentId,
        is_default: isDefault,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error assigning agent to user:', error)
      throw new Error('Failed to assign agent to user')
    }

    return {
      id: assignment.id,
      userId: assignment.user_id,
      agentId: assignment.agent_id,
      isDefault: assignment.is_default,
      createdAt: assignment.created_at,
    }
  }

  /**
   * Remove agent assignment from user
   */
  static async removeAgentFromUser(userId: string, agentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_agents')
      .delete()
      .eq('user_id', userId)
      .eq('agent_id', agentId)

    if (error) {
      console.error('Error removing agent from user:', error)
      throw new Error('Failed to remove agent from user')
    }
  }

  /**
   * Get agents assigned to a user
   */
  static async getUserAgents(userId: string): Promise<(AgentProfile & { isDefault: boolean })[]> {
    const { data: assignments, error } = await supabaseAdmin
      .from('user_agents')
      .select(`
        is_default,
        agents (*)
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error getting user agents:', error)
      throw new Error('Failed to retrieve user agents')
    }

    return assignments.map(assignment => ({
      id: assignment.agents.id,
      elevenLabsAgentId: assignment.agents.elevenlabs_agent_id,
      name: assignment.agents.name,
      description: assignment.agents.description,
      voiceSettings: assignment.agents.voice_settings,
      configuration: assignment.agents.configuration,
      isActive: assignment.agents.is_active,
      createdBy: assignment.agents.created_by,
      createdAt: assignment.agents.created_at,
      updatedAt: assignment.agents.updated_at,
      isDefault: assignment.is_default,
    }))
  }

  /**
   * Record agent usage
   */
  static async recordAgentUsage(
    userId: string,
    agentId: string,
    conversationId: string | null,
    messageCount: number = 0,
    voiceTimeSeconds: number = 0
  ): Promise<AgentUsage> {
    const { data: usage, error } = await supabaseAdmin
      .from('agent_usage')
      .insert({
        user_id: userId,
        agent_id: agentId,
        conversation_id: conversationId,
        message_count: messageCount,
        voice_time_seconds: voiceTimeSeconds,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error recording agent usage:', error)
      throw new Error('Failed to record agent usage')
    }

    return {
      id: usage.id,
      userId: usage.user_id,
      agentId: usage.agent_id,
      conversationId: usage.conversation_id,
      messageCount: usage.message_count,
      voiceTimeSeconds: usage.voice_time_seconds,
      createdAt: usage.created_at,
    }
  }

  /**
   * Get agent usage analytics
   */
  static async getAgentUsageAnalytics(
    agentId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMessages: number
    totalVoiceTime: number
    totalConversations: number
    uniqueUsers: number
  }> {
    let query = supabaseAdmin
      .from('agent_usage')
      .select('message_count, voice_time_seconds, conversation_id, user_id')

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data: usage, error } = await query

    if (error) {
      console.error('Error getting agent usage analytics:', error)
      throw new Error('Failed to retrieve usage analytics')
    }

    const uniqueConversations = new Set(usage.map(u => u.conversation_id).filter(Boolean))
    const uniqueUsers = new Set(usage.map(u => u.user_id))

    return {
      totalMessages: usage.reduce((sum, u) => sum + u.message_count, 0),
      totalVoiceTime: usage.reduce((sum, u) => sum + u.voice_time_seconds, 0),
      totalConversations: uniqueConversations.size,
      uniqueUsers: uniqueUsers.size,
    }
  }
}