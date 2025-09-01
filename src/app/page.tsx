'use client'

import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
  const allowInterruptionRef = useRef(false)
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
        
        // Auto-reconnect if not a manual disconnect
        if (event.code !== 1000 && event.code !== 1006) { // Avoid reconnecting on normal closure or abnormal closure
          console.log('Attempting to reconnect in 3 seconds...')
          setTimeout(() => {
            if (!isConnected && !isConnecting && wsRef.current?.readyState !== WebSocket.CONNECTING) {
              console.log('Auto-reconnecting...')
              connectToElevenLabs()
            }
          }, 3000)
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

  // Initialize speech recognition, synthesis, and Web Audio API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize Web Audio API for smooth audio playback
      initializeAudioContext()
      
      // Initialize speech synthesis
      synthRef.current = window.speechSynthesis

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = 'en-US'
          recognitionRef.current.maxAlternatives = 1

          console.log('Initializing speech recognition with enhanced settings')

          recognitionRef.current.onstart = () => {
            console.log('Speech recognition started successfully')
            setIsListening(true)
            setError(null)
            
            // If AI is currently speaking, this means we're enabling interruption detection
            if (isPlayingAudioRef.current || isSpeakingRef.current) {
              console.log('🎤 Voice recognition active during AI speech - ready for interruption')
            }
          }

          recognitionRef.current.onresult = (event) => {
            console.log('Speech recognition onresult fired, results:', event.results.length)
            
            // DEBUG: Check interruption conditions
            console.log('🔍 Interruption check: isPlayingAudio:', isPlayingAudioRef.current, 'isSpeaking:', isSpeakingRef.current, 'allowInterruption:', allowInterruptionRef.current, 'audioQueue length:', audioQueue.length)
            
            // INTERRUPTION DETECTION: If AI is speaking and user starts speaking AND interruptions are allowed
            if ((isPlayingAudioRef.current || isSpeakingRef.current) && allowInterruptionRef.current) {
              console.log('🛑 INTERRUPTION DETECTED - User speaking while AI is talking')
              console.log('Stopping AI audio and clearing queue')
              
              // Stop current audio immediately
              if (currentSourceRef.current) {
                try {
                  currentSourceRef.current.stop()
                  currentSourceRef.current.disconnect()
                } catch (e) {
                  console.log('Audio source already stopped or disconnected')
                }
                currentSourceRef.current = null
              }
              
              // Clear the audio queue to prevent continued playback
              setAudioQueue([])
              setIsPlayingAudio(false)
              isPlayingAudioRef.current = false
              setIsSpeaking(false)
              isSpeakingRef.current = false
              allowInterruptionRef.current = false
              
              // Send interruption signal to WebSocket if available
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({
                    type: 'user_interruption'
                  }))
                  console.log('Sent interruption signal to ElevenLabs')
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
            
            // Only start the send timer if we have meaningful content (including interim results)
            const currentCompleteTranscript = transcript + finalTranscript + interimTranscript
            if (currentCompleteTranscript.trim().length >= 3) { // At least 3 characters
              console.log('Setting speech completion timer (1.5s) for:', currentCompleteTranscript)
              
              // Capture the current transcript to use when timeout fires
              const capturedTranscript = currentCompleteTranscript
              
              speechTimeoutRef.current = setTimeout(() => {
                // Double-check that speech hasn't continued
                const timeSinceLastActivity = Date.now() - lastSpeechActivityRef.current
                
                console.log('Speech timeout fired - time since last activity:', timeSinceLastActivity + 'ms')
                
                if (timeSinceLastActivity >= 1400) { // Allow small margin for timing (1.4s for 1.5s timeout)
                  const finalTextToSend = capturedTranscript.trim() // Use the captured transcript
                  if (finalTextToSend && finalTextToSend.length >= 3) {
                    console.log('Speech appears complete, sending message:', finalTextToSend)
                    handleSpeechComplete(finalTextToSend)
                  } else {
                    console.log('Speech too short, not sending:', finalTextToSend)
                  }
                } else {
                  console.log('Recent speech activity detected, not sending yet')
                }
              }, 1500) // Wait 1.5 seconds after last speech activity
            } else {
              console.log('Transcript too short, not setting timer')
            }
          }

          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            console.error('Error details:', event)
            
            // Clear any pending speech timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
              speechTimeoutRef.current = null
            }
            
            if (event.error === 'network') {
              setError('Network error - check your internet connection')
            } else if (event.error === 'not-allowed') {
              setError('Microphone access denied - please allow microphone permissions')
            } else if (event.error === 'no-speech') {
              console.log('No speech detected, continuing...')
            } else {
              setError(`Speech recognition error: ${event.error}`)
            }
            
            setIsListening(false)
            
            // Auto-restart for real-time mode unless it's a permission error
            if (realTimeMode && event.error !== 'not-allowed' && event.error !== 'aborted') {
              setTimeout(() => {
                console.log('Restarting speech recognition after error')
                startVoiceRecognition()
              }, 1000)
            }
          }

          recognitionRef.current.onend = () => {
            console.log('Speech recognition ended')
            setIsListening(false)
            
            // Clear any pending speech timeout
            if (speechTimeoutRef.current) {
              clearTimeout(speechTimeoutRef.current)
              speechTimeoutRef.current = null
            }
            
            // Auto-restart for real-time mode
            if (realTimeMode) {
              setTimeout(() => {
                console.log('Restarting speech recognition for continuous listening')
                startVoiceRecognition()
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
        
        // Disable interruptions for first chunk to prevent hearing AI's initial response
        if (audioQueue.length > 1) {
          console.log('🎤 Enabling interruption detection (not first chunk)')
          allowInterruptionRef.current = true
        } else {
          console.log('🔇 Disabling interruption detection (first chunk)')
          allowInterruptionRef.current = false
        }
        
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
    console.log('startVoiceRecognition called, isListening:', isListening)
    
    if (!recognitionRef.current) {
      const errorMsg = 'Voice recognition not supported in this browser'
      console.error(errorMsg)
      setError(errorMsg)
      return
    }

    if (isListening) {
      console.log('Already listening, skipping start')
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
      
      // Double-check state before starting
      if (!isListening && recognitionRef.current) {
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError(`Voice recognition failed: ${error.message}`)
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
            allowInterruptionRef.current = false // Disable interruption for next conversation
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

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Assistant</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Voice and chat interface powered by ElevenLabs Conversational AI
          </p>
          
          {/* Voice & Real-time Toggles */}
          <div className="flex items-center justify-center mt-4 space-x-4">
            <Button
              variant={enableVoice ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableVoice(!enableVoice)}
              className="flex items-center space-x-2"
            >
              {enableVoice ? '🔊' : '🔇'}
              <span>{enableVoice ? 'Voice ON' : 'Voice OFF'}</span>
            </Button>
            <Button
              variant={realTimeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setRealTimeMode(!realTimeMode)}
              className="flex items-center space-x-2"
            >
              ⚡
              <span>{realTimeMode ? 'Real-time' : 'Manual'}</span>
            </Button>
          </div>
          
          {/* Debug buttons */}
          <div className="flex items-center justify-center mt-2 space-x-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('=== MANUAL TEST: Sending test message ===')
                sendVoiceMessage('This is a test message')
              }}
              className="text-xs"
            >
              Test Send
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('=== MANUAL TEST: Playing test audio ===')
                // Create a simple PCM test audio (1 second of 440Hz tone)
                const sampleRate = 16000
                const duration = 1
                const samples = sampleRate * duration
                const pcmData = new Uint8Array(samples * 2) // 16-bit samples
                
                for (let i = 0; i < samples; i++) {
                  const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1 * 32767
                  const offset = i * 2
                  pcmData[offset] = sample & 0xff
                  pcmData[offset + 1] = (sample >> 8) & 0xff
                }
                
                const wavBuffer = createWavBuffer(pcmData, sampleRate, 1)
                const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })
                const audioUrl = URL.createObjectURL(audioBlob)
                const audio = new Audio(audioUrl)
                audio.play()
              }}
              className="text-xs"
            >
              Test Audio
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-4xl mx-auto mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-red-700 text-sm">⚠️ {error}</p>
          </div>
        )}
        
        {/* Status Display */}
        <div className="w-full max-w-4xl mx-auto mb-4 p-3 bg-muted/20 border rounded-md">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className={`flex items-center space-x-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </span>
              <span className={`flex items-center space-x-1 ${isListening ? 'text-blue-600' : 'text-gray-600'}`}>
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>{isListening ? 'Listening...' : 'Not listening'}</span>
              </span>
              <span className={`flex items-center space-x-1 ${isLoading ? 'text-yellow-600' : 'text-gray-600'}`}>
                <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>{isLoading ? 'AI thinking...' : 'Ready'}</span>
              </span>
              <span className={`flex items-center space-x-1 ${isSpeaking ? 'text-purple-600' : 'text-gray-600'}`}>
                <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>{isSpeaking ? 'AI speaking...' : 'Quiet'}</span>
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Mode: {realTimeMode ? 'Real-time' : 'Manual'} | Voice: {enableVoice ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {/* ElevenLabs Chat Interface */}
        <div className="w-full max-w-4xl mx-auto border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">ElevenLabs AI Agent</h3>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {enableVoice && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? '🔇 Stop' : '🔊'}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={isConnected ? disconnectFromElevenLabs : connectToElevenLabs}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>

          <div className="h-96 border rounded-lg p-4 mb-4 bg-muted/20 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Start a conversation with your AI agent!</p>
                <p className="text-sm mt-2">{isConnected ? 'Type a message below' : 'Click "Connect" to begin'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg px-4 py-2">
                      <div className="text-sm text-gray-600">AI is thinking...</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button 
              variant={isListening ? "destructive" : "outline"} 
              size="icon"
              onClick={startVoiceRecognition}
              disabled={!isConnected || !enableVoice}
              title={enableVoice ? (isListening ? "Stop listening" : "Start voice input") : "Voice disabled"}
            >
              {isListening ? '🎤' : '🎙️'}
            </Button>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={isListening ? "Listening..." : "Type your message or click mic..."} 
              className="flex-1 px-3 py-2 border rounded-md"
              disabled={!isConnected || isLoading || isListening}
            />
            <Button 
              onClick={sendMessage}
              disabled={!isConnected || !inputText.trim() || isLoading}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            🎤 {enableVoice ? (isListening ? 'Listening...' : realTimeMode ? 'Real-time mode - click mic for continuous chat' : 'Click mic to speak') : 'Voice disabled'} 
            <br />
            ⚡ Mode: {realTimeMode ? 'Real-time (auto-send + auto-listen)' : 'Manual (click Send)'} • Agent: {agentId}
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground max-w-md space-y-2">
          <p>
            ✅ <strong>WebSocket Integration:</strong> Real-time ElevenLabs Conversational AI
          </p>
          <p>
            🎤 <strong>Voice:</strong> {enableVoice ? 'Speech recognition & synthesis enabled' : 'Text-only mode'}
          </p>
          <p className="mt-2">
            🎯 <strong>Features:</strong> Live conversation • Voice input/output • Message history
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
