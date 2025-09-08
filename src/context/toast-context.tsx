'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useToast, Toast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  toast: {
    success: (message: string, title?: string) => void
    error: (message: string, title?: string) => void
    warning: (message: string, title?: string) => void
    info: (message: string, title?: string) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { toasts, addToast, removeToast, clearToasts } = useToast()

  const toast = {
    success: (message: string, title?: string) => 
      addToast({ type: 'success', description: message, title }),
    error: (message: string, title?: string) => 
      addToast({ type: 'error', description: message, title }),
    warning: (message: string, title?: string) => 
      addToast({ type: 'warning', description: message, title }),
    info: (message: string, title?: string) => 
      addToast({ type: 'info', description: message, title }),
  }

  return (
    <ToastContext.Provider value={{ 
      toasts, 
      addToast, 
      removeToast, 
      clearToasts, 
      toast 
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}