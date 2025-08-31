'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void
  messages?: Message[]
  isLoading?: boolean
}

export function ChatInterface({ 
  onSendMessage, 
  messages = [], 
  isLoading = false 
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Speech Recognition Hook
  const {
    isSupported: speechRecognitionSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: 'en-US',
    onResult: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setInputValue(transcript.trim())
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error)
    }
  })

  // Text-to-Speech Hook
  const {
    isSupported: textToSpeechSupported,
    isSpeaking,
    voices,
    speak,
    cancel: cancelSpeech
  } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  })

  // Use English voice if available
  useEffect(() => {
    if (voices.length > 0) {
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'))
      // Voice selection will be handled inside the hook
    }
  }, [voices])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Auto-speak assistant messages when enabled
  useEffect(() => {
    if (autoSpeakEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && !isLoading) {
        speak(lastMessage.content)
      }
    }
  }, [messages, autoSpeakEnabled, isLoading, speak])

  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      resetTranscript()
    }
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
    }
  }

  const toggleAutoSpeak = () => {
    if (autoSpeakEnabled && isSpeaking) {
      cancelSpeech()
    }
    setAutoSpeakEnabled(!autoSpeakEnabled)
  }

  return (
    <Card className="flex flex-col h-[600px] md:h-[700px] w-full max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          {!textToSpeechSupported && (
            <div className="text-sm text-muted-foreground hidden md:flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              TTS not supported
            </div>
          )}
          {textToSpeechSupported && (
            <Button
              variant={autoSpeakEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoSpeak}
              className="hidden md:flex"
              title={autoSpeakEnabled ? "Disable auto-speak" : "Enable auto-speak"}
            >
              {isSpeaking ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : autoSpeakEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg mb-2">Welcome to AI Assistant</p>
              <p className="text-sm">Start a conversation by typing a message or using voice input.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } mb-4`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-4'
                      : 'bg-muted text-muted-foreground mr-4'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2 mr-4">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or use voice input..."
              disabled={isLoading}
              className="pr-12"
            />
            {speechRecognitionSupported ? (
              <Button
                variant={isListening ? "default" : "ghost"}
                size="sm"
                onClick={toggleVoiceInput}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                disabled={isLoading}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? (
                  <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 flex items-center justify-center" 
                title="Voice input not supported"
              >
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Voice status indicators */}
        {isListening && (
          <div className="mt-2 text-sm text-muted-foreground flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
            Listening... Speak now or press the mic button to stop
          </div>
        )}
        
        {speechError && (
          <div className="mt-2 text-sm text-red-500 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {speechError}
          </div>
        )}

        {transcript && !inputValue && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="opacity-60">Transcribing:</span> {transcript}
          </div>
        )}

        {!speechRecognitionSupported && !textToSpeechSupported && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Voice features require HTTPS. Try using Chrome, Edge, or Safari for best voice support.
          </div>
        )}
      </div>
    </Card>
  )
}