'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Bot, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewAgentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    elevenlabs_agent_id: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Agent created successfully!')
        setTimeout(() => {
          router.push('/admin/agents')
        }, 1500)
      } else {
        setMessage(data.error || 'Failed to create agent')
      }
    } catch (error) {
      console.error('Create agent error:', error)
      setMessage('Failed to create agent')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          asChild
          className="flex items-center space-x-2"
        >
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Agents</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Agent</h1>
          <p className="text-gray-600 mt-1">
            Connect a new ElevenLabs agent to your application
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Agent Details</span>
          </CardTitle>
          <CardDescription>
            Provide the ElevenLabs Agent ID and give it a custom name for your use case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className={`mb-6 ${message.includes('success') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <AlertDescription className={message.includes('success') ? 'text-green-700' : 'text-red-700'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Customer Support Bot, Sales Assistant, etc."
                required
              />
              <p className="text-sm text-gray-500">
                Give your agent a descriptive name for your specific use case
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevenlabs_agent_id">ElevenLabs Agent ID *</Label>
              <Input
                id="elevenlabs_agent_id"
                value={formData.elevenlabs_agent_id}
                onChange={(e) => handleInputChange('elevenlabs_agent_id', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
              <p className="text-sm text-gray-500">
                Find this ID in your ElevenLabs dashboard under Agent Settings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this agent is used for..."
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Add notes about this agent's purpose and configuration
              </p>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !formData.name || !formData.elevenlabs_agent_id}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isLoading ? 'Creating...' : 'Create Agent'}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/agents')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>How to find your ElevenLabs Agent ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Go to your <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ElevenLabs Conversational AI dashboard</a></li>
            <li>Select the agent you want to integrate</li>
            <li>Look for the Agent ID in the agent settings or URL</li>
            <li>Copy the ID (it should be in UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)</li>
            <li>Paste it above and give your agent a custom name</li>
          </ol>
          <p className="text-sm text-gray-500">
            The agent will be available for users to select in the main chat interface once created.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}