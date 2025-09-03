'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  RefreshCw, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RotateCcw,
  Download,
  ArrowLeft,
  Heart,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface DiscoveredAgent {
  agentId: string
  name: string
  voiceId: string
  description?: string
  prompt?: string
  firstMessage?: string
  language?: string
  conversationConfig?: any
  voiceConfig?: any
}

interface SyncResult {
  synced: number
  errors: Array<{ agentId: string; error: string }>
}

interface AgentHealth {
  isHealthy: boolean
  responseTime?: number
  error?: string
}

export default function AgentDiscoveryPage() {
  const [discovering, setDiscovering] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredAgent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<DiscoveredAgent[]>([])
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [agentHealth, setAgentHealth] = useState<Record<string, AgentHealth>>({})

  // Filter agents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAgents(discoveredAgents)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredAgents(
        discoveredAgents.filter(agent =>
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.agentId.toLowerCase().includes(query)
        )
      )
    }
  }, [discoveredAgents, searchQuery])

  const discoverAgents = async () => {
    setDiscovering(true)
    setSyncResult(null)
    try {
      const response = await fetch('/api/admin/agents/discover')
      if (response.ok) {
        const data = await response.json()
        setDiscoveredAgents(data.agents || [])
      } else {
        alert('Failed to discover agents')
      }
    } catch (error) {
      alert('Failed to discover agents')
    } finally {
      setDiscovering(false)
    }
  }

  const syncAgents = async (agentIds?: string[]) => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/agents/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentIds ? { agentIds } : {}),
      })

      if (response.ok) {
        const data = await response.json()
        setSyncResult(data)
      } else {
        alert('Failed to sync agents')
      }
    } catch (error) {
      alert('Failed to sync agents')
    } finally {
      setSyncing(false)
    }
  }

  const checkAllHealth = async () => {
    setCheckingHealth(true)
    const healthResults: Record<string, AgentHealth> = {}
    
    for (const agent of discoveredAgents) {
      try {
        const response = await fetch(`/api/admin/agents/health?elevenLabsId=${agent.agentId}`)
        if (response.ok) {
          const data = await response.json()
          healthResults[agent.agentId] = data.health
        }
      } catch (error) {
        healthResults[agent.agentId] = {
          isHealthy: false,
          error: 'Connection failed'
        }
      }
    }
    
    setAgentHealth(healthResults)
    setCheckingHealth(false)
  }

  const handleSelectAgent = (agentId: string) => {
    const newSelection = new Set(selectedAgents)
    if (newSelection.has(agentId)) {
      newSelection.delete(agentId)
    } else {
      newSelection.add(agentId)
    }
    setSelectedAgents(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedAgents.size === filteredAgents.length) {
      setSelectedAgents(new Set())
    } else {
      setSelectedAgents(new Set(filteredAgents.map(a => a.agentId)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/agents">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discover Agents</h1>
            <p className="text-gray-600 mt-1">
              Find and sync agents from your ElevenLabs account
            </p>
          </div>
        </div>
      </div>

      {/* Discovery Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>ElevenLabs Agent Discovery</span>
          </CardTitle>
          <CardDescription>
            Discover agents from your ElevenLabs account and sync them to the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={discoverAgents}
              disabled={discovering}
              variant="default"
            >
              {discovering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {discovering ? 'Discovering...' : 'Discover Agents'}
            </Button>
            
            {discoveredAgents.length > 0 && (
              <>
                <Button
                  onClick={() => syncAgents()}
                  disabled={syncing}
                  variant="secondary"
                >
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync All ({discoveredAgents.length})
                </Button>

                <Button
                  onClick={checkAllHealth}
                  disabled={checkingHealth}
                  variant="outline"
                >
                  {checkingHealth ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="mr-2 h-4 w-4" />
                  )}
                  Check Health
                </Button>

                {selectedAgents.size > 0 && (
                  <Button
                    onClick={() => syncAgents(Array.from(selectedAgents))}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Sync Selected ({selectedAgents.size})
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Search */}
          {discoveredAgents.length > 0 && (
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search agents by name, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              {filteredAgents.length !== discoveredAgents.length && (
                <Badge variant="secondary">
                  {filteredAgents.length} of {discoveredAgents.length}
                </Badge>
              )}
            </div>
          )}

          {/* Sync Results */}
          {syncResult && (
            <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Sync completed: {syncResult.synced} agent(s) synchronized
                </span>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-blue-800">
                    {syncResult.errors.length} error(s) occurred:
                  </p>
                  <ul className="mt-1 text-xs text-blue-700 max-h-32 overflow-y-auto">
                    {syncResult.errors.map((error, i) => (
                      <li key={i}>• {error.agentId}: {error.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {syncResult.synced > 0 && (
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/agents">
                      View Synced Agents
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovered Agents */}
      {filteredAgents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Discovered Agents ({filteredAgents.length})
                </CardTitle>
                <CardDescription>
                  Select agents to sync to your platform
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedAgents.size === filteredAgents.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedAgents.has(agent.agentId)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleSelectAgent(agent.agentId)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <h5 className="font-medium text-gray-900 truncate">
                        {agent.name}
                      </h5>
                    </div>
                    <div className="flex items-center space-x-1">
                      {agentHealth[agent.agentId] && (
                        <Badge 
                          variant={agentHealth[agent.agentId].isHealthy ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {agentHealth[agent.agentId].isHealthy ? (
                            <Heart className="mr-1 h-2 w-2" />
                          ) : (
                            <XCircle className="mr-1 h-2 w-2" />
                          )}
                        </Badge>
                      )}
                      {selectedAgents.has(agent.agentId) && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>

                  {agent.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {agent.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Agent ID:</span>
                      <code className="bg-gray-100 px-1 rounded">
                        {agent.agentId.slice(0, 12)}...
                      </code>
                    </div>
                    
                    {agent.language && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Language:</span>
                        <Badge variant="outline" className="text-xs">
                          {agent.language.toUpperCase()}
                        </Badge>
                      </div>
                    )}

                    {agentHealth[agent.agentId]?.responseTime && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Response:</span>
                        <span className="text-green-600">
                          {agentHealth[agent.agentId].responseTime}ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredAgents.length === 0 && !discovering && discoveredAgents.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Bot className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Agents Discovered Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Click "Discover Agents" to find agents from your ElevenLabs account
            </p>
            <Button onClick={discoverAgents} disabled={discovering}>
              {discovering ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {discovering ? 'Discovering...' : 'Discover Agents'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {filteredAgents.length === 0 && searchQuery && discoveredAgents.length > 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No agents found
            </h3>
            <p className="text-gray-500 mb-6">
              No agents match your search query "{searchQuery}"
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}