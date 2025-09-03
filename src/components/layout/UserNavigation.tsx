'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  LogOut, 
  User, 
  Settings, 
  Shield, 
  ChevronDown,
  Menu,
  X
} from 'lucide-react'

export function UserNavigation() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const navigateToAdmin = () => {
    router.push('/admin')
    setIsDropdownOpen(false)
  }

  const navigateToSettings = () => {
    router.push('/settings')
    setIsDropdownOpen(false)
  }

  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
        {/* User Info */}
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-700">
            {session?.user?.name || session?.user?.email}
          </span>
          {isAdmin && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Admin
            </span>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          {isAdmin && (
            <Button
              onClick={navigateToAdmin}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
            >
              <Shield className="h-3 w-3" />
              <span>Admin</span>
            </Button>
          )}
          
          <Button
            onClick={navigateToSettings}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
          >
            <Settings className="h-3 w-3" />
            <span>Settings</span>
          </Button>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <LogOut className="h-3 w-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm shadow-lg border flex items-center space-x-2"
        >
          {isDropdownOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span className="sr-only">Menu</span>
        </Button>

        {/* Mobile Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-12 right-0 bg-white border rounded-lg shadow-lg p-2 min-w-[200px]">
            {/* User Info */}
            <div className="px-3 py-2 border-b">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700 font-medium">
                    {session?.user?.name || session?.user?.email}
                  </span>
                  {isAdmin && (
                    <span className="text-xs text-blue-600">Admin User</span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="py-1">
              {isAdmin && (
                <button
                  onClick={navigateToAdmin}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Dashboard</span>
                </button>
              )}
              
              <button
                onClick={navigateToSettings}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}