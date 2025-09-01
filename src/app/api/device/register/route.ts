import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Server-side device fingerprinting utilities
class ServerDeviceFingerprint {
  static generateServerFingerprint(headers: Headers): string {
    const components = [
      headers.get('user-agent') || '',
      headers.get('accept-language') || '',
      headers.get('accept-encoding') || '',
      headers.get('accept') || '',
      headers.get('sec-ch-ua') || '',
      headers.get('sec-ch-ua-platform') || '',
    ].filter(Boolean)

    const fingerprint = components.join('|')
    return this.hashString(fingerprint)
  }

  static createDeviceId(clientFingerprint: string, serverFingerprint: string): string {
    const components = [
      clientFingerprint || '',
      serverFingerprint || '',
      Date.now().toString(),
    ].filter(Boolean)

    return this.hashString(components.join('|'))
  }

  private static hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16)
  }
}

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
    const serverFingerprint = ServerDeviceFingerprint.generateServerFingerprint(request.headers)
    
    // Create unique device ID
    const deviceId = ServerDeviceFingerprint.createDeviceId(clientFingerprint, serverFingerprint)

    // For now, return deviceId without Redis storage
    // Session will be managed client-side via localStorage
    console.log('Device registered:', deviceId)

    return NextResponse.json({ deviceId })
  } catch (error) {
    console.error('Device registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    )
  }
}