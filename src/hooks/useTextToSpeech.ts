'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TextToSpeechOptions {
  voice?: SpeechSynthesisVoice | null
  rate?: number
  pitch?: number
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

interface TextToSpeechHook {
  isSupported: boolean
  isSpeaking: boolean
  isPaused: boolean
  voices: SpeechSynthesisVoice[]
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  cancel: () => void
}

export function useTextToSpeech(options: TextToSpeechOptions = {}): TextToSpeechHook {
  const [isSupported, setIsSupported] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  
  const {
    voice = null,
    rate = 1,
    pitch = 1,
    volume = 1,
    onStart,
    onEnd,
    onError
  } = options

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true)
      
      // Load available voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices()
        setVoices(availableVoices)
      }
      
      loadVoices()
      
      // Some browsers load voices asynchronously
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices
      }

      // Monitor speaking state
      const checkSpeaking = () => {
        setIsSpeaking(speechSynthesis.speaking)
        setIsPaused(speechSynthesis.paused)
        
        if (speechSynthesis.speaking) {
          requestAnimationFrame(checkSpeaking)
        }
      }
      
      const interval = setInterval(checkSpeaking, 100)
      
      return () => clearInterval(interval)
    } else {
      setIsSupported(false)
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) {
      return
    }

    // Cancel any current speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
      onStart?.()
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      onEnd?.()
    }

    utterance.onerror = (event) => {
      const errorMessage = `Text-to-speech error: ${event.error}`
      setIsSpeaking(false)
      setIsPaused(false)
      onError?.(errorMessage)
    }

    utterance.onpause = () => {
      setIsPaused(true)
    }

    utterance.onresume = () => {
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [isSupported, voice, rate, pitch, volume, onStart, onEnd, onError])

  const pause = useCallback(() => {
    if (isSupported && isSpeaking && !isPaused) {
      speechSynthesis.pause()
    }
  }, [isSupported, isSpeaking, isPaused])

  const resume = useCallback(() => {
    if (isSupported && isSpeaking && isPaused) {
      speechSynthesis.resume()
    }
  }, [isSupported, isSpeaking, isPaused])

  const cancel = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [isSupported])

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    speak,
    pause,
    resume,
    cancel
  }
}