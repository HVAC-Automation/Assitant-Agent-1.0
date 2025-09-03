'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  RefreshCw, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RotateCcw,
  Download
} from 'lucide-react'

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

export function AgentDiscovery() {
  const [discovering, setDiscovering] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredAgent[]>([])
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())

  const discoverAgents = async () => {
    setDiscovering(true)
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
        if (data.synced > 0) {
          setTimeout(() => window.location.reload(), 2000)
        }
      } else {
        alert('Failed to sync agents')
      }
    } catch (error) {
      alert('Failed to sync agents')
    } finally {
      setSyncing(false)
    }
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
    if (selectedAgents.size === discoveredAgents.length) {
      setSelectedAgents(new Set())
    } else {
      setSelectedAgents(new Set(discoveredAgents.map(a => a.agentId)))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5" />
          <span>ElevenLabs Agent Discovery</span>
        </CardTitle>
        <CardDescription>
          Discover and sync agents from your ElevenLabs account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discovery Actions */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={discoverAgents}
            disabled={discovering}
            variant="outline"
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
                variant="default"
              >
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync All ({discoveredAgents.length})
              </Button>

              {selectedAgents.size > 0 && (
                <Button
                  onClick={() => syncAgents(Array.from(selectedAgents))}
                  disabled={syncing}
                  variant="secondary"
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
                <ul className="mt-1 text-xs text-blue-700">
                  {syncResult.errors.map((error, i) => (
                    <li key={i}>• {error.agentId}: {error.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Discovered Agents */}
        {discoveredAgents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Discovered Agents ({discoveredAgents.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedAgents.size === discoveredAgents.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoveredAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedAgents.has(agent.agentId)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectAgent(agent.agentId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 truncate">
                        {agent.name}
                      </h5>
                      {agent.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {agent.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        {agent.language && (
                          <Badge variant="outline" className="text-xs">
                            {agent.language.toUpperCase()}
                          </Badge>
                        )}
                        <code className="text-xs bg-gray-100 px-1 rounded">
                          {agent.agentId.slice(0, 8)}...
                        </code>
                      </div>
                    </div>
                    {selectedAgents.has(agent.agentId) && (
                      <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {discoveredAgents.length === 0 && !discovering && (
          <div className="text-center py-8 text-gray-500">
            <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm">
              Click "Discover Agents" to find agents from your ElevenLabs account
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}