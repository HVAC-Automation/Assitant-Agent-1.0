'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/user-management'
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
  User, 
  Plus, 
  Trash2, 
  Star, 
  StarOff,
  Search,
  UserPlus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react'

interface UserWithAssignment extends UserProfile {
  hasAgent: boolean
  isDefault: boolean
}

interface AgentUserManagerProps {
  agentId: string
  agentName: string
  allUsers: UserWithAssignment[]
}

export function AgentUserManager({ 
  agentId, 
  agentName,
  allUsers: initialUsers
}: AgentUserManagerProps) {
  const [users, setUsers] = useState<UserWithAssignment[]>(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('unassigned')
  const [filterRole, setFilterRole] = useState('all')

  // Filter users based on search, assignment status, and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'assigned' && user.hasAgent) ||
      (filterStatus === 'unassigned' && !user.hasAgent)
    
    const matchesRole = 
      filterRole === 'all' || user.role === filterRole

    return matchesSearch && matchesStatus && matchesRole
  })

  const assignUser = async (userId: string, isDefault: boolean = false) => {
    setLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, isDefault }),
      })

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, hasAgent: true, isDefault }
            : user
        ))
      } else {
        const error = await response.json()
        alert(`Failed to assign user: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to assign user')
    } finally {
      setLoading(null)
    }
  }

  const removeUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this agent from the user?')) {
      return
    }

    setLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/agents?agentId=${agentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, hasAgent: false, isDefault: false }
            : user
        ))
      } else {
        const error = await response.json()
        alert(`Failed to remove user: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to remove user')
    } finally {
      setLoading(null)
    }
  }

  const setDefaultUser = async (userId: string) => {
    setLoading(userId)
    try {
      // First remove the user, then re-assign as default
      await removeUser(userId)
      await assignUser(userId, true)
    } catch (error) {
      alert('Failed to set as default')
    } finally {
      setLoading(null)
    }
  }

  const bulkAssignUsers = async () => {
    if (selectedUsers.size === 0) return

    setBulkAssignLoading(true)
    try {
      const response = await fetch(`/api/admin/agents/${agentId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userIds: Array.from(selectedUsers),
          isDefault: false 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the users state
        setUsers(prev => prev.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, hasAgent: true, isDefault: false }
            : user
        ))
        
        setSelectedUsers(new Set())
        
        if (data.results.errors > 0) {
          alert(`Assigned ${data.results.success} user(s). ${data.results.errors} errors occurred.`)
        } else {
          alert(`Successfully assigned ${data.results.success} user(s)`)
        }
      } else {
        const error = await response.json()
        alert(`Failed to assign users: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert('Failed to assign users')
    } finally {
      setBulkAssignLoading(false)
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const assignedUsers = users.filter(u => u.hasAgent)
  const unassignedUsers = users.filter(u => !u.hasAgent)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">{users.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Assigned</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{assignedUsers.length}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <UserX className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Unassigned</span>
          </div>
          <p className="text-2xl font-bold text-gray-600 mt-1">{unassignedUsers.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-900">Default</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {assignedUsers.filter(u => u.isDefault).length}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
              </span>
            </div>
            <Button
              onClick={bulkAssignUsers}
              disabled={bulkAssignLoading}
              size="sm"
            >
              {bulkAssignLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Assign Selected
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedUsers.size === filteredUsers.filter(u => !u.hasAgent).length && filteredUsers.filter(u => !u.hasAgent).length > 0}
                  onCheckedChange={(checked) => {
                    const unassignedUsers = filteredUsers.filter(u => !u.hasAgent)
                    if (checked) {
                      setSelectedUsers(new Set(unassignedUsers.map(u => u.id)))
                    } else {
                      setSelectedUsers(new Set())
                    }
                  }}
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assignment Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {!user.hasAgent && (
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => handleSelectUser(user.id)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'No name set'
                        }
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.hasAgent ? (
                    <Badge variant={user.isDefault ? 'default' : 'secondary'}>
                      {user.isDefault ? (
                        <>
                          <Star className="mr-1 h-3 w-3" />
                          Default Agent
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Assigned
                        </>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Assigned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {!user.hasAgent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignUser(user.id)}
                        disabled={loading === user.id || !user.isActive}
                      >
                        {loading === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                    ) : (
                      <>
                        {!user.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultUser(user.id)}
                            disabled={loading === user.id}
                            className="text-xs"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(user.id)}
                          disabled={loading === user.id}
                          className="text-red-600 hover:text-red-900"
                        >
                          {loading === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <AlertTriangle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p>No users found matching your criteria</p>
          {searchQuery && (
            <Button 
              variant="outline" 
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  )
}