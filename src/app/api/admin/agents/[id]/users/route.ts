import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AgentManager } from '@/lib/agent-management'
import { UserManager } from '@/lib/user-management'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = params.id

    // Verify agent exists
    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get all users and their agent assignments
    const usersResult = await UserManager.listUsers(1, 1000)
    const usersWithAssignments = []

    for (const user of usersResult.users) {
      const userAgents = await AgentManager.getUserAgents(user.id)
      const hasAgent = userAgents.some(ua => ua.id === agentId)
      const isDefault = userAgents.find(ua => ua.id === agentId)?.isDefault || false

      usersWithAssignments.push({
        ...user,
        hasAgent,
        isDefault
      })
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        elevenLabsAgentId: agent.elevenLabsAgentId,
      },
      users: usersWithAssignments
    })
  } catch (error: any) {
    console.error('Error getting agent users:', error)
    return NextResponse.json(
      { error: 'Failed to get agent users', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = params.id
    const body = await request.json()
    const { userIds, isDefault } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    let successCount = 0
    const errors: Array<{ userId: string; error: string }> = []

    // Assign agent to each user
    for (const userId of userIds) {
      try {
        // Verify user exists
        const user = await UserManager.getUserById(userId)
        if (!user) {
          errors.push({ userId, error: 'User not found' })
          continue
        }

        await AgentManager.assignAgentToUser(userId, agentId, isDefault || false)
        successCount++
      } catch (error: any) {
        errors.push({ userId, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Agent assigned to ${successCount} user(s)`,
      results: {
        total: userIds.length,
        success: successCount,
        errors: errors.length,
        errorDetails: errors
      }
    })
  } catch (error: any) {
    console.error('Error bulk assigning agent to users:', error)
    return NextResponse.json(
      { error: 'Failed to assign agent to users', details: error.message },
      { status: 500 }
    )
  }
}