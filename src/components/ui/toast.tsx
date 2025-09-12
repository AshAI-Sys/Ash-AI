// @ts-nocheck
'use client'

import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { Toast } from '@/hooks/use-toast'

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

export const ToastComponent = ({ toast, onRemove }: ToastProps) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div className={`p-4 rounded-lg border shadow-lg ${bgColor[toast.type]} animate-in slide-in-from-right-full duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <ToastIcon type={toast.type} />
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-medium text-gray-900">
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p className="text-sm text-gray-700 mt-1">
                {toast.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}