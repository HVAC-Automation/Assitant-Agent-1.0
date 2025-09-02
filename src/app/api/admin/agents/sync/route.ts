import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ElevenLabsService } from '@/lib/elevenlabs-service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { agentIds } = body

    if (agentIds && Array.isArray(agentIds)) {
      // Sync specific agents
      let syncCount = 0
      const errors: Array<{ agentId: string; error: string }> = []

      for (const agentId of agentIds) {
        try {
          const elevenLabsAgent = await ElevenLabsService.getAgent(agentId)
          await ElevenLabsService.syncAgent(elevenLabsAgent, session.user.id)
          syncCount++
        } catch (error: any) {
          errors.push({
            agentId,
            error: error.message
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${syncCount} agent(s)`,
        synced: syncCount,
        errors
      })
    } else {
      // Sync all agents
      const results = await ElevenLabsService.syncAllAgents(session.user.id)

      return NextResponse.json({
        success: true,
        message: `Synced ${results.synced} agent(s)`,
        synced: results.synced,
        errors: results.errors
      })
    }
  } catch (error: any) {
    console.error('Agent sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync agents', details: error.message },
      { status: 500 }
    )
  }
}