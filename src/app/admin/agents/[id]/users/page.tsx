import { AgentManager } from '@/lib/agent-management'
import { UserManager } from '@/lib/user-management'
import { AgentUserManager } from '@/components/admin/AgentUserManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bot, Users } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function AgentUsersPage({ params }: Props) {
  let agentData
  let allUsers
  
  try {
    // Get agent details
    const agent = await AgentManager.getAgentById(params.id)
    if (!agent) {
      notFound()
    }

    // Get all users and their agent assignments
    const usersResult = await UserManager.listUsers(1, 1000)
    const usersWithAssignments = []

    for (const user of usersResult.users) {
      const userAgents = await AgentManager.getUserAgents(user.id)
      const hasAgent = userAgents.some(ua => ua.id === params.id)
      const isDefault = userAgents.find(ua => ua.id === params.id)?.isDefault || false

      usersWithAssignments.push({
        ...user,
        hasAgent,
        isDefault
      })
    }
    
    agentData = {
      agent,
      assignedUsers: usersWithAssignments.filter(u => u.hasAgent),
      totalUsers: usersWithAssignments.length
    }
    
    allUsers = usersWithAssignments
  } catch (error) {
    console.error('Error loading agent users:', error)
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/agents">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Agents
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Access</h1>
            <p className="text-gray-600 mt-1">
              Manage user access for agent "{agentData.agent.name}"
            </p>
          </div>
        </div>
      </div>

      {/* Agent Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Agent Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900 font-medium">{agentData.agent.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ElevenLabs ID</label>
              <p className="text-gray-900 font-mono text-sm">
                {agentData.agent.elevenLabsAgentId}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div>
                <Badge variant={agentData.agent.isActive ? 'default' : 'secondary'}>
                  {agentData.agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Assigned Users</label>
              <p className="text-gray-900 font-medium">
                {agentData.assignedUsers.length} of {agentData.totalUsers}
              </p>
            </div>
          </div>
          {agentData.agent.description && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-gray-900 mt-1">{agentData.agent.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Access Management</span>
          </CardTitle>
          <CardDescription>
            Control which users have access to this agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentUserManager 
            agentId={agentData.agent.id}
            agentName={agentData.agent.name}
            allUsers={allUsers}
          />
        </CardContent>
      </Card>
    </div>
  )
}