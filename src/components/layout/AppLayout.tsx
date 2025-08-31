'use client'

import { useDeviceId } from '@/hooks/useDeviceId'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { deviceId, isLoading } = useDeviceId()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing AI Assistant...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
      
      {/* Device ID indicator (for development) */}
      {process.env.NODE_ENV === 'development' && deviceId && (
        <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border">
          Device: {deviceId.substring(0, 8)}...
        </div>
      )}
    </div>
  )
}