import { AdminNavigation } from '@/components/admin/AdminNavigation'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authentication is handled by middleware
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={{ name: "Administrator", email: "admin@example.com", role: "admin" }} />
      <div className="flex">
        <AdminNavigation />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}