'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDeviceId } from './useDeviceId'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  conversationId?: string
  isStreaming?: boolean
}

export interface ConversationState {
  messages: Message[]
  conversationId: string | null
  isLoading: boolean
  error: string | null
  isStreaming: boolean
}

interface UseConversationOptions {
  enableStreaming?: boolean
  maxMessages?: number
  onError?: (error: string) => void
  onResponse?: (message: Message) => void
}

export function useConversation(options: UseConversationOptions = {}) {
  // Temporarily use a static device ID to avoid initialization issues
  const deviceId = 'test-device-123'
  const {
    enableStreaming = false,
    maxMessages = 100,
    onError,
    onResponse
  } = options

  const [state, setState] = useState<ConversationState>({
    messages: [],
    conversationId: null,
    isLoading: false,
    error: null,
    isStreaming: false
  })

  // Load conversation history on mount - temporarily disabled
  // useEffect(() => {
  //   if (deviceId) {
  //     loadConversationHistory()
  //   }
  // }, [deviceId, loadConversationHistory])

  const loadConversationHistory = useCallback(async () => {
    if (!deviceId) return

    try {
      const response = await fetch(`/api/conversations?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.messages?.length > 0) {
          setState(prev => ({
            ...prev,
            messages: data.messages.map((msg: {
              id: string;
              role: string;
              content: string;
              timestamp: string;
            }) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })),
            conversationId: data.conversationId
          }))
        }
      }
    } catch (error) {
      console.warn('Failed to load conversation history:', error)
    }
  }, [deviceId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !deviceId || state.isLoading || state.isStreaming) {
      return
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      conversationId: state.conversationId || undefined
    }

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage].slice(-maxMessages),
      isLoading: !enableStreaming,
      isStreaming: enableStreaming,
      error: null
    }))

    try {
      if (enableStreaming) {
        await handleStreamingResponse(content)
      } else {
        await handleRegularResponse(content)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMessage
      }))
      onError?.(errorMessage)
    }
  }, [deviceId, state.conversationId, state.isLoading, state.isStreaming, enableStreaming, maxMessages, onError])

  const handleRegularResponse = async (content: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: content,
        conversationId: state.conversationId,
        deviceId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get response')
    }

    const data = await response.json()
    
    const assistantMessage: Message = {
      id: data.messageId || `assistant_${Date.now()}`,
      role: 'assistant',
      content: data.response,
      timestamp: new Date(),
      conversationId: data.conversationId
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage].slice(-maxMessages),
      conversationId: data.conversationId,
      isLoading: false,
      error: null
    }))

    onResponse?.(assistantMessage)
  }

  const handleStreamingResponse = async (content: string) => {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: content,
        conversationId: state.conversationId,
        deviceId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to start streaming')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response stream available')
    }

    // Create placeholder assistant message for streaming
    const assistantMessageId = `assistant_${Date.now()}`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage].slice(-maxMessages),
      isStreaming: true
    }))

    try {
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              setState(prev => ({
                ...prev,
                isStreaming: false,
                messages: prev.messages.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              }))
              return
            }

            try {
              const parsed = JSON.parse(data)
              
              setState(prev => ({
                ...prev,
                conversationId: parsed.conversation_id || prev.conversationId,
                messages: prev.messages.map(msg =>
                  msg.id === assistantMessageId
                    ? { 
                        ...msg, 
                        content: msg.content + (parsed.delta || ''),
                        conversationId: parsed.conversation_id 
                      }
                    : msg
                )
              }))
            } catch {
              console.warn('Failed to parse streaming data:', data)
            }
          }
        }
      }
    } finally {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        messages: prev.messages.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      }))

      // Trigger onResponse for the completed message
      const completedMessage = state.messages.find(msg => msg.id === assistantMessageId)
      if (completedMessage) {
        onResponse?.(completedMessage)
      }
    }
  }

  const clearConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      isLoading: false,
      error: null,
      isStreaming: false
    })
  }, [])

  const retryLastMessage = useCallback(() => {
    if (state.messages.length >= 2) {
      const lastUserMessage = [...state.messages].reverse().find(msg => msg.role === 'user')
      if (lastUserMessage) {
        // Remove the last assistant message and retry
        setState(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => 
            !(msg.role === 'assistant' && msg.timestamp > lastUserMessage.timestamp)
          ),
          error: null
        }))
        sendMessage(lastUserMessage.content)
      }
    }
  }, [state.messages, sendMessage])

  return {
    ...state,
    sendMessage,
    clearConversation,
    retryLastMessage,
    canSend: !state.isLoading && !state.isStreaming && !!deviceId
  }
}