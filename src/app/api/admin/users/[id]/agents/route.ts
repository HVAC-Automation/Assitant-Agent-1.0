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

    const userId = params.id

    // Verify user exists
    const user = await UserManager.getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get assigned agents
    const userAgents = await AgentManager.getUserAgents(userId)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      agents: userAgents
    })
  } catch (error: any) {
    console.error('Error getting user agents:', error)
    return NextResponse.json(
      { error: 'Failed to get user agents', details: error.message },
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

    const userId = params.id
    const body = await request.json()
    const { agentId, isDefault } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await UserManager.getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify agent exists
    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Assign agent to user
    const assignment = await AgentManager.assignAgentToUser(userId, agentId, isDefault || false)

    return NextResponse.json({
      success: true,
      message: 'Agent assigned to user successfully',
      assignment
    })
  } catch (error: any) {
    console.error('Error assigning agent to user:', error)
    return NextResponse.json(
      { error: 'Failed to assign agent to user', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await UserManager.getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove agent from user
    await AgentManager.removeAgentFromUser(userId, agentId)

    return NextResponse.json({
      success: true,
      message: 'Agent removed from user successfully'
    })
  } catch (error: any) {
    console.error('Error removing agent from user:', error)
    return NextResponse.json(
      { error: 'Failed to remove agent from user', details: error.message },
      { status: 500 }
    )
  }
}