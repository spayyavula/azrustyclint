import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-editor-accent border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  )
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

export function LoadingButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading: boolean }) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
