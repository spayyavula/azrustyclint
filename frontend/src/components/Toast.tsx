import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'
import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

// Helper functions
export const toast = {
  success: (message: string) => useToastStore.getState().addToast('success', message),
  error: (message: string) => useToastStore.getState().addToast('error', message),
  info: (message: string) => useToastStore.getState().addToast('info', message),
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-lg border bg-editor-sidebar px-4 py-3 shadow-lg',
        toast.type === 'success' && 'border-green-500/30',
        toast.type === 'error' && 'border-red-500/30',
        toast.type === 'info' && 'border-blue-500/30'
      )}
    >
      {icons[toast.type]}
      <span className="text-sm">{toast.message}</span>
      <button onClick={onClose} className="ml-2 rounded p-1 hover:bg-editor-active">
        <X size={14} />
      </button>
    </div>
  )
}
