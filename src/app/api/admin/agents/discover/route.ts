import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ElevenLabsService } from '@/lib/elevenlabs-service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Discover agents from ElevenLabs
    const agents = await ElevenLabsService.discoverAgents()

    return NextResponse.json({
      success: true,
      agents: agents.map(agent => ({
        agentId: agent.agent_id,
        name: agent.name,
        voiceId: agent.voice_id,
        description: agent.description,
        prompt: agent.prompt,
        firstMessage: agent.first_message,
        language: agent.language,
        conversationConfig: agent.conversation_config,
        voiceConfig: agent.voice_config,
      })),
      total: agents.length,
    })
  } catch (error: any) {
    console.error('Agent discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to discover agents', details: error.message },
      { status: 500 }
    )
  }
}