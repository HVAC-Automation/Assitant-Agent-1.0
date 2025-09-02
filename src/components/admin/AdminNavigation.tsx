'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  Bot, 
  BarChart3, 
  Settings, 
  Home,
  UserCog,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    name: 'Overview',
    href: '/admin',
    icon: Home,
    description: 'Dashboard overview and analytics'
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage users, roles, and permissions'
  },
  {
    name: 'Agent Management',
    href: '/admin/agents',
    icon: Bot,
    description: 'Configure and monitor AI agents'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Usage statistics and reports'
  },
  {
    name: 'User Activity',
    href: '/admin/activity',
    icon: Activity,
    description: 'Monitor user sessions and activity'
  },
  {
    name: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Application configuration'
  },
]

export function AdminNavigation() {
  const pathname = usePathname()
  
  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <div>{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      
      <div className="border-t border-gray-200 p-4 mt-auto">
        <div className="text-xs text-gray-500">
          <p className="font-semibold">AI Assistant Admin</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </nav>
  )
}