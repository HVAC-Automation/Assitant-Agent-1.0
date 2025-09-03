'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailContent() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  // Auto-verify if token is in URL
  useEffect(() => {
    if (token) {
      handleTokenVerification(token)
    }
  }, [token])

  const handleTokenVerification = async (verificationToken: string) => {
    setIsVerifying(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        setVerificationStatus('success')
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin?message=email-verified')
        }, 3000)
      } else {
        setError(data.error || 'Verification failed')
        setVerificationStatus('error')
      }
    } catch (error) {
      console.error('Email verification error:', error)
      setError('An unexpected error occurred')
      setVerificationStatus('error')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'resend',
          email 
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        // In development, show the token
        if (process.env.NODE_ENV === 'development' && data.token) {
          console.log('Verification token (development):', data.token)
          const devUrl = `${window.location.origin}/auth/verify-email?token=${data.token}`
          console.log('Direct verification URL:', devUrl)
        }
      } else {
        setError(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      console.error('Resend email error:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (token) {
    // Token verification mode
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="p-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold">
              Email Verification
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isVerifying && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </div>
          )}

          {!isVerifying && verificationStatus === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Verified!</h3>
                <p className="mt-2 text-gray-600">
                  Your email has been successfully verified. You will be redirected to sign in shortly.
                </p>
              </div>
            </div>
          )}

          {!isVerifying && verificationStatus === 'error' && (
            <div className="text-center py-8">
              <XCircle className="mx-auto h-12 w-12 text-red-600" />
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Verification Failed</h3>
                <p className="mt-2 text-gray-600">
                  The verification link is invalid or has expired.
                </p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        {verificationStatus === 'error' && (
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm">
              <p className="text-gray-600 mb-4">Need a new verification link?</p>
              <Link 
                href="/auth/verify-email" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Request New Verification Email
              </Link>
            </div>
          </CardFooter>
        )}

        {verificationStatus === 'success' && (
          <CardFooter>
            <Button 
              asChild 
              className="w-full"
            >
              <Link href="/auth/signin">
                Continue to Sign In
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    )
  }

  // Resend email mode
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2">
          <Link href="/auth/signin">
            <Button variant="ghost" size="sm" className="p-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">
            Verify Your Email
          </CardTitle>
        </div>
        <CardDescription>
          Enter your email address to receive a verification link.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleResendEmail}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-2 text-sm">
                    <strong>Development mode:</strong> Check your browser console for the verification link.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Verification Email
              </>
            )}
          </Button>
          
          <div className="text-center text-sm">
            Remember your password?{' '}
            <Link 
              href="/auth/signin" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}