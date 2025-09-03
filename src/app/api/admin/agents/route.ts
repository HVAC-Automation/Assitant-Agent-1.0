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
    const { name, elevenlabs_agent_id, description } = body

    // Validate required fields
    if (!name || !elevenlabs_agent_id) {
      return NextResponse.json({
        success: false,
        error: 'Name and ElevenLabs Agent ID are required'
      }, { status: 400 })
    }

    // Validate ElevenLabs Agent ID format (should be UUID-like)
    const agentIdRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!agentIdRegex.test(elevenlabs_agent_id)) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid ElevenLabs Agent ID (UUID format)'
      }, { status: 400 })
    }

    const agent = await AgentManager.createAgent({
      name: name.trim(),
      elevenlabs_agent_id: elevenlabs_agent_id.trim(),
      description: description?.trim(),
      created_by: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Agent created successfully',
      agent
    })
  } catch (error: any) {
    console.error('Error creating agent:', error)
    
    // Handle duplicate ElevenLabs Agent ID
    if (error.message && error.message.includes('duplicate')) {
      return NextResponse.json({
        success: false,
        error: 'An agent with this ElevenLabs ID already exists'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create agent'
    }, { status: 500 })
  }
}