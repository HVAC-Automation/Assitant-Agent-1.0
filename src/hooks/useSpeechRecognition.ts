'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

interface SpeechRecognitionHook {
  isSupported: boolean
  isListening: boolean
  transcript: string
  confidence: number
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// Import speech types (declared globally in types/speech.d.ts)
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionHook {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError,
    onStart,
    onEnd
  } = options

  useEffect(() => {
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setIsSupported(true)
      
      const recognition = new SpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = language
      
      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
        onStart?.()
      }
      
      recognition.onend = () => {
        setIsListening(false)
        onEnd?.()
      }
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
            setConfidence(result[0].confidence)
          } else {
            interimTranscript += result[0].transcript
          }
        }
        
        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript)
        
        if (onResult) {
          onResult(fullTranscript, !!finalTranscript)
        }
      }
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = `Speech recognition error: ${event.error}`
        setError(errorMessage)
        setIsListening(false)
        onError?.(errorMessage)
      }
      
      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
    }
  }, [continuous, interimResults, language, onResult, onError, onStart, onEnd])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('')
        setError(null)
        recognitionRef.current.start()
      } catch (error) {
        const errorMessage = 'Failed to start speech recognition'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }
  }, [isListening, onError])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setConfidence(0)
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript
  }
}