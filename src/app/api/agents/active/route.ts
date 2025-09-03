import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AgentManager } from '@/lib/agent-management'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agents = await AgentManager.getActiveAgents()

    return NextResponse.json({
      success: true,
      agents
    })

  } catch (error) {
    console.error('Get active agents error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get active agents'
    }, { status: 500 })
  }
}