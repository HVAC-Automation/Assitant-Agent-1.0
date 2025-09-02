import { UserManager } from '@/lib/user-management'
import { UserTable } from '@/components/admin/UserTable'
import { UserSearch } from '@/components/admin/UserSearch'
import { Pagination } from '@/components/admin/Pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  search?: string
  role?: string
  status?: string
  page?: string
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  let usersData
  try {
    const page = parseInt(searchParams.page || '1')
    const search = searchParams.search || ''
    const role = searchParams.role === 'all' ? '' : (searchParams.role || '')
    const status = searchParams.status === 'all' ? '' : (searchParams.status || '')
    
    // Get users with pagination and filters
    usersData = await UserManager.listUsers(page, 50, { search, role, status })
  } catch (error) {
    // Handle case where database might not be available during build
    usersData = { users: [], total: 0, page: 1, totalPages: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({usersData.total})</CardTitle>
          <CardDescription>
            View and manage all registered users in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserSearch />
          <UserTable users={usersData.users} />
          <Pagination 
            currentPage={usersData.page} 
            totalPages={usersData.totalPages} 
            totalItems={usersData.total} 
          />
        </CardContent>
      </Card>
    </div>
  )
}