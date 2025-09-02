import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminNavigation } from '@/components/admin/AdminNavigation'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  // Redirect if not authenticated or not admin
  if (!session?.user) {
    redirect('/auth/signin')
  }
  
  if (session.user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={session.user} />
      <div className="flex">
        <AdminNavigation />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}