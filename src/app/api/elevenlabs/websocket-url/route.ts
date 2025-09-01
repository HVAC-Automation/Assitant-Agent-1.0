import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { agent_id } = await request.json()

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVEN_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    // Try to generate a signed URL for WebSocket connection
    try {
      const signedResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent_id,
        }),
      })

      if (signedResponse.ok) {
        const { signed_url } = await signedResponse.json()
        return NextResponse.json({ 
          url: signed_url,
          fallback: false
        })
      } else {
        console.error('Signed URL failed:', signedResponse.status, signedResponse.statusText)
      }
    } catch (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
    }

    // Fallback: Create direct WebSocket URL with authentication in query params
    // This includes the API key in the WebSocket URL for authentication
    const directUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agent_id}&xi-api-key=${apiKey}`
    console.log('Using fallback direct URL with authentication')
    
    return NextResponse.json({ 
      url: directUrl,
      fallback: true,
      note: 'Using direct WebSocket URL with API key authentication'
    })
  } catch (error) {
    console.error('WebSocket URL generation error:', error)
    
    // Fallback to direct URL construction
    const { agent_id } = await request.json()
    const directUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agent_id}`
    
    return NextResponse.json({ 
      url: directUrl,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}