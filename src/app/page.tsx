'use client'

import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MessageBubbleProps {
  message: ChatMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
        message.role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

// Helper function to create WAV buffer from PCM data
function createWavBuffer(pcmData: Uint8Array, sampleRate: number, channels: number): ArrayBuffer {
  const length = pcmData.length
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length, true)

  // Copy PCM data
  const samples = new Uint8Array(buffer, 44)
  samples.set(pcmData)

  return buffer
}

export default function Home() {
  const [enableVoice, setEnableVoice] = useState(true)
  const [realTimeMode, setRealTimeMode] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioQueue, setAudioQueue] = useState<string[]>([])
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [transcript, setTranscript] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  
  // Refs for interruption detection (to avoid stale closure values)
  const isPlayingAudioRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechActivityRef = useRef<number>(0)

  const apiKey = process.env.NEXT_PUBLIC_ELEVEN_AI_API_KEY || 'sk_a1a42febc7c6cd04b02d24012ffa1bf3e3e9707fe29ab954'
  const agentId = process.env.NEXT_PUBLIC_ELEVEN_AI_AGENT_ID || 'agent_9901k3wpqp85f80rhmz3t3y1tv5p'

  const handleError = (error: string) => {
    console.error('ElevenLabs Error:', error)
    setError(error)
  }

  const initializeAudioContext = () => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        // @ts-expect-error - webkitAudioContext is a legacy API but still needed for some browsers
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        gainNodeRef.current = audioContextRef.current.createGain()
        gainNodeRef.current.connect(audioContextRef.current.destination)
        console.log('Web Audio API initialized successfully')
      } catch (error) {
        console.error('Failed to initialize Web Audio API:', error)
      }
    }
  }

  const handleSpeechComplete = (finalText: string) => {
    console.log('=== handleSpeechComplete called ===')
    console.log('Final text to send:', finalText)
    
    if (!finalText.trim() || !realTimeMode || wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('Not sending - conditions not met')
      return
    }

    console.log('Auto-sending message after speech completion:', finalText.trim())
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: finalText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const message = {
      type: 'user_message',
      text: finalText.trim()
    }

    console.log('Sending message to ElevenLabs:', message)
    wsRef.current.send(JSON.stringify(message))
    console.log('Message sent successfully')
    
    // Clear the transcript after sending
    setTranscript('')
    setInputText('')
  }

  const connectToElevenLabs = async () => {
    if (isConnecting || isConnected) return

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('Closing existing connection before reconnecting')
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Get WebSocket URL from backend
      const response = await fetch('/api/elevenlabs/websocket-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get WebSocket URL')
      }

      const { url } = await response.json()
      console.log('Connecting to WebSocket:', url)

      // Create WebSocket connection
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        console.log('Connected to ElevenLabs')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)

        // Start voice recognition IMMEDIATELY before any conversation initialization
        // This prevents the first speech from being cut off
        if (realTimeMode && enableVoice) {
          console.log('Starting voice recognition IMMEDIATELY on connection (before agent speaks)')
          // No delay - start immediately to capture first speech
          startVoiceRecognition()
        }

        // Initialize conversation
        if (wsRef.current) {
          const initMessage = {
            type: 'conversation_initiation_client_data',
            conversation_config_override: {
              agent: {
                agent_id: agentId,
              }
            }
          }
          wsRef.current.send(JSON.stringify(initMessage))
        }
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('Received WebSocket message:', message)
          console.log('Message type:', message.type)
          console.log('Message keys:', Object.keys(message))

          // Handle different message types from ElevenLabs
          switch (message.type) {
            case 'agent_response':
              // Handle agent text responses (direct structure from API)
              console.log('Agent response received:', message)
              if (message.agent_response) {
                const assistantMessage: ChatMessage = {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant',
                  content: message.agent_response,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsLoading(false)
                console.log('Added agent response to messages:', message.agent_response)
              } else if (message.agent_response_event?.agent_response) {
                // Fallback for nested structure
                const assistantMessage: ChatMessage = {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant',
                  content: message.agent_response_event.agent_response,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
                setIsLoading(false)
                console.log('Added nested agent response to messages:', message.agent_response_event.agent_response)
              }
              break

            case 'agent_response_correction':
              // Handle response corrections
              console.log('Agent response correction:', message)
              break

            case 'user_transcript':
              // Handle user voice transcript
              if (message.user_transcript) {
                console.log('User transcript:', message.user_transcript)
              }
              break

            case 'conversation_initiation_metadata':
              // Conversation started successfully
              console.log('Conversation initialized:', message)
              break

            case 'internal_user_message':
              // Internal message processing
              console.log('Internal user message:', message)
              break

            case 'audio':
              // Handle audio messages from ElevenLabs (agent voice)
              console.log('Audio message received:', message)
              console.log('Checking for audio data in message...')
              
              let audioData = null
              if (message.audio_base_64) {
                audioData = message.audio_base_64
                console.log('Found audio_base_64 at root level')
              } else if (message.audio_event?.audio_base_64) {
                audioData = message.audio_event.audio_base_64
                console.log('Found audio_base_64 in audio_event')
              }
              
              if (enableVoice && audioData) {
                console.log('Queueing ElevenLabs audio, data length:', audioData.length)
                setAudioQueue(prev => [...prev, audioData])
              } else {
                console.log('Not playing audio:', { 
                  enableVoice, 
                  hasDirectAudio: !!message.audio_base_64,
                  hasEventAudio: !!message.audio_event?.audio_base_64,
                  messageKeys: Object.keys(message),
                  audioEventKeys: message.audio_event ? Object.keys(message.audio_event) : []
                })
              }
              break

            case 'ping':
              // Handle ping messages (keep-alive)
              console.log('Ping received')
              break

            case 'mcp_connection_status':
              // Handle MCP connection status updates
              console.log('MCP connection status:', message.mcp_connection_status)
              break

            default:
              console.log('Unknown message type:', message.type, message)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          console.error('Raw message data:', event.data)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        handleError('WebSocket connection error')
        setIsConnecting(false)
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        
        // Only auto-reconnect for unexpected disconnections, not normal ones
        if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) { 
          console.log('Attempting to reconnect in 3 seconds... (code:', event.code, ')')
          setTimeout(() => {
            if (!isConnected && !isConnecting && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
              console.log('Auto-reconnecting...')
              connectToElevenLabs()
            }
          }, 3000)
        } else {
          console.log('Normal WebSocket closure, not reconnecting (code:', event.code, ')')
        }
      }

    } catch (error) {
      console.error('Connection failed:', error)
      handleError(error instanceof Error ? error.message : 'Connection failed')
      setIsConnecting(false)
    }
  }

  const disconnectFromElevenLabs = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }

  const sendMessage = () => {
    if (!wsRef.current || !isConnected || !inputText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Send to ElevenLabs
    const message = {
      type: 'user_message',
      text: inputText.trim()
    }

    wsRef.current.send(JSON.stringify(message))
    setInputText('')
  }

  const sendVoiceMessage = (text: string) => {
    console.log('=== sendVoiceMessage called ===')
    console.log('Text parameter:', text)
    console.log('Current state:', { isConnected, isLoading, hasText: !!text.trim() })
    console.log('WebSocket state:', wsRef.current?.readyState)
    
    if (!wsRef.current) {
      console.log('BLOCKED: No WebSocket connection')
      return
    }
    if (!isConnected) {
      console.log('BLOCKED: Not connected')
      return
    }
    if (!text.trim()) {
      console.log('BLOCKED: No text to send')
      return
    }
    if (isLoading) {
      console.log('BLOCKED: Already loading')
      return
    }
    
    console.log('All checks passed, proceeding to send message...')

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Send to ElevenLabs
    const message = {
      type: 'user_message',
      text: text.trim()
    }

    console.log('Sending message to ElevenLabs:', message)
    wsRef.current.send(JSON.stringify(message))
    console.log('Message sent successfully to WebSocket')
    console.log('=== sendVoiceMessage complete ===')
    console.log('')
    setInputText('')

    // In real-time mode, automatically start listening for the next input after response
    // This will be triggered after the AI responds
  }

  // Initialize client-side flag and speech recognition, synthesis, and Web Audio API
  useEffect(() => {
    setIsClient(true)
    
    if (typeof window !== 'undefined') {
      // Initialize Web Audio API for smooth audio playback
      initializeAudioContext()
      
      // Initialize speech synthesis
      synthRef.current = window.speechSynthesis

      // Initialize speech recognition
      // @ts-expect-error - SpeechRecognition APIs may not be available in all browsers
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'
          recognition.maxAlternatives = 1
          recognitionRef.current = recognition

          console.log('Initializing speech recognition with enhanced settings')

          recognition.onstart = () => {
            console.log('Speech recognition started successfully')
            setIsListening(true)
            setError(null)
            
            // If AI is currently speaking, this means we're enabling interruption detection
            if (isPlayingAudioRef.current || isSpeakingRef.current) {
              console.log('🎤 Voice recognition active during AI speech - ready for interruption')
            }
          }

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('Speech recognition onresult fired, results:', event.results.length)
            
            // Simple AI voice filtering - ignore very low confidence during AI speech
            let shouldIgnore = false
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i]
              const confidence = result[0].confidence
              
              // Simple filter: if confidence is very low while AI is speaking, ignore it
              if ((isPlayingAudioRef.current || isSpeakingRef.current) && confidence < 0.3) {
                shouldIgnore = true
                logger.voiceError('🚫 Low confidence during AI speech, ignoring', {
                  transcript: result[0].transcript,
                  confidence,
                  isPlayingAudio: isPlayingAudioRef.current,
                  isSpeaking: isSpeakingRef.current
                })
                break
              }
            }
            
            if (shouldIgnore) {
              return
            }
            
            // Conservative interruption detection: require very high confidence and multiple criteria
            // Only allow interruption if we're very confident it's actual user speech, not AI feedback
            const hasVeryHighConfidenceUserSpeech = event.results.length > 0 && 
                                                   Array.from(event.results).some(result => {
                                                     const transcript = result[0].transcript.trim()
                                                     const confidence = result[0].confidence
                                                     
                                                     // Require very high confidence (0.85+) and reasonable length (5+ chars)
                                                     // This should filter out most AI voice feedback
                                                     return confidence >= 0.85 && transcript.length >= 5 && result.isFinal
                                                   })
            
            if ((isPlayingAudioRef.current || isSpeakingRef.current) && hasVeryHighConfidenceUserSpeech) {
              logger.voiceStart('🛑 User interruption detected', {
                confidence: event.results[0]?.confidence,
                transcript: event.results[0]?.transcript
              })
              
              // Stop current audio
              if (currentSourceRef.current) {
                try {
                  currentSourceRef.current.stop()
                  currentSourceRef.current.disconnect()
                } catch (e) {
                  console.log('Audio source already stopped')
                }
                currentSourceRef.current = null
              }
              
              // Clear audio queue and reset states
              setAudioQueue([])
              setIsPlayingAudio(false)
              isPlayingAudioRef.current = false
              setIsSpeaking(false)
              isSpeakingRef.current = false
              
              // Send interruption signal
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({
                    type: 'user_interruption'
                  }))
                } catch (e) {
                  console.log('Failed to send interruption signal')
                }
              }
            }
            
            let finalTranscript = ''
            let interimTranscript = ''
            let fullTranscript = '' // Complete text including both final and interim
            
            // Process only NEW results to avoid duplication
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i]
              console.log(`Result ${i}: "${result[0].transcript}" (confidence: ${result[0].confidence}, final: ${result.isFinal})`)
              
              if (result.isFinal) {
                finalTranscript += result[0].transcript
              } else {
                interimTranscript += result[0].transcript
              }
            }
            
            // Build complete transcript from current session
            fullTranscript = transcript + finalTranscript + interimTranscript
            
            // Update transcript state with new final results
            if (finalTranscript) {
              const updatedTranscript = transcript + finalTranscript
              setTranscript(updatedTranscript)
              console.log('Updated persistent transcript:', updatedTranscript)
            }
            
            // Update display with current complete text
            const displayTranscript = transcript + finalTranscript + interimTranscript
            setInputText(displayTranscript)
            
            // Track speech activity timing
            const now = Date.now()
            lastSpeechActivityRef.current = now
            
            console.log('Display transcript:', displayTranscript)
            console.log('New final parts:', finalTranscript)
            console.log('New interim parts:', interimTranscript)
            
            // Clear existing timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
            }
            
            // Start send timer if we have meaningful content
            const currentCompleteTranscript = transcript + finalTranscript + interimTranscript
            if (currentCompleteTranscript.trim().length >= 3) {
              console.log('Setting speech completion timer (1s) for:', currentCompleteTranscript)
              
              const capturedTranscript = currentCompleteTranscript
              
              speechTimeoutRef.current = setTimeout(() => {
                const timeSinceLastActivity = Date.now() - lastSpeechActivityRef.current
                
                console.log('Speech timeout fired - time since last activity:', timeSinceLastActivity + 'ms')
                
                if (timeSinceLastActivity >= 900) { // 0.9s margin for 1s timeout
                  const finalTextToSend = capturedTranscript.trim()
                  if (finalTextToSend && finalTextToSend.length >= 3) {
                    console.log('Speech complete, sending:', finalTextToSend)
                    handleSpeechComplete(finalTextToSend)
                  }
                } else {
                  console.log('Recent speech activity, not sending yet')
                }
              }, 1000) // 1 second pause
            }
          }

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            logger.voiceError('Speech recognition error occurred', {
              error: event.error,
              type: event.type,
              timeStamp: event.timeStamp,
              isTrusted: event.isTrusted
            })
            
            // Clear any pending speech timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
              speechTimeoutRef.current = null
            }
            
            // Handle different error types with better messaging
            const errorActions = {
              'network': 'Network error - will retry in 3 seconds',
              'audio-capture': 'Microphone error - checking permissions',
              'not-allowed': 'Microphone permission denied - please allow microphone access',
              'no-speech': 'No speech detected - restarting listener',
              'aborted': 'Speech recognition aborted - restarting',
              'language-not-supported': 'Language not supported'
            }
            
            const errorMessage = errorActions[event.error as keyof typeof errorActions] || `Speech error: ${event.error}`
            
            if (event.error === 'not-allowed') {
              setError(errorMessage)
            } else if (event.error === 'no-speech') {
              logger.info('No speech detected, continuing...')
            } else {
              logger.warn(errorMessage)
            }
            
            setIsListening(false)
            
            // Auto-restart for real-time mode with smarter retry logic
            const recoverableErrors = ['network', 'audio-capture', 'no-speech', 'aborted']
            if (realTimeMode && recoverableErrors.includes(event.error)) {
              const retryDelay = event.error === 'network' ? 3000 : 1500
              setTimeout(() => {
                if (realTimeMode && !isListening) {
                  logger.voiceStart('Auto-restarting speech recognition', { previousError: event.error })
                  startVoiceRecognition()
                }
              }, retryDelay)
            }
          }

          recognition.onend = () => {
            logger.voiceEnd('Speech recognition ended', {
              realTimeMode,
              enableVoice,
              isSpeaking,
              isListening
            })
            
            setIsListening(false)
            
            // Clear any pending speech timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
              speechTimeoutRef.current = null
            }
            
            // Auto-restart for real-time mode with better conditions
            if (realTimeMode && enableVoice && !isSpeaking) {
              setTimeout(() => {
                if (realTimeMode && enableVoice && !isListening && !isSpeaking) {
                  logger.voiceStart('Auto-restarting speech recognition (keepalive)', {
                    reason: 'onend_keepalive',
                    delay: 500
                  })
                  startVoiceRecognition()
                }
              }, 500)
            }
          }
        } catch (error) {
          console.error('Failed to initialize speech recognition:', error)
          setError('Speech recognition not available')
        }
      } else {
        console.warn('Speech recognition not supported in this browser')
        setError('Speech recognition not supported in this browser')
      }
    }
  }, [])

  // Process audio queue sequentially
  useEffect(() => {
    const processQueue = async () => {
      if (audioQueue.length > 0 && !isPlayingAudio) {
        const nextAudio = audioQueue[0]
        console.log('Processing audio queue, items remaining:', audioQueue.length, 'currently playing:', isPlayingAudio)
        setIsPlayingAudio(true)
        isPlayingAudioRef.current = true
        
        console.log('🎤 Starting audio playback')
        
        try {
          // Wait for the current audio to fully complete before continuing
          await playElevenLabsAudio(nextAudio)
          console.log('Audio finished playing, removing from queue')
          
          // Minimal delay for smooth transitions with Web Audio API
          await new Promise(resolve => setTimeout(resolve, 10))
        } catch (error) {
          console.error('Error playing audio:', error)
        } finally {
          // Remove the played audio from queue first
          setAudioQueue(prev => {
            const newQueue = prev.slice(1)
            console.log('Queue updated, new length:', newQueue.length)
            return newQueue
          })
          
          // Then mark as not playing, which will trigger processing of next item
          setIsPlayingAudio(false)
          isPlayingAudioRef.current = false
        }
      }
    }
    
    processQueue()
  }, [audioQueue, isPlayingAudio])

  // Handle ElevenLabs audio and auto-restart listening in real-time mode
  useEffect(() => {
    if (enableVoice && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && !isLoading) {
        // ElevenLabs audio will be handled via WebSocket audio messages
        // After AI response, restart listening in real-time mode
        if (realTimeMode && recognitionRef.current) {
          setTimeout(() => {
            if (!isListening && isConnected && audioQueue.length === 0 && !isPlayingAudio) {
              console.log('🎤 AI finished speaking, restarting voice recognition')
              startVoiceRecognition()
            }
          }, 1000) // Wait 1 second after response before listening again
        }
      }
    }
  }, [messages, isLoading, enableVoice, realTimeMode, isListening, isConnected, audioQueue.length, isPlayingAudio])

  // Ensure voice recognition is active during AI speech for interruption detection
  useEffect(() => {
    if (realTimeMode && enableVoice && isConnected && (isPlayingAudio || isSpeaking) && !isListening) {
      console.log('🎤 Starting voice recognition for interruption detection during AI speech')
      // Add small delay to avoid race conditions
      const timeoutId = setTimeout(() => {
        if (!isListening && (isPlayingAudio || isSpeaking)) {
          startVoiceRecognition()
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [realTimeMode, enableVoice, isConnected, isPlayingAudio, isSpeaking, isListening])
  
  const startVoiceRecognition = async () => {
    logger.voiceStart('startVoiceRecognition called', {
      isListening,
      realTimeMode,
      enableVoice,
      isSpeaking,
      hasRecognition: !!recognitionRef.current
    })
    
    if (!recognitionRef.current) {
      const errorMsg = 'Voice recognition not supported in this browser'
      logger.voiceError(errorMsg)
      setError(errorMsg)
      return
    }

    // Check both our state and the actual recognition state
    if (isListening) {
      logger.info('Already listening, skipping start')
      return
    }

    try {
      // Request microphone permissions first
      console.log('Requesting microphone permissions...')
      await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone permissions granted')
      
      // Clear input when starting new voice session (but not interruption mode)
      if (!isPlayingAudio && !isSpeaking) {
        setInputText('')
        setTranscript('')
      }
      
      setError(null) // Clear any previous errors
      console.log('Starting voice recognition...')
      
      // Triple-check state before starting and catch any errors
      if (!isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (startError) {
          console.warn('Recognition start error (likely already started):', startError)
          // If it's already started, just update our state
          if (startError instanceof Error && startError.name === 'InvalidStateError') {
            setIsListening(true)
          }
        }
      }
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone permission denied. Please allow microphone access.')
        } else if (error.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.')
        } else {
          setError(`Voice recognition failed: ${error.message}`)
        }
      } else {
        setError('Voice recognition failed to start. Please check your microphone.')
      }
    }
  }

  const speakText = (text: string) => {
    if (!synthRef.current) return

    // Stop any ongoing speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setIsSpeaking(true)
      isSpeakingRef.current = true
    }
    utterance.onend = () => {
      setIsSpeaking(false) 
      isSpeakingRef.current = false
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      isSpeakingRef.current = false
    }

    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      isSpeakingRef.current = false
    }
  }

  const playElevenLabsAudio = async (audioBase64: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('=== playElevenLabsAudio (Web Audio API) called ===')
        console.log('Audio base64 length:', audioBase64.length)
        
        // Initialize audio context if needed
        initializeAudioContext()
        
        if (!audioContextRef.current || !gainNodeRef.current) {
          throw new Error('Web Audio API not available')
        }
        
        // Resume audio context if it's suspended (required by browsers)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        setIsSpeaking(true)
        isSpeakingRef.current = true
        
        // Interruption detection will be enabled per-chunk basis in processQueue
        
        // Convert base64 to audio data
        console.log('Decoding base64 audio data...')
        const audioData = atob(audioBase64)
        console.log('Decoded audio data length:', audioData.length)
        
        const arrayBuffer = new ArrayBuffer(audioData.length)
        const uint8Array = new Uint8Array(arrayBuffer)
        
        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i)
        }
        
        console.log('Creating WAV buffer...')
        // ElevenLabs sends raw PCM data, convert to WAV
        const wavBuffer = createWavBuffer(uint8Array, 16000, 1) // 16kHz, mono
        
        console.log('Decoding audio buffer...')
        // Decode the audio data using Web Audio API
        const audioBuffer = await audioContextRef.current.decodeAudioData(wavBuffer.slice(0))
        
        console.log('Creating audio source...')
        // Create audio source
        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        
        // Apply smooth fade-in to reduce choppiness
        const fadeTime = 0.05 // 50ms fade
        const currentTime = audioContextRef.current.currentTime
        
        // Create a gain node for this specific audio chunk for fade control
        const chunkGainNode = audioContextRef.current.createGain()
        chunkGainNode.gain.setValueAtTime(0, currentTime)
        chunkGainNode.gain.linearRampToValueAtTime(1, currentTime + fadeTime)
        
        // Connect: source -> chunkGain -> mainGain -> destination
        source.connect(chunkGainNode)
        chunkGainNode.connect(gainNodeRef.current)
        
        // Set up fade-out at the end to smooth transitions
        const duration = audioBuffer.duration
        const fadeOutStart = Math.max(0, duration - fadeTime)
        chunkGainNode.gain.setValueAtTime(1, currentTime + fadeOutStart)
        chunkGainNode.gain.linearRampToValueAtTime(0.7, currentTime + duration) // Slight fade instead of full fade
        
        console.log(`Playing audio chunk: duration=${duration.toFixed(3)}s with fade-in/out`)
        
        // Handle completion
        source.onended = () => {
          console.log('Web Audio playback ended - resolving promise')
          setIsSpeaking(false)
          isSpeakingRef.current = false
          chunkGainNode.disconnect()
          
          // Restart speech recognition after AI finishes speaking
          if (realTimeMode && enableVoice && !isListening) {
            console.log('🎤 Restarting speech recognition after AI speech ends')
            // Audio playback complete
            setTimeout(() => {
              if (!isListening && realTimeMode && enableVoice) {
                startVoiceRecognition()
              }
            }, 200) // Small delay to avoid overlap
          }
          
          resolve()
        }
        
        // Start playback
        source.start(0)
        currentSourceRef.current = source
        
        console.log('Web Audio playback started successfully')
        
      } catch (error) {
        console.error('Error in Web Audio playback:', error)
        setIsSpeaking(false)
        isSpeakingRef.current = false
        
        // Restart speech recognition on error too
        if (realTimeMode && enableVoice && !isListening) {
          console.log('🎤 Restarting speech recognition after audio error')
          setTimeout(() => {
            if (!isListening && realTimeMode && enableVoice) {
              startVoiceRecognition()
            }
          }, 100)
        }
        
        reject(error)
      }
    })
  }

  const [showChat, setShowChat] = useState(false)

  // Prevent hydration mismatch by not rendering conditional UI until client-side
  if (!isClient) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Eleven</h1>
            <p className="text-muted-foreground mb-8">How can I help you today?</p>
          </div>
          <div className="w-80 h-80 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-indigo-500 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
            <div className="relative z-10 bg-black/80 text-white px-6 py-3 rounded-full flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Clean Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Eleven</h1>
          <p className="text-muted-foreground mb-8">How can I help you today?</p>
        </div>

        {/* Main interface components - Only show after client hydration */}
        {isClient && (
          <>
            {/* Main Call Interface - Only show in voice mode */}
            {enableVoice && (
              <div className="relative mb-8">
                {/* Large circular interface */}
                <div className="w-80 h-80 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-indigo-500 flex items-center justify-center relative overflow-hidden">
                  {/* Glass effect overlay */}
                  <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                  
                  {/* Call button */}
                  <Button
                    onClick={isConnected ? disconnectFromElevenLabs : connectToElevenLabs}
                    disabled={isConnecting}
                    className="relative z-10 bg-black/80 hover:bg-black/90 text-white px-6 py-3 rounded-full flex items-center space-x-2"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isConnecting ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : isConnected ? (
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      ) : (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span>{isConnecting ? 'Connecting...' : isConnected ? 'End call' : 'Start a call'}</span>
                  </Button>
                </div>

                {/* Chat toggle button - positioned at bottom right of circle */}
                <Button
                  onClick={() => setShowChat(!showChat)}
                  variant="outline"
                  size="sm"
                  className="absolute -bottom-2 -right-2 bg-white shadow-md rounded-full w-12 h-12 p-0 flex items-center justify-center"
                >
                  <div className="w-5 h-5 flex flex-col space-y-0.5">
                    <div className="w-full h-0.5 bg-gray-600 rounded"></div>
                    <div className="w-3/4 h-0.5 bg-gray-600 rounded"></div>
                    <div className="w-1/2 h-0.5 bg-gray-600 rounded"></div>
                  </div>
                </Button>
              </div>
            )}

            {/* Voice/Text Mode Toggle */}
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant={enableVoice ? "default" : "outline"}
                onClick={() => {
                  const wasTextMode = !enableVoice
                  const wasVoiceMode = enableVoice
                  setEnableVoice(!enableVoice)
                  
                  // If switching FROM voice mode TO text mode, immediately stop all audio
                  if (wasVoiceMode && isConnected) {
                    console.log('Switching to text-only mode - stopping all audio immediately')
                    
                    // Stop current ElevenLabs audio
                    if (currentSourceRef.current) {
                      try {
                        currentSourceRef.current.stop()
                        currentSourceRef.current.disconnect()
                      } catch (e) {
                        console.log('Audio source already stopped')
                      }
                      currentSourceRef.current = null
                    }
                    
                    // Clear audio queue
                    setAudioQueue([])
                    setIsPlayingAudio(false)
                    isPlayingAudioRef.current = false
                    
                    // Stop browser TTS if playing
                    if (synthRef.current) {
                      synthRef.current.cancel()
                    }
                    setIsSpeaking(false)
                    isSpeakingRef.current = false
                    
                    // Stop speech recognition
                    if (recognitionRef.current && isListening) {
                      try {
                        recognitionRef.current.stop()
                      } catch (e) {
                        console.log('Speech recognition already stopped')
                      }
                    }
                    setIsListening(false)
                  }
                  
                  // If switching FROM text mode TO voice mode, just enable listening for future inputs
                  if (wasTextMode && isConnected) {
                    console.log('Switching to voice mode - enabling microphone for future inputs')
                    
                    // Start voice recognition immediately for new inputs (don't read old messages)
                    setTimeout(() => {
                      if (!isListening) {
                        startVoiceRecognition()
                      }
                    }, 100)
                    
                    // DON'T speak old messages - just be ready for new voice interaction
                  }
                }}
                className="rounded-full"
              >
                {enableVoice ? '🎤 Voice' : '💬 Text only'}
              </Button>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-md mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm text-center">⚠️ {error}</p>
          </div>
        )}

        {/* Conditional UI - Only render after client hydration */}
        {isClient && (
          <>
            {/* Text-Only Mode: Full Screen Chat Interface */}
            {!enableVoice && (
              <div className="w-full max-w-4xl mx-auto bg-white border rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Chat with Eleven</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={isConnected ? disconnectFromElevenLabs : connectToElevenLabs}
                      disabled={isConnecting}
                      variant={isConnected ? "destructive" : "default"}
                      size="sm"
                      className="rounded-full"
                    >
                      {isConnecting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          Connecting...
                        </>
                      ) : isConnected ? (
                        <>
                          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                          Disconnect
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="h-96 border rounded-lg p-4 mb-4 bg-gray-50 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-lg">Start a conversation!</p>
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
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Text input always visible in text-only mode */}
                <div className="flex space-x-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={!isConnected || isLoading}
                    className="flex-1 rounded-full text-lg py-3"
                  />
                  
                  <Button
                    onClick={sendMessage}
                    disabled={!isConnected || !inputText.trim() || isLoading}
                    className="rounded-full px-6"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      '→'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Voice Mode: Collapsible Chat Interface */}
            {enableVoice && showChat && (
              <div className="w-full max-w-2xl mx-auto bg-white border rounded-lg shadow-lg p-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Chat</h3>
                  <div className="flex items-center space-x-2">
                    {isSpeaking && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopSpeaking}
                        className="rounded-full"
                      >
                        🔇 Stop
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowChat(false)}
                      className="rounded-full"
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                <div className="h-80 border rounded-lg p-4 mb-4 bg-gray-50 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Start a conversation!</p>
                      {!isConnected && (
                        <p className="text-sm mt-2">Click &quot;Start a call&quot; to begin</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      {isLoading && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Text input always available in voice mode chat */}
                <div className="flex space-x-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={!isConnected || isLoading}
                    className="flex-1 rounded-full"
                  />
                  
                  <Button
                    onClick={sendMessage}
                    disabled={!isConnected || !inputText.trim() || isLoading}
                    className="rounded-full"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      '→'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
