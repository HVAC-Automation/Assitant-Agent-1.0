'use client'

import { useState, useEffect } from 'react'

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getOrCreateDeviceId = () => {
      try {
        // First check localStorage for existing device ID
        const existingDeviceId = localStorage.getItem('ai-assistant-device-id')
        
        if (existingDeviceId && existingDeviceId.length >= 16) {
          setDeviceId(existingDeviceId)
          setIsLoading(false)
          return
        }

        // Generate a simple but unique device ID
        const timestamp = Date.now().toString()
        const random = Math.random().toString(36).substring(2)
        const simpleId = (timestamp + random).substring(0, 16)
        
        // Store in localStorage for future use
        localStorage.setItem('ai-assistant-device-id', simpleId)
        setDeviceId(simpleId)
      } catch (error) {
        console.error('Failed to generate device ID:', error)
        // Generate a simple fallback ID
        const fallbackId = Math.random().toString(36).substring(2, 18)
        localStorage.setItem('ai-assistant-device-id', fallbackId)
        setDeviceId(fallbackId)
      } finally {
        setIsLoading(false)
      }
    }

    getOrCreateDeviceId()
  }, [])

  return { deviceId, isLoading }
}