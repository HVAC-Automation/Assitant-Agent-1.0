'use client'

import { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/user-management'
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
import { Checkbox } from '@/components/ui/checkbox'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Mail,
  Shield,
  Plus,
  Users,
  AlertTriangle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface UserTableProps {
  users: UserProfile[]
}

export function UserTable({ users }: UserTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Clear selections when users prop changes (e.g., after filtering)
  useEffect(() => {
    setSelectedUsers(new Set())
  }, [users])

  const isAllSelected = users.length > 0 && selectedUsers.size === users.length
  const isIndeterminate = selectedUsers.size > 0 && selectedUsers.size < users.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(u => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers)
    if (checked) {
      newSelection.add(userId)
    } else {
      newSelection.delete(userId)
    }
    setSelectedUsers(newSelection)
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to update user status')
      }
    } catch (error) {
      alert('Failed to update user status')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    setLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      alert('Failed to delete user')
    } finally {
      setLoading(null)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.size === 0) return

    const userCount = selectedUsers.size
    const actionText = action === 'activate' ? 'activate' : action === 'deactivate' ? 'deactivate' : 'delete'
    
    if (!confirm(`Are you sure you want to ${actionText} ${userCount} selected user(s)? ${action === 'delete' ? 'This action cannot be undone.' : ''}`)) {
      return
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedUsers)
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to ${actionText} users: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Failed to ${actionText} users`)
    } finally {
      setBulkActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('activate')}
              disabled={bulkActionLoading}
            >
              <UserCheck className="mr-1 h-4 w-4" />
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkActionLoading}
            >
              <UserX className="mr-1 h-4 w-4" />
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all users"
                className={isIndeterminate ? "data-[state=checked]:bg-blue-600" : ""}
              />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Email Verified</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                  aria-label={`Select ${user.email}`}
                />
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
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? (
                    <>
                      <UserCheck className="mr-1 h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <UserX className="mr-1 h-3 w-3" />
                      Inactive
                    </>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.emailVerified ? 'default' : 'outline'}>
                  <Mail className="mr-1 h-3 w-3" />
                  {user.emailVerified ? 'Verified' : 'Pending'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={loading === user.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/${user.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                      disabled={loading === user.id}
                    >
                      {user.isActive ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={loading === user.id}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {users.length === 0 && (
        <div className="text-center py-12">
          <UserX className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first user account.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/admin/users/new">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}