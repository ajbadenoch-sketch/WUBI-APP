import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '../stores/transactionStore'

type TipoTx = 'gasto' | 'ingreso'

export default function TransactionAmount() {
  const navigate = useNavigate()
  const { draft, setTipo, setMonto } = useTransactionStore()
  const { tipo, monto } = draft
  const montoNum = parseFloat(monto) || 0

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      setMonto(monto.length <= 1 ? '0' : monto.slice(0, -1))
      return
    }
    if (key === '.') {
      if (monto.includes('.')) return
      setMonto(monto + '.')
      return
    }
    const parts = monto.split('.')
    if (parts[1] && parts[1].length >= 2) return
    if (monto.replace('.', '').length >= 10) return
    if (monto === '0' && key !== '.') {
      setMonto(key)
    } else {
      setMonto(monto + key)
    }
  }

  const handleChangeTipo = (t: TipoTx) => {
    if (t !== tipo) setTipo(t)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#1B4332' }}>
          Registrar {tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
        </h1>
        {/* Camera icon placeholder */}
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
          aria-label="Escanear recibo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>
          1/3
        </span>
      </div>

      {/* Toggle Gasto / Ingreso */}
      <div className="flex mx-5 mt-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
        {(['gasto', 'ingreso'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleChangeTipo(t)}
            className="flex-1 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: tipo === t ? '#1B4332' : 'transparent',
              color: tipo === t ? '#F5F0E8' : '#1B4332',
              borderRadius: tipo === t ? '12px' : '0',
            }}
          >
            {t === 'gasto' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      {/* Monto display */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <p className="text-sm font-medium mb-2" style={{ color: tipo === 'gasto' ? '#E63946' : '#52B788' }}>
          {tipo === 'gasto' ? '- Gasto' : '+ Ingreso'}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold" style={{ color: '#1B4332' }}>$</span>
          <span
            className="font-bold tracking-tight"
            style={{
              color: '#1B4332',
              fontSize: monto.length > 8 ? '2.5rem' : '3.5rem',
              lineHeight: 1,
            }}
          >
            {formatMonto(monto)}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#1B4332', opacity: 0.4 }}>MXN</p>
      </div>

      {/* Keypad */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1','2','3','4','5','6','7','8','9','.','0','backspace'].map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="h-14 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            >
              {key === 'backspace' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : key}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/transaction/category')}
          disabled={montoNum <= 0}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          style={{
            backgroundColor: montoNum > 0 ? '#52B788' : '#9CA3AF',
            color: 'white',
            boxShadow: montoNum > 0 ? '0 4px 16px rgba(82,183,136,0.4)' : 'none',
          }}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

function formatMonto(raw: string): string {
  const parts = raw.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length === 2) return intPart + '.' + parts[1]
  return intPart
}
