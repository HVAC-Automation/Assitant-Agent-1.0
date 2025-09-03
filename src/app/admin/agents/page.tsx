import { AgentManager } from '@/lib/agent-management'
import { AgentTable } from '@/components/admin/AgentTable'
import { AgentDiscovery } from '@/components/admin/AgentDiscovery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Plus } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  search?: string
  isActive?: string
  page?: string
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  let agentsData
  try {
    const page = parseInt(searchParams.page || '1')
    const search = searchParams.search || ''
    const isActive = searchParams.isActive === 'true' ? true : searchParams.isActive === 'false' ? false : undefined
    
    // Get agents with pagination and filters
    agentsData = await AgentManager.listAgents(page, 50, { search, isActive })
  } catch (error) {
    // Handle case where database might not be available during build
    agentsData = { agents: [], total: 0, page: 1, totalPages: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-600 mt-1">
            Manage ElevenLabs agents, configurations, and assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
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

      {/* Agent Discovery Quick Access */}
      <AgentDiscovery />

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Agents ({agentsData.total})</CardTitle>
          <CardDescription>
            View and manage all agents in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentTable agents={agentsData.agents} />
        </CardContent>
      </Card>
    </div>
  )
}