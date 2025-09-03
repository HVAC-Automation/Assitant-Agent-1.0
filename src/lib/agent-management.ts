import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

// Types for agent management
export interface Agent {
  id: string
  elevenlabs_agent_id: string
  name: string
  description?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// Agent management class
export class AgentManager {
  /**
   * Get all agents with optional pagination and filtering
   */
  static async listAgents(
    page: number = 1,
    limit: number = 50,
    filters: {
      search?: string
      isActive?: boolean
      createdBy?: string
    } = {}
  ): Promise<{
    agents: Agent[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    try {
      let query = supabaseServiceRole
        .from('agents')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: agents, error, count } = await query

      if (error) {
        console.error('Error listing agents:', error)
        throw new Error(`Failed to list agents: ${error.message}`)
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        agents: agents || [],
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      console.error('Agent listing error:', error)
      throw error
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(id: string): Promise<Agent | null> {
    try {
      const { data: agent, error } = await supabaseServiceRole
        .from('agents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Agent not found
        }
        console.error('Error getting agent:', error)
        throw new Error(`Failed to get agent: ${error.message}`)
      }

      return agent
    } catch (error) {
      console.error('Get agent error:', error)
      throw error
    }
  }

  /**
   * Create a new agent
   */
  static async createAgent(agentData: {
    elevenlabs_agent_id: string
    name: string
    description?: string
    created_by?: string
  }): Promise<Agent> {
    try {
      const { data: agent, error } = await supabaseServiceRole
        .from('agents')
        .insert([{
          elevenlabs_agent_id: agentData.elevenlabs_agent_id,
          name: agentData.name,
          description: agentData.description,
          is_active: true,
          created_by: agentData.created_by
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating agent:', error)
        throw new Error(`Failed to create agent: ${error.message}`)
      }

      return agent
    } catch (error) {
      console.error('Create agent error:', error)
      throw error
    }
  }

  /**
   * Update an agent
   */
  static async updateAgent(
    id: string, 
    updates: {
      name?: string
      description?: string
      elevenlabs_agent_id?: string
      is_active?: boolean
    }
  ): Promise<Agent> {
    try {
      const { data: agent, error } = await supabaseServiceRole
        .from('agents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating agent:', error)
        throw new Error(`Failed to update agent: ${error.message}`)
      }

      return agent
    } catch (error) {
      console.error('Update agent error:', error)
      throw error
    }
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(id: string): Promise<void> {
    try {
      const { error } = await supabaseServiceRole
        .from('agents')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting agent:', error)
        throw new Error(`Failed to delete agent: ${error.message}`)
      }
    } catch (error) {
      console.error('Delete agent error:', error)
      throw error
    }
  }

  /**
   * Toggle agent active status
   */
  static async toggleAgentStatus(id: string): Promise<Agent> {
    try {
      // First get the current status
      const agent = await this.getAgentById(id)
      if (!agent) {
        throw new Error('Agent not found')
      }

      // Toggle the status
      return await this.updateAgent(id, { is_active: !agent.is_active })
    } catch (error) {
      console.error('Toggle agent status error:', error)
      throw error
    }
  }

  /**
   * Get active agents (for user selection)
   */
  static async getActiveAgents(): Promise<Agent[]> {
    try {
      const { data: agents, error } = await supabaseServiceRole
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error getting active agents:', error)
        throw new Error(`Failed to get active agents: ${error.message}`)
      }

      return agents || []
    } catch (error) {
      console.error('Get active agents error:', error)
      throw error
    }
  }
}