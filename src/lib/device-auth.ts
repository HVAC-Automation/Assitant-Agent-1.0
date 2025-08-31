import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { SessionManager, type DeviceSession } from '@/lib/redis'
import { DeviceFingerprint } from '@/lib/device-fingerprint'
import { redirect } from 'next/navigation'

export interface DeviceUser {
  id: string
  deviceId: string
  email?: string
  name?: string
  createdAt: string
  lastActive: string
}

export class DeviceAuthManager {
  /**
   * Create or retrieve a device-based user session
   * This replaces traditional login with device fingerprinting
   */
  static async createDeviceUser(deviceId: string, userAgent: string): Promise<DeviceUser> {
    // Check if device user already exists in Supabase
    const { data: existingSession, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (existingSession && !error) {
      // Update last active timestamp
      const { data: updated } = await supabase
        .from('user_sessions')
        .update({ 
          last_active: new Date().toISOString(),
          user_agent: userAgent 
        })
        .eq('device_id', deviceId)
        .select()
        .single()

      return {
        id: updated.id,
        deviceId: updated.device_id,
        createdAt: updated.created_at,
        lastActive: updated.last_active,
      }
    }

    // Create new device user
    const { data: newUser, error: createError } = await supabase
      .from('user_sessions')
      .insert({
        device_id: deviceId,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create device user: ${createError.message}`)
    }

    return {
      id: newUser.id,
      deviceId: newUser.device_id,
      createdAt: newUser.created_at,
      lastActive: newUser.last_active,
    }
  }

  /**
   * Get device user from session
   */
  static async getDeviceUser(deviceId: string): Promise<DeviceUser | null> {
    // First check Redis cache
    const cachedSession = await SessionManager.getDeviceSession(deviceId)
    if (cachedSession) {
      return {
        id: cachedSession.deviceId,
        deviceId: cachedSession.deviceId,
        createdAt: cachedSession.createdAt,
        lastActive: cachedSession.lastActive,
      }
    }

    // Fall back to Supabase
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      deviceId: data.device_id,
      createdAt: data.created_at,
      lastActive: data.last_active,
    }
  }

  /**
   * Server-side authentication check
   * Use this in server components and API routes
   */
  static async requireDeviceAuth() {
    const session = await auth()
    
    if (!session?.user) {
      redirect('/auth/signin')
    }
    
    return session.user
  }

  /**
   * Update device user activity
   */
  static async updateActivity(deviceId: string) {
    const timestamp = new Date().toISOString()
    
    // Update both Redis and Supabase
    await Promise.all([
      SessionManager.updateDeviceSession(deviceId, {
        deviceId,
        userAgent: '',
        createdAt: '',
        lastActive: timestamp,
      }),
      supabase
        .from('user_sessions')
        .update({ last_active: timestamp })
        .eq('device_id', deviceId)
    ])
  }

  /**
   * Delete device session (logout)
   */
  static async deleteDeviceSession(deviceId: string) {
    await Promise.all([
      SessionManager.deleteDeviceSession(deviceId),
      supabase
        .from('user_sessions')
        .delete()
        .eq('device_id', deviceId)
    ])
  }
}