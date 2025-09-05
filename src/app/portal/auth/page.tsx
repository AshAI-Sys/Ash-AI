'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PortalAuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Invalid authentication link')
      return
    }

    // Validate token and establish session
    validateAndLogin(token)
  }, [searchParams])

  const validateAndLogin = async (token: string) => {
    try {
      const response = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Login successful! Redirecting to your orders...')
        
        // Store client session (in production, use httpOnly cookies)
        localStorage.setItem('client_session', JSON.stringify({
          client_id: data.client_id,
          workspace_id: data.workspace_id,
          expires_at: data.expires_at
        }))

        // Redirect to orders page
        setTimeout(() => {
          router.push('/portal/orders')
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Authentication failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            ASH AI Client Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Secure authentication in progress
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Verifying your access...</p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="mt-4 text-sm text-green-600 font-medium">{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div>
                <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <p className="mt-4 text-sm text-red-600 font-medium">{message}</p>
                <button
                  onClick={() => router.push('/portal/request-access')}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Request New Access Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PortalAuth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <PortalAuthContent />
    </Suspense>
  )
}