'use client'

import { useState, useEffect } from 'react'
import { DeviceFingerprint } from '@/lib/device-fingerprint'

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getOrCreateDeviceId = async () => {
      try {
        // First check localStorage for existing device ID
        const existingDeviceId = localStorage.getItem('ai-assistant-device-id')
        
        if (existingDeviceId && DeviceFingerprint.isValidDeviceId(existingDeviceId)) {
          setDeviceId(existingDeviceId)
          setIsLoading(false)
          return
        }

        // Generate new device fingerprint
        const clientFingerprint = DeviceFingerprint.generateClientFingerprint()
        
        // Create device ID by calling server endpoint
        const response = await fetch('/api/device/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientFingerprint }),
        })

        if (response.ok) {
          const { deviceId: newDeviceId } = await response.json()
          
          // Store in localStorage for future use
          localStorage.setItem('ai-assistant-device-id', newDeviceId)
          setDeviceId(newDeviceId)
        } else {
          // Fallback to client-only device ID
          const fallbackDeviceId = DeviceFingerprint.createDeviceId(clientFingerprint)
          localStorage.setItem('ai-assistant-device-id', fallbackDeviceId)
          setDeviceId(fallbackDeviceId)
        }
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