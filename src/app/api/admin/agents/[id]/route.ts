import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AgentManager } from '@/lib/agent-management'

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

    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      agent
    })
  } catch (error: any) {
    console.error('Error getting agent:', error)
    return NextResponse.json(
      { error: 'Failed to get agent', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const updatedAgent = await AgentManager.updateAgent(agentId, body)

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
      agent: updatedAgent
    })
  } catch (error: any) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent', details: error.message },
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

    const agentId = params.id

    const agent = await AgentManager.getAgentById(agentId)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    await AgentManager.deleteAgent(agentId)

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent', details: error.message },
      { status: 500 }
    )
  }
}