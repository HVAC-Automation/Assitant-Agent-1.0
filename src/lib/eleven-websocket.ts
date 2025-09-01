'use client'

export interface ElevenLabsMessage {
  type: string
  text?: string
  audio?: string
  [key: string]: unknown
}

export interface ConversationResponse {
  type: 'agent_response' | 'agent_response_audio' | 'user_transcript' | 'conversation_end'
  agent_response?: string
  audio?: string
  user_transcript?: string
  [key: string]: unknown
}

export class ElevenLabsWebSocket {
  private ws: WebSocket | null = null
  private apiKey: string
  private agentId: string
  private conversationId: string | null = null
  private onMessage?: (message: ConversationResponse) => void
  private onError?: (error: string) => void
  private onConnected?: () => void
  private onDisconnected?: () => void

  constructor(apiKey: string, agentId: string) {
    this.apiKey = apiKey
    this.agentId = agentId
  }

  async connect(callbacks: {
    onMessage?: (message: ConversationResponse) => void
    onError?: (error: string) => void
    onConnected?: () => void
    onDisconnected?: () => void
  }) {
    this.onMessage = callbacks.onMessage
    this.onError = callbacks.onError
    this.onConnected = callbacks.onConnected
    this.onDisconnected = callbacks.onDisconnected

    try {
      // Create signed URL for WebSocket connection
      const signedUrl = await this.getSignedUrl()
      
      this.ws = new WebSocket(signedUrl)
      
      this.ws.onopen = () => {
        console.log('ElevenLabs WebSocket connected')
        this.initializeConversation()
        this.onConnected?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ConversationResponse
          console.log('Received message:', message)
          this.onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.onError?.('WebSocket connection error')
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        this.onDisconnected?.()
      }
    } catch (error) {
      console.error('Failed to connect to ElevenLabs:', error)
      this.onError?.(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  private async getSignedUrl(): Promise<string> {
    // Get signed URL from our backend endpoint for secure WebSocket connection
    try {
      const response = await fetch('/api/elevenlabs/websocket-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: this.agentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get WebSocket URL')
      }

      const { url } = await response.json()
      return url
    } catch (error) {
      console.error('Failed to get signed URL, falling back to direct connection:', error)
      // Fallback to direct connection (less secure but works for development)
      const baseUrl = 'wss://api.elevenlabs.io/v1/convai/conversation'
      const params = new URLSearchParams({
        agent_id: this.agentId,
      })
      return `${baseUrl}?${params.toString()}`
    }
  }

  private initializeConversation() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const initMessage: ElevenLabsMessage = {
      type: 'conversation_initiation_client_data',
      conversation_config_override: {
        agent: {
          agent_id: this.agentId,
          // You can override agent settings here if needed
        }
      }
    }

    this.ws.send(JSON.stringify(initMessage))
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError?.('WebSocket is not connected')
      return
    }

    const message: ElevenLabsMessage = {
      type: 'user_message',
      text: text
    }

    console.log('Sending message:', message)
    this.ws.send(JSON.stringify(message))
  }

  sendAudioMessage(audioData: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError?.('WebSocket is not connected')
      return
    }

    const message: ElevenLabsMessage = {
      type: 'user_audio',
      audio: audioData
    }

    this.ws.send(JSON.stringify(message))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.conversationId = null
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}