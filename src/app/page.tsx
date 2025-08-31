'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { AppLayout } from '@/components/layout/AppLayout'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // TODO: Integrate with 11.ai API in Phase 3
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm your AI assistant! This is a preview response. In the next phase, I'll be connected to your 11.ai agent and MCP servers for full functionality.",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Assistant</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Voice and chat interface to your 11.ai agent with seamless MCP server authentication
          </p>
        </div>

        <ChatInterface 
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />

        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>💡 <strong>Phase 2.1 Complete:</strong> Responsive chat interface ready</p>
          <p className="mt-1">Next: Voice input/output and 11.ai integration</p>
        </div>
      </div>
    </AppLayout>
  )
}
