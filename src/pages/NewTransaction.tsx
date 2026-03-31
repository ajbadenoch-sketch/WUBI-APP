import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { GASTO_CATEGORIES, INGRESO_CATEGORIES } from '../types/categories'
import type { Account } from '../types/database'

type TipoTx = 'gasto' | 'ingreso'

export default function NewTransaction() {
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState<TipoTx>('gasto')
  const [monto, setMonto] = useState('0')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [saving, setSaving] = useState(false)

  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  useEffect(() => {
    if (!user) return
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAccounts(data)
          setAccountId(data[0].id)
        }
      })
  }, [user])

  const montoNum = parseFloat(monto) || 0

  const handleBack = () => {
    if (step === 1) navigate(-1)
    else setStep(step - 1)
  }

  const handleSave = async () => {
    if (!user || !accountId || !selectedCategoryId || montoNum <= 0) return
    setSaving(true)

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      tipo,
      monto: montoNum,
      categoria_id: selectedCategoryId,
      fecha,
      descripcion: descripcion.trim() || null,
      es_estimada: false,
      es_recurrente: false,
    })

    setSaving(false)

    if (error) {
      showToast('Error al guardar: ' + error.message)
      return
    }

    showToast('Transacción guardada')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#1B4332' }}>
          {step === 1 && 'Monto'}
          {step === 2 && 'Categoría'}
          {step === 3 && 'Detalles'}
        </h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>
          {step}/3
        </span>
      </div>

      {step === 1 && (
        <Step1Amount
          tipo={tipo}
          setTipo={(t) => { setTipo(t); setSelectedCategoryId(null) }}
          monto={monto}
          setMonto={setMonto}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2Category
          tipo={tipo}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3Details
          accounts={accounts}
          accountId={accountId}
          setAccountId={setAccountId}
          fecha={fecha}
          setFecha={setFecha}
          tipo={tipo}
          montoNum={montoNum}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

/* =============================================
   STEP 1 — Amount + Keypad
   ============================================= */

function Step1Amount({
  tipo,
  setTipo,
  monto,
  setMonto,
  onNext,
}: {
  tipo: TipoTx
  setTipo: (t: TipoTx) => void
  monto: string
  setMonto: (m: string) => void
  onNext: () => void
}) {
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
    // Limit to 2 decimal places
    const parts = monto.split('.')
    if (parts[1] && parts[1].length >= 2) return
    // Limit total digits
    if (monto.replace('.', '').length >= 10) return

    if (monto === '0' && key !== '.') {
      setMonto(key)
    } else {
      setMonto(monto + key)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Toggle Gasto / Ingreso */}
      <div className="flex mx-5 mt-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
        {(['gasto', 'ingreso'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
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
        <p className="text-sm font-medium mb-2" style={{ color: tipo === 'gasto' ? '#DC2626' : '#16A34A' }}>
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
              style={{
                backgroundColor: key === 'backspace' ? '#EDE8DF' : '#EDE8DF',
                color: '#1B4332',
              }}
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
          onClick={onNext}
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

/* =============================================
   STEP 2 — Category Selection
   ============================================= */

function Step2Category({
  tipo,
  selectedCategoryId,
  setSelectedCategoryId,
  descripcion,
  setDescripcion,
  onNext,
}: {
  tipo: TipoTx
  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void
  descripcion: string
  setDescripcion: (d: string) => void
  onNext: () => void
}) {
  const categories = tipo === 'gasto' ? GASTO_CATEGORIES : INGRESO_CATEGORIES

  return (
    <div className="flex-1 flex flex-col">
      {/* Category grid */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        <p className="text-xs font-medium mb-3" style={{ color: '#1B4332', opacity: 0.5 }}>
          Selecciona una categoría
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
                style={{
                  backgroundColor: isSelected ? 'rgba(82,183,136,0.15)' : '#EDE8DF',
                  border: isSelected ? '2px solid #52B788' : '2px solid transparent',
                }}
              >
                <span className="text-2xl">{cat.icono}</span>
                <span
                  className="text-[11px] font-medium text-center leading-tight"
                  style={{ color: isSelected ? '#1B4332' : 'rgba(27,67,50,0.6)' }}
                >
                  {cat.nombre}
                </span>
              </button>
            )
          })}
        </div>

        {/* Descripción */}
        <div className="mt-5">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Descripción (opcional)
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value.slice(0, 100))}
            placeholder="Ej: Café con amigos"
            maxLength={100}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              backgroundColor: '#EDE8DF',
              color: '#1B4332',
              border: '2px solid transparent',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#52B788')}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
          />
          <p className="text-[10px] text-right mt-1" style={{ color: '#1B4332', opacity: 0.3 }}>
            {descripcion.length}/100
          </p>
        </div>
      </div>

      {/* Continuar button — CRITICAL: disabled={!selectedCategoryId} */}
      <div className="px-5 pb-6 pt-2">
        <button
          onClick={onNext}
          disabled={!selectedCategoryId}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          style={{
            backgroundColor: selectedCategoryId ? '#52B788' : '#9CA3AF',
            color: 'white',
            boxShadow: selectedCategoryId ? '0 4px 16px rgba(82,183,136,0.4)' : 'none',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

/* =============================================
   STEP 3 — Final Details
   ============================================= */

function Step3Details({
  accounts,
  accountId,
  setAccountId,
  fecha,
  setFecha,
  tipo,
  montoNum,
  saving,
  onSave,
}: {
  accounts: Account[]
  accountId: string | null
  setAccountId: (id: string) => void
  fecha: string
  setFecha: (f: string) => void
  tipo: TipoTx
  montoNum: number
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5 pt-2 pb-4">
        {/* Summary card */}
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#1B4332' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
              {tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
            </span>
            <span className="text-2xl font-bold" style={{ color: '#F5F0E8' }}>
              {tipo === 'gasto' ? '-' : '+'}${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Account selector */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Cuenta
          </label>
          {accounts.length === 0 ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: '#EDE8DF', color: 'rgba(27,67,50,0.5)' }}
            >
              No tienes cuentas. Crea una en Cartera.
            </div>
          ) : (
            <select
              value={accountId || ''}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              style={{
                backgroundColor: '#EDE8DF',
                color: '#1B4332',
                border: '2px solid transparent',
              }}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nombre} — {acc.banco} (${acc.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date picker */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: '#EDE8DF',
              color: '#1B4332',
              border: '2px solid transparent',
            }}
          />
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 pb-6 pt-2">
        <button
          onClick={onSave}
          disabled={saving || !accountId}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#1B4332',
            color: '#F5F0E8',
            boxShadow: '0 4px 20px rgba(27,67,50,0.35)',
          }}
        >
          {saving ? (
            <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : null}
          {saving ? 'Guardando...' : 'Guardar transacción'}
        </button>
      </div>
    </div>
  )
}

/* =============================================
   Helpers
   ============================================= */

function formatMonto(raw: string): string {
  const parts = raw.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length === 2) {
    return intPart + '.' + parts[1]
  }
  return intPart
}
