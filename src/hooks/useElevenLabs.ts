'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ElevenLabsWebSocket, type ConversationResponse } from '@/lib/eleven-websocket'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audio?: string
}

export interface UseElevenLabsOptions {
  apiKey: string
  agentId: string
  onError?: (error: string) => void
}

export function useElevenLabs({ apiKey, agentId, onError }: UseElevenLabsOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<ElevenLabsWebSocket | null>(null)
  const currentAssistantMessageRef = useRef<ChatMessage | null>(null)

  const handleWebSocketMessage = useCallback((message: ConversationResponse) => {
    console.log('WebSocket message:', message)

    switch (message.type) {
      case 'agent_response':
        if (message.agent_response) {
          // Create or update assistant message
          const assistantMessage: ChatMessage = {
            id: currentAssistantMessageRef.current?.id || `assistant_${Date.now()}`,
            role: 'assistant',
            content: message.agent_response,
            timestamp: new Date()
          }

          currentAssistantMessageRef.current = assistantMessage

          setMessages(prev => {
            const existingIndex = prev.findIndex(msg => msg.id === assistantMessage.id)
            if (existingIndex >= 0) {
              // Update existing message
              const newMessages = [...prev]
              newMessages[existingIndex] = assistantMessage
              return newMessages
            } else {
              // Add new message
              return [...prev, assistantMessage]
            }
          })
        }
        break

      case 'agent_response_audio':
        if (message.audio && currentAssistantMessageRef.current) {
          // Add audio data to current assistant message
          const updatedMessage = {
            ...currentAssistantMessageRef.current,
            audio: message.audio
          }

          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          )
        }
        break

      case 'user_transcript':
        if (message.user_transcript) {
          // This is when the AI transcribes user's voice input
          console.log('User transcript:', message.user_transcript)
        }
        break

      case 'conversation_end':
        console.log('Conversation ended')
        currentAssistantMessageRef.current = null
        setIsLoading(false)
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }, [])

  const handleWebSocketError = useCallback((errorMsg: string) => {
    console.error('WebSocket error:', errorMsg)
    setError(errorMsg)
    setIsLoading(false)
    onError?.(errorMsg)
  }, [onError])

  const handleWebSocketConnected = useCallback(() => {
    console.log('Connected to ElevenLabs')
    setIsConnected(true)
    setError(null)
  }, [])

  const handleWebSocketDisconnected = useCallback(() => {
    console.log('Disconnected from ElevenLabs')
    setIsConnected(false)
    setIsLoading(false)
  }, [])

  const connect = useCallback(async () => {
    if (!apiKey || !agentId) {
      setError('API key and agent ID are required')
      return
    }

    if (wsRef.current) {
      wsRef.current.disconnect()
    }

    wsRef.current = new ElevenLabsWebSocket(apiKey, agentId)
    
    await wsRef.current.connect({
      onMessage: handleWebSocketMessage,
      onError: handleWebSocketError,
      onConnected: handleWebSocketConnected,
      onDisconnected: handleWebSocketDisconnected
    })
  }, [apiKey, agentId, handleWebSocketMessage, handleWebSocketError, handleWebSocketConnected, handleWebSocketDisconnected])

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || !wsRef.current.isConnected()) {
      setError('Not connected to ElevenLabs')
      return
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)
    currentAssistantMessageRef.current = null

    // Send to ElevenLabs
    wsRef.current.sendTextMessage(text)
  }, [])

  const sendAudioMessage = useCallback((audioData: string) => {
    if (!wsRef.current || !wsRef.current.isConnected()) {
      setError('Not connected to ElevenLabs')
      return
    }

    setIsLoading(true)
    setError(null)
    wsRef.current.sendAudioMessage(audioData)
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsLoading(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    currentAssistantMessageRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    messages,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    sendMessage,
    sendAudioMessage,
    clearMessages
  }
}