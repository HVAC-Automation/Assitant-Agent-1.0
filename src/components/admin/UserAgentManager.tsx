'use client'

import { useState, useEffect } from 'react'
import { AgentProfile } from '@/lib/agent-management'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Bot, 
  Plus, 
  Trash2, 
  Star, 
  StarOff,
  Search,
  UserPlus,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface AssignedAgent extends AgentProfile {
  isDefault: boolean
}

interface UserAgentManagerProps {
  userId: string
  assignedAgents: AssignedAgent[]
  availableAgents: AgentProfile[]
}

export function UserAgentManager({ 
  userId, 
  assignedAgents: initialAssignedAgents, 
  availableAgents 
}: UserAgentManagerProps) {
  const [assignedAgents, setAssignedAgents] = useState<AssignedAgent[]>(initialAssignedAgents)
  const [loading, setLoading] = useState<string | null>(null)
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('unassigned')

  // Filter available agents based on search and assignment status
  const filteredAvailableAgents = availableAgents.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const isAssigned = assignedAgents.some(aa => aa.id === agent.id)
    
    if (filterStatus === 'assigned') return isAssigned && matchesSearch
    if (filterStatus === 'unassigned') return !isAssigned && matchesSearch
    return matchesSearch // 'all'
  })

  const assignAgent = async (agentId: string, isDefault: boolean = false) => {
    setLoading(agentId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, isDefault }),
      })

      if (response.ok) {
        // Find the agent and add it to assigned agents
        const agent = availableAgents.find(a => a.id === agentId)
        if (agent) {
          setAssignedAgents(prev => [...prev, { ...agent, isDefault }])
        }
      } else {
        const error = await response.json()
        alert(`Failed to assign agent: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to assign agent')
    } finally {
      setLoading(null)
    }
  }

  const removeAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to remove this agent from the user?')) {
      return
    }

    setLoading(agentId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/agents?agentId=${agentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAssignedAgents(prev => prev.filter(a => a.id !== agentId))
      } else {
        const error = await response.json()
        alert(`Failed to remove agent: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to remove agent')
    } finally {
      setLoading(null)
    }
  }

  const setDefaultAgent = async (agentId: string) => {
    setLoading(agentId)
    try {
      // First remove the agent, then re-assign as default
      await removeAgent(agentId)
      await assignAgent(agentId, true)
    } catch (error) {
      alert('Failed to set default agent')
    } finally {
      setLoading(null)
    }
  }

  const bulkAssignAgents = async () => {
    if (selectedAgents.size === 0) return

    setBulkAssignLoading(true)
    let successCount = 0
    const errors: string[] = []

    for (const agentId of selectedAgents) {
      try {
        const response = await fetch(`/api/admin/users/${userId}/agents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId, isDefault: false }),
        })

        if (response.ok) {
          successCount++
          const agent = availableAgents.find(a => a.id === agentId)
          if (agent) {
            setAssignedAgents(prev => [...prev, { ...agent, isDefault: false }])
          }
        } else {
          const error = await response.json()
          errors.push(`${agentId}: ${error.message}`)
        }
      } catch (error) {
        errors.push(`${agentId}: Failed to assign`)
      }
    }

    setBulkAssignLoading(false)
    setSelectedAgents(new Set())

    if (errors.length > 0) {
      alert(`Assigned ${successCount} agent(s). ${errors.length} errors: ${errors.join(', ')}`)
    } else {
      alert(`Successfully assigned ${successCount} agent(s)`)
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

  return (
    <div className="space-y-6">
      {/* Assigned Agents */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Currently Assigned Agents ({assignedAgents.length})
        </h3>
        
        {assignedAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedAgents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{agent.name}</h4>
                      {agent.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {agent.isDefault && (
                    <Badge variant="default" className="text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-gray-500">
                    ID: {agent.elevenLabsAgentId.slice(0, 8)}...
                  </div>
                  <div className="flex items-center space-x-1">
                    {!agent.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultAgent(agent.id)}
                        disabled={loading === agent.id}
                        className="text-xs"
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgent(agent.id)}
                      disabled={loading === agent.id}
                      className="text-xs text-red-600 hover:text-red-900"
                    >
                      {loading === agent.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>No agents assigned to this user yet</p>
          </div>
        )}
      </div>

      {/* Available Agents for Assignment */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">
            Available Agents
          </h3>
          {selectedAgents.size > 0 && (
            <Button
              onClick={bulkAssignAgents}
              disabled={bulkAssignLoading}
              className="ml-4"
            >
              {bulkAssignLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Assign Selected ({selectedAgents.size})
            </Button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="all">All Agents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Available Agents Table */}
        {filteredAvailableAgents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedAgents.size === filteredAvailableAgents.filter(a => !assignedAgents.some(aa => aa.id === a.id)).length && filteredAvailableAgents.filter(a => !assignedAgents.some(aa => aa.id === a.id)).length > 0}
                    onCheckedChange={(checked) => {
                      const unassignedAgents = filteredAvailableAgents.filter(a => !assignedAgents.some(aa => aa.id === a.id))
                      if (checked) {
                        setSelectedAgents(new Set(unassignedAgents.map(a => a.id)))
                      } else {
                        setSelectedAgents(new Set())
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ElevenLabs ID</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvailableAgents.map((agent) => {
                const isAssigned = assignedAgents.some(aa => aa.id === agent.id)
                const isDefault = assignedAgents.find(aa => aa.id === agent.id)?.isDefault || false
                
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      {!isAssigned && (
                        <Checkbox
                          checked={selectedAgents.has(agent.id)}
                          onCheckedChange={() => handleSelectAgent(agent.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          {agent.description && (
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {agent.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAssigned ? (
                        <Badge variant={isDefault ? 'default' : 'secondary'}>
                          {isDefault ? (
                            <>
                              <Star className="mr-1 h-3 w-3" />
                              Default
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Assigned
                            </>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {agent.elevenLabsAgentId.slice(0, 12)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {!isAssigned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => assignAgent(agent.id)}
                          disabled={loading === agent.id}
                        >
                          {loading === agent.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAgent(agent.id)}
                          disabled={loading === agent.id}
                          className="text-red-600 hover:text-red-900"
                        >
                          {loading === agent.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            <AlertTriangle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p>No agents found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}