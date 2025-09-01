export class DeviceFingerprint {
  /**
   * Generate a device fingerprint from browser characteristics
   * This runs client-side to create a unique device identifier
   */
  static generateClientFingerprint(): string {
    if (typeof window === 'undefined') {
      throw new Error('generateClientFingerprint can only be called client-side')
    }

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.cookieEnabled.toString(),
      navigator.doNotTrack || 'unspecified',
    ].filter(Boolean)

    const fingerprint = components.join('|')
    return this.hashString(fingerprint)
  }

  /**
   * Generate a server-side device fingerprint from request headers
   * This is used as a fallback when client-side fingerprinting isn't available
   */
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

  /**
   * Create a persistent device ID that combines client and server fingerprints
   */
  static createDeviceId(clientFingerprint?: string, serverFingerprint?: string): string {
    const components = [
      clientFingerprint || '',
      serverFingerprint || '',
      Date.now().toString(), // Add timestamp for uniqueness
    ].filter(Boolean)

    return this.hashString(components.join('|'))
  }

  private static hashString(input: string): string {
    // Simple hash function that works in both browser and Node.js
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16)
  }

  /**
   * Validate device ID format
   */
  static isValidDeviceId(deviceId: string): boolean {
    return /^[a-f0-9]{16}$/.test(deviceId)
  }
}