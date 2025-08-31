import { NextRequest, NextResponse } from 'next/server'
import { SessionManager } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    const session = await SessionManager.getDeviceSession(deviceId)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Session retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { deviceId, sessionData } = await request.json()

    if (!deviceId || !sessionData) {
      return NextResponse.json(
        { error: 'Device ID and session data are required' },
        { status: 400 }
      )
    }

    // Update last active timestamp
    const updatedSessionData = {
      ...sessionData,
      lastActive: new Date().toISOString(),
    }

    await SessionManager.updateDeviceSession(deviceId, updatedSessionData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    await SessionManager.deleteDeviceSession(deviceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}