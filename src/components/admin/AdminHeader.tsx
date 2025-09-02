'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { User, LogOut, Settings } from 'lucide-react'

interface AdminHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Administrator
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <User className="h-4 w-4" />
            <span>{user.name || user.email}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}