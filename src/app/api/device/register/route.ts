import { NextRequest, NextResponse } from 'next/server'
import { DeviceFingerprint } from '@/lib/device-fingerprint'
import { SessionManager, type DeviceSession } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { clientFingerprint } = await request.json()

    if (!clientFingerprint) {
      return NextResponse.json(
        { error: 'Client fingerprint is required' },
        { status: 400 }
      )
    }

    // Generate server fingerprint from headers
    const serverFingerprint = DeviceFingerprint.generateServerFingerprint(request.headers)
    
    // Create unique device ID
    const deviceId = DeviceFingerprint.createDeviceId(clientFingerprint, serverFingerprint)

    // Store initial session data
    const sessionData: DeviceSession = {
      deviceId,
      userAgent: request.headers.get('user-agent') || '',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      clientFingerprint,
      serverFingerprint,
    }

    await SessionManager.createDeviceSession(deviceId, sessionData)

    return NextResponse.json({ deviceId })
  } catch (error) {
    console.error('Device registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}