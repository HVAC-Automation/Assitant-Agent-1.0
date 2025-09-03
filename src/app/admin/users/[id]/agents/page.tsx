import { UserManager } from '@/lib/user-management'
import { AgentManager } from '@/lib/agent-management'
import { UserAgentManager } from '@/components/admin/UserAgentManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Bot } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function UserAgentsPage({ params }: Props) {
  let userData
  let allAgents
  
  try {
    // Get user details
    const user = await UserManager.getUserById(params.id)
    if (!user) {
      notFound()
    }

    // Get user's assigned agents
    const userAgents = await AgentManager.getUserAgents(params.id)
    
    // Get all available agents for assignment
    const agentsResult = await AgentManager.listAgents(1, 100, { isActive: true })
    
    userData = {
      user,
      assignedAgents: userAgents
    }
    
    allAgents = agentsResult.agents
  } catch (error) {
    console.error('Error loading user agents:', error)
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Users
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Assignments</h1>
            <p className="text-gray-600 mt-1">
              Manage agent access for {userData.user.firstName && userData.user.lastName 
                ? `${userData.user.firstName} ${userData.user.lastName}`
                : userData.user.email
              }
            </p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">
                {userData.user.firstName && userData.user.lastName 
                  ? `${userData.user.firstName} ${userData.user.lastName}`
                  : 'No name set'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{userData.user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-gray-900 capitalize">{userData.user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Agent Assignments ({userData.assignedAgents.length})</span>
          </CardTitle>
          <CardDescription>
            Assign and manage AI agents for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAgentManager 
            userId={userData.user.id}
            assignedAgents={userData.assignedAgents}
            availableAgents={allAgents}
          />
        </CardContent>
      </Card>
    </div>
  )
}