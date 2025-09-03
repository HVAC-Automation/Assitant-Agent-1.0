'use client'

import { useState } from 'react'
import { Agent } from '@/lib/agent-management'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Bot,
  Activity,
  Settings,
  Play,
  Pause,
  Heart,
  Clock,
  Users,
  Plus
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface AgentTableProps {
  agents: Agent[]
}

interface AgentHealth {
  isHealthy: boolean
  responseTime?: number
  error?: string
  lastChecked: Date
}

export function AgentTable({ agents }: AgentTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [agentHealth, setAgentHealth] = useState<Record<string, AgentHealth>>({})

  const handleToggleStatus = async (agentId: string, currentStatus: boolean) => {
    setLoading(agentId)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to update agent status')
      }
    } catch (error) {
      alert('Failed to update agent status')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete agent "${agentName}"? This action cannot be undone.`)) {
      return
    }

    setLoading(agentId)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to delete agent')
      }
    } catch (error) {
      alert('Failed to delete agent')
    } finally {
      setLoading(null)
    }
  }

  const checkAgentHealth = async (agentId: string) => {
    try {
      const response = await fetch(`/api/admin/agents/health?agentId=${agentId}`)
      if (response.ok) {
        const data = await response.json()
        setAgentHealth(prev => ({
          ...prev,
          [agentId]: data.health
        }))
      }
    } catch (error) {
      console.error('Failed to check agent health:', error)
    }
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>ElevenLabs ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Configuration</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {agent.name}
                    </div>
                    {agent.description && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {agent.description}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {agent.elevenlabs_agent_id}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                  {agent.is_active ? (
                    <>
                      <Play className="mr-1 h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <Pause className="mr-1 h-3 w-3" />
                      Inactive
                    </>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {agentHealth[agent.id] ? (
                    <>
                      <Badge 
                        variant={agentHealth[agent.id].isHealthy ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {agentHealth[agent.id].isHealthy ? (
                          <>
                            <Heart className="mr-1 h-3 w-3" />
                            Healthy
                          </>
                        ) : (
                          <>
                            <Activity className="mr-1 h-3 w-3" />
                            Error
                          </>
                        )}
                      </Badge>
                      {agentHealth[agent.id].responseTime && (
                        <span className="text-xs text-gray-500">
                          {agentHealth[agent.id].responseTime}ms
                        </span>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => checkAgentHealth(agent.id)}
                      className="text-xs"
                    >
                      Check
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    Ready
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={loading === agent.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/agents/${agent.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Agent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/agents/${agent.id}/config`}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/agents/${agent.id}/users`}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleStatus(agent.id, agent.is_active)}
                      disabled={loading === agent.id}
                    >
                      {agent.is_active ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteAgent(agent.id, agent.name)}
                      disabled={loading === agent.id}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Agent
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {agents.length === 0 && (
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by discovering agents from ElevenLabs or creating a new one.
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <Button asChild variant="outline">
              <Link href="/admin/agents/discover">
                <Bot className="mr-2 h-4 w-4" />
                Discover Agents
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Agent
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}