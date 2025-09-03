'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import * as React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Mail, Shield, Calendar, Save, Lock, Key } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  // Initialize profile data when session loads
  React.useEffect(() => {
    if (session?.user) {
      const nameParts = session.user.name?.split(' ') || []
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: session.user.email || ''
      })
    }
  }, [session])

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  if (status === 'loading') {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Settings saved successfully!')
        // Update the session to reflect the new data
        await update()
      } else {
        setMessage(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Save error:', error)
      setMessage('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage('Please fill in all password fields')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long')
      return
    }

    setIsChangingPassword(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Password changed successfully!')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowChangePassword(false)
      } else {
        setMessage(data.error || 'Failed to change password')
      }
    } catch (error) {
      setMessage('An error occurred while changing password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-600">Manage your account preferences</p>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>
                  Update your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name</label>
                    <Input 
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                    <Input 
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Address</label>
                  <Input 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    type="email" 
                    placeholder="Enter your email"
                  />
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Password & Security</span>
                </CardTitle>
                <CardDescription>
                  Change your password and manage security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showChangePassword ? (
                  <Button
                    onClick={() => setShowChangePassword(true)}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Key className="h-4 w-4" />
                    <span>Change Password</span>
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Current Password</label>
                      <Input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        placeholder="Enter your current password"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">New Password</label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Enter your new password"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Confirm your new password"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="flex items-center space-x-2"
                      >
                        {isChangingPassword ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span>{isChangingPassword ? 'Changing...' : 'Change Password'}</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowChangePassword(false)
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                          setMessage('')
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Settings */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
                <CardDescription>
                  Customize your voice assistant preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium mb-2">🎤 Voice assistant features:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Real-time voice conversation</li>
                    <li>• Smart interruption detection</li>
                    <li>• Natural language processing</li>
                    <li>• Multi-language support (coming soon)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Account Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{session?.user?.email}</p>
                    <p className="text-xs text-gray-500">Email Address</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={session?.user?.role === 'admin' ? 'default' : 'secondary'}>
                        {session?.user?.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Account Role</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-gray-500">Account Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {session?.user?.role === 'admin' && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => router.push('/admin')}
                    variant="outline"
                    className="w-full flex items-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}