'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { toast } from 'sonner'

interface ToastContextType {
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
  warning: (message: string, description?: string) => void
  loading: (message: string) => void
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => Promise<T>
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const success = (message: string, description?: string) => {
    toast.success(message, { description })
  }

  const error = (message: string, description?: string) => {
    toast.error(message, { description })
  }

  const info = (message: string, description?: string) => {
    toast.info(message, { description })
  }

  const warning = (message: string, description?: string) => {
    toast.warning(message, { description })
  }

  const loading = (message: string) => {
    toast.loading(message)
  }

  const promise = async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ): Promise<T> => {
    return toast.promise(promise, messages)
  }

  const value: ToastContextType = {
    success,
    error,
    info,
    warning,
    loading,
    promise
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}