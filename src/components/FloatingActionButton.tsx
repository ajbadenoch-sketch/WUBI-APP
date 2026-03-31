import { useNavigate } from 'react-router-dom'

export default function FloatingActionButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/transaction/new')}
      className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90"
      style={{
        backgroundColor: '#52B788',
        boxShadow: '0 6px 24px rgba(82,183,136,0.45)',
        right: 'max(16px, calc((100vw - 430px) / 2 + 16px))',
      }}
      aria-label="Nueva transacción"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
