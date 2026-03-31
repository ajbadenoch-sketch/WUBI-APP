import { useToastStore } from '../stores/toastStore'

export default function Toast() {
  const { message, visible } = useToastStore()

  if (!visible || !message) return null

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] max-w-[400px] w-[calc(100%-40px)]">
      <div
        className="rounded-2xl px-5 py-3.5 text-sm font-medium text-center shadow-lg animate-[fadeInDown_0.3s_ease-out]"
        style={{
          backgroundColor: '#1B4332',
          color: '#F5F0E8',
          boxShadow: '0 8px 32px rgba(27,67,50,0.35)',
        }}
      >
        {message}
      </div>
    </div>
  )
}
