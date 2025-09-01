'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token is invalid or has expired.',
  Default: 'An error occurred during authentication.',
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Authentication Error
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        
        {error && (
          <div className="text-xs text-gray-500 text-center">
            Error code: {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <Button asChild className="w-full">
          <Link href="/auth/signin">
            Try Again
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">
            Go Home
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <ErrorContent />
      </Suspense>
    </div>
  )
}