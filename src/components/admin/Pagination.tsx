'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
}

function PaginationContent({ currentPage, totalPages, totalItems }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    return `/admin/users?${params.toString()}`
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(createPageUrl(page))
    }
  }

  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * 50 + 1
  const endItem = Math.min(currentPage * 50, totalItems)

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {/* First page */}
          {currentPage > 3 && (
            <>
              <Button
                variant={currentPage === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(1)}
              >
                1
              </Button>
              {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
            </>
          )}
          
          {/* Pages around current page */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
            const page = startPage + i
            
            if (page > totalPages) return null
            
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            )
          })}
          
          {/* Last page */}
          {currentPage < totalPages - 2 && (
            <>
              {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
              <Button
                variant={currentPage === totalPages ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export function Pagination(props: PaginationProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-gray-700">Loading pagination...</div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    }>
      <PaginationContent {...props} />
    </Suspense>
  )
}