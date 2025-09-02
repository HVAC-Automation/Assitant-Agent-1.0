import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ElevenLabsService } from '@/lib/elevenlabs-service'
import { AgentManager } from '@/lib/agent-management'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (agentId) {
      // Check health of specific agent
      const agent = await AgentManager.getAgentById(agentId)
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }

      const health = await ElevenLabsService.getAgentHealth(agent.elevenLabsAgentId)
      
      return NextResponse.json({
        success: true,
        agentId: agent.id,
        elevenLabsAgentId: agent.elevenLabsAgentId,
        name: agent.name,
        health
      })
    } else {
      // Check health of all agents
      const agentsResult = await AgentManager.listAgents(1, 100)
      const healthChecks = []

      for (const agent of agentsResult.agents) {
        const health = await ElevenLabsService.getAgentHealth(agent.elevenLabsAgentId)
        healthChecks.push({
          agentId: agent.id,
          elevenLabsAgentId: agent.elevenLabsAgentId,
          name: agent.name,
          health
        })
      }

      const healthyCount = healthChecks.filter(check => check.health.isHealthy).length
      
      return NextResponse.json({
        success: true,
        summary: {
          total: healthChecks.length,
          healthy: healthyCount,
          unhealthy: healthChecks.length - healthyCount
        },
        agents: healthChecks
      })
    }
  } catch (error: any) {
    console.error('Agent health check error:', error)
    return NextResponse.json(
      { error: 'Failed to check agent health', details: error.message },
      { status: 500 }
    )
  }
}