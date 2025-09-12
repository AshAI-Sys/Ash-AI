// @ts-nocheck
'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface POItem {
  id: string
  poNumber: string
  company: string
  design: string
  quantity: number
  status: 'Graphic Editing' | 'Material Preparation' | 'Screen Making' | 'Printing' | 'Sewing' | 'Finishing' | 'Cancelled'
  createdAt: string
}

const mockData: POItem[] = [
  { id: '1', poNumber: '020325', company: 'REVEL', design: 'HOODIE – ROYAL BLUE', quantity: 30, status: 'Material Preparation', createdAt: '2024-09-10' },
  { id: '2', poNumber: '020321', company: 'REEFER', design: 'STAY SWEET', quantity: 55, status: 'Printing', createdAt: '2024-09-10' },
  { id: '3', poNumber: '020316', company: 'REEFER CLOTHING', design: 'BLOOM', quantity: 0, status: 'Cancelled', createdAt: '2024-09-09' },
  { id: '4', poNumber: '020315', company: 'SORBETES', design: 'SUMMER VIBES TEE', quantity: 25, status: 'Sewing', createdAt: '2024-09-09' },
  { id: '5', poNumber: '020314', company: 'REVEL', design: 'BASIC WHITE TEE', quantity: 100, status: 'Finishing', createdAt: '2024-09-08' },
  { id: '6', poNumber: '020313', company: 'REEFER', design: 'GRAPHIC HOODIE', quantity: 45, status: 'Screen Making', createdAt: '2024-09-08' },
  { id: '7', poNumber: '020312', company: 'SORBETES', design: 'POLO SHIRT', quantity: 75, status: 'Graphic Editing', createdAt: '2024-09-07' },
  { id: '8', poNumber: '020311', company: 'REVEL', design: 'JOGGERS – NAVY', quantity: 40, status: 'Material Preparation', createdAt: '2024-09-07' },
  { id: '9', poNumber: '020310', company: 'REEFER CLOTHING', design: 'TANK TOP', quantity: 60, status: 'Printing', createdAt: '2024-09-06' },
  { id: '10', poNumber: '020309', company: 'SORBETES', design: 'CROP TOP', quantity: 35, status: 'Sewing', createdAt: '2024-09-06' },
  { id: '11', poNumber: '020308', company: 'REVEL', design: 'OVERSIZED TEE', quantity: 80, status: 'Finishing', createdAt: '2024-09-05' },
  { id: '12', poNumber: '020307', company: 'REEFER', design: 'VINTAGE WASH', quantity: 20, status: 'Screen Making', createdAt: '2024-09-05' },
]

const statusColors = {
  'Graphic Editing': 'bg-gray-100 text-gray-700 border-gray-200',
  'Material Preparation': 'bg-orange-100 text-orange-700 border-orange-200',
  'Screen Making': 'bg-blue-100 text-blue-700 border-blue-200',
  'Printing': 'bg-green-100 text-green-700 border-green-200',
  'Sewing': 'bg-purple-100 text-purple-700 border-purple-200',
  'Finishing': 'bg-teal-100 text-teal-700 border-teal-200',
  'Cancelled': 'bg-red-100 text-red-700 border-red-200'
}

const statusEmojis = {
  'Graphic Editing': '⚫',
  'Material Preparation': '🟧',
  'Screen Making': '🟦',
  'Printing': '🟩',
  'Sewing': '🟪',
  'Finishing': '🟫',
  'Cancelled': '🟥'
}

const filterOptions = [
  { value: 'all', label: 'All Fields' },
  { value: 'poNumber', label: 'PO #' },
  { value: 'design', label: 'Design Name' },
  { value: 'company', label: 'Clothing/Company' },
  { value: 'status', label: 'Status' }
]

export function POList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const itemsPerPage = 10

  const filteredData = useMemo(() => {
    if (!searchTerm) return mockData
    
    return mockData.filter(item => {
      const searchLower = searchTerm.toLowerCase()
      
      if (filterBy === 'all') {
        return (
          item.poNumber.toLowerCase().includes(searchLower) ||
          item.company.toLowerCase().includes(searchLower) ||
          item.design.toLowerCase().includes(searchLower) ||
          item.status.toLowerCase().includes(searchLower)
        )
      } else {
        const fieldValue = item[filterBy as keyof POItem]
        return fieldValue?.toString().toLowerCase().includes(searchLower)
      }
    })
  }, [searchTerm, filterBy])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const selectedFilter = filterOptions.find(option => option.value === filterBy)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Orders</h1>
          <p className="text-gray-600">Manage and track all your purchase orders</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search purchase orders..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors duration-200 min-w-[180px] justify-between"
              >
                <span className="text-sm font-medium text-gray-700">
                  By: {selectedFilter?.label}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterBy(option.value)
                        setIsDropdownOpen(false)
                        setCurrentPage(1)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                        filterBy === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                      } ${option === filterOptions[0] ? 'rounded-t-xl' : ''} ${
                        option === filterOptions[filterOptions.length - 1] ? 'rounded-b-xl' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">PO #</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Clothing/Company</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Design</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Qty</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6">
                      <Link 
                        href={`/orders/${item.poNumber}`}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                      >
                        {item.poNumber}
                      </Link>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-900 font-medium">{item.company}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-700">{item.design}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-medium ${item.quantity === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusColors[item.status]}`}>
                        <span className="text-xs">{statusEmojis[item.status]}</span>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg">No purchase orders found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center text-sm text-gray-600">
                <span>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
                  {filteredData.length} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 hover:bg-white text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}