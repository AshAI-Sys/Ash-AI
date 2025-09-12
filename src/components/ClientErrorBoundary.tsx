// @ts-nocheck
'use client'

import { ErrorBoundary } from './ErrorBoundary'
import { ReactNode } from 'react'

interface ClientErrorBoundaryProps {
  children: ReactNode
}

export default function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}