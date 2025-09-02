import { UserManager } from '@/lib/user-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Activity } from 'lucide-react'

export default async function AdminDashboard() {
  let allUsers
  try {
    // Get user statistics
    allUsers = await UserManager.listUsers(1, 1000) // Get all users for stats
  } catch (error) {
    // Handle case where database might not be available during build
    allUsers = { users: [], total: 0, page: 1, totalPages: 0 }
  }
  
  const activeUsers = allUsers.users.filter(user => user.isActive).length
  const inactiveUsers = allUsers.users.filter(user => !user.isActive).length
  const adminUsers = allUsers.users.filter(user => user.role === 'admin').length

  const stats = [
    {
      title: 'Total Users',
      value: allUsers.total,
      description: 'All registered users',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: activeUsers,
      description: 'Currently active accounts',
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'Inactive Users',
      value: inactiveUsers,
      description: 'Deactivated accounts',
      icon: UserX,
      color: 'bg-red-500',
    },
    {
      title: 'Administrators',
      value: adminUsers,
      description: 'Admin role users',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, Administrator
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-600">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Latest user registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allUsers.users.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center space-x-4">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.email
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email} • {user.role}
                    </p>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${
                    user.isActive ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/admin/users"
                className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Manage Users</p>
                    <p className="text-sm text-gray-500">Add, edit, or remove users</p>
                  </div>
                </div>
              </a>
              
              <a
                href="/admin/agents"
                className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Configure Agents</p>
                    <p className="text-sm text-gray-500">Set up AI agents and settings</p>
                  </div>
                </div>
              </a>
              
              <a
                href="/admin/analytics"
                className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">View Analytics</p>
                    <p className="text-sm text-gray-500">Usage reports and statistics</p>
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}