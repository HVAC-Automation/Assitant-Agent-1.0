import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AgentManager } from '@/lib/agent-management'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined
    const isActive = searchParams.get('isActive') 
      ? searchParams.get('isActive') === 'true'
      : undefined
    const createdBy = searchParams.get('createdBy') || undefined

    const result = await AgentManager.listAgents(page, limit, {
      search,
      isActive,
      createdBy
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error listing agents:', error)
    return NextResponse.json(
      { error: 'Failed to list agents', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      elevenLabsAgentId,
      name,
      description,
      voiceSettings,
      configuration
    } = body

    if (!elevenLabsAgentId || !name || !configuration) {
      return NextResponse.json(
        { error: 'Missing required fields: elevenLabsAgentId, name, and configuration' },
        { status: 400 }
      )
    }

    const agent = await AgentManager.createAgent({
      elevenLabsAgentId,
      name,
      description,
      voiceSettings,
      configuration,
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Agent created successfully',
      agent
    })
  } catch (error: any) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent', details: error.message },
      { status: 500 }
    )
  }
}