'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react'
import { useElevenLabs, type ChatMessage } from '@/hooks/useElevenLabs'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'

interface ElevenLabsChatProps {
  apiKey: string
  agentId: string
  enableVoice?: boolean
  onError?: (error: string) => void
}

export function ElevenLabsChat({ 
  apiKey, 
  agentId, 
  enableVoice = true,
  onError 
}: ElevenLabsChatProps) {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isConnected,
    isLoading,
    error: wsError,
    connect,
    disconnect,
    sendMessage,
    clearMessages
  } = useElevenLabs({
    apiKey,
    agentId,
    onError
  })

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error: speechError
  } = useSpeechRecognition()

  const {
    isSpeaking,
    speak,
    cancel: stopSpeaking,
    isSupported: ttsSupported
  } = useTextToSpeech()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-connect when component mounts
  useEffect(() => {
    if (apiKey && agentId) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [apiKey, agentId, connect, disconnect])

  // Handle speech recognition transcript
  useEffect(() => {
    if (transcript && !isListening) {
      setInputText(transcript)
      resetTranscript()
    }
  }, [transcript, isListening, resetTranscript])

  // Auto-speak assistant responses if voice is enabled
  useEffect(() => {
    if (enableVoice && ttsSupported && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.content && !isLoading) {
        speak(lastMessage.content)
      }
    }
  }, [messages, isLoading, enableVoice, ttsSupported, speak])

  const handleSendMessage = () => {
    const text = inputText.trim()
    if (!text || !isConnected || isLoading) return

    sendMessage(text)
    setInputText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
      setInputText('') // Clear input when starting voice
    }
  }

  const currentError = wsError || speechError

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">ElevenLabs AI Agent</h3>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {enableVoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => isSpeaking ? stopSpeaking() : undefined}
                disabled={!isSpeaking}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="outline" 
              size="sm"
              onClick={clearMessages}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm" 
              onClick={isConnected ? disconnect : connect}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{currentError}</span>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="h-96 border rounded-lg p-4 mb-4 bg-muted/20">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation with your AI agent!</p>
              {!isConnected && (
                <p className="text-sm mt-2">Click &quot;Connect&quot; to begin</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex space-x-2">
          {enableVoice && (
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVoiceInput}
              disabled={!isConnected}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            disabled={!isConnected || isLoading || isListening}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputText.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {enableVoice && "🎤 Voice input enabled • "}
          Agent ID: {agentId}
        </p>
      </div>
    </Card>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
        message.role === 'user' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground'
      }`}>
        <div className="text-sm">
          {message.content}
        </div>
        <div className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}