import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { formatMXN } from '../hooks/useFinanceData'

interface Split {
  id: string
  workspace_id: string
  titulo: string
  monto_total: number
  tipo_division: 'igual' | 'porcentaje' | 'monto'
  estado: 'pendiente' | 'parcial' | 'completado'
}

interface SplitParticipant {
  id: string
  split_id: string
  user_id: string
  monto: number
  pagado: boolean
}

interface Participant {
  email: string
  userId: string | null
  nombre: string
}

type Division = 'igual' | 'porcentaje' | 'monto'

export default function Grupos() {
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)
  const [splits, setSplits] = useState<(Split & { participants: SplitParticipant[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchSplits = useCallback(async () => {
    if (!user) return
    const { data: parts } = await supabase
      .from('split_participants')
      .select('split_id')
      .eq('user_id', user.id)

    if (!parts || parts.length === 0) {
      setSplits([])
      setLoading(false)
      return
    }

    const splitIds = [...new Set(parts.map((p) => p.split_id))]
    const { data: splitsData } = await supabase
      .from('splits')
      .select('*')
      .in('id', splitIds)
      .order('id', { ascending: false })

    if (!splitsData) { setLoading(false); return }

    const { data: allParts } = await supabase
      .from('split_participants')
      .select('*')
      .in('split_id', splitIds)

    const result = splitsData.map((s) => ({
      ...s,
      participants: (allParts || []).filter((p) => p.split_id === s.id),
    }))

    setSplits(result)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSplits() }, [fetchSplits])

  return (
    <div className="px-5 pt-12 pb-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>Grupos</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#52B788', boxShadow: '0 4px 12px rgba(82,183,136,0.35)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
        </div>
      ) : splits.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{ backgroundColor: '#EDE8DF' }}>
          <span className="text-3xl">👥</span>
          <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Sin splits aún</p>
          <p className="text-xs text-center" style={{ color: '#1B4332', opacity: 0.35 }}>Toca + para dividir un gasto con amigos</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {splits.map((s) => {
            const paid = s.participants.filter((p) => p.pagado).length
            const total = s.participants.length
            return (
              <div key={s.id} className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: '#1B4332' }}>{s.titulo}</p>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                    style={{
                      backgroundColor: s.estado === 'completado' ? '#DCFCE7' : s.estado === 'parcial' ? '#FEF3C7' : '#FEE2E2',
                      color: s.estado === 'completado' ? '#166534' : s.estado === 'parcial' ? '#92400E' : '#991B1B',
                    }}
                  >
                    {s.estado.toUpperCase()}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ color: '#1B4332' }}>{formatMXN(s.monto_total)}</p>
                <p className="text-[10px] mt-1" style={{ color: '#1B4332', opacity: 0.4 }}>
                  {paid}/{total} pagados · División {s.tipo_division}
                </p>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
                  <div className="h-full rounded-full" style={{ width: `${(paid / total) * 100}%`, backgroundColor: '#52B788' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateSplitFlow
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); fetchSplits(); showToast('Split creado') }}
        />
      )}
    </div>
  )
}

/* =============================================
   3-Step CreateSplit Flow
   ============================================= */

function CreateSplitFlow({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  const [step, setStep] = useState(1)
  const [titulo, setTitulo] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [tipoDivision, setTipoDivision] = useState<Division>('igual')
  const [contexto, setContexto] = useState('')

  const [searchEmail, setSearchEmail] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [saving, setSaving] = useState(false)

  // Auto-add current user
  useEffect(() => {
    if (user) {
      setParticipants([{ email: user.email || '', userId: user.id, nombre: 'Tú' }])
    }
  }, [user])

  const monto = parseFloat(montoTotal) || 0
  const montoPerPerson = participants.length > 0 && tipoDivision === 'igual'
    ? monto / participants.length
    : 0

  const addParticipant = () => {
    const email = searchEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (participants.some((p) => p.email === email)) {
      showToast('Participante ya agregado')
      return
    }
    setParticipants([...participants, { email, userId: null, nombre: email.split('@')[0] }])
    setSearchEmail('')
  }

  const removeParticipant = (email: string) => {
    if (email === user?.email) return // Can't remove self
    setParticipants(participants.filter((p) => p.email !== email))
  }

  const handleCreate = async () => {
    if (!user || monto <= 0 || participants.length < 2) return
    setSaving(true)

    // Create split
    const { data: split, error: splitErr } = await supabase
      .from('splits')
      .insert({
        workspace_id: user.id,
        titulo,
        monto_total: monto,
        tipo_division: tipoDivision,
        estado: 'pendiente',
      })
      .select()
      .single()

    if (splitErr || !split) {
      showToast('Error: ' + (splitErr?.message || 'No se pudo crear'))
      setSaving(false)
      return
    }

    // Create participants
    const partRows = participants.map((p) => ({
      split_id: split.id,
      user_id: p.userId || user.id,
      monto: tipoDivision === 'igual' ? monto / participants.length : 0,
      pagado: false,
    }))

    const { error: partErr } = await supabase.from('split_participants').insert(partRows)

    if (partErr) {
      showToast('Error participantes: ' + partErr.message)
      setSaving(false)
      return
    }

    // Generate debts between participants (everyone owes the creator)
    const debtRows = participants
      .filter((p) => p.userId !== user.id && p.email !== user.email)
      .map((p) => ({
        user_id: user.id,
        acreedor: user.email || 'Yo',
        deudor: p.email,
        monto: tipoDivision === 'igual' ? monto / participants.length : 0,
        concepto: titulo,
        fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        pagado: false,
      }))

    if (debtRows.length > 0) {
      await supabase.from('debts').insert(debtRows)
    }

    setSaving(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl px-5 pt-6 pb-8 animate-[slideUp_0.3s_ease-out]"
        style={{ backgroundColor: '#F5F0E8', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: '#D4CFC7' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#1B4332' }}>
            {step === 1 && 'Nuevo Split'}
            {step === 2 && 'Participantes'}
            {step === 3 && 'Resumen'}
          </h2>
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>{step}/3</span>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <Field label="Título" value={titulo} onChange={setTitulo} placeholder="Ej: Cena del viernes" />
            <Field label="Monto total" value={montoTotal} onChange={setMontoTotal} placeholder="0.00" type="number" prefix="$" />

            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>Tipo de división</label>
            <div className="flex gap-2 mb-4">
              {([
                { key: 'igual' as Division, label: 'Igual', icon: '⚖️' },
                { key: 'porcentaje' as Division, label: '%', icon: '📊' },
                { key: 'monto' as Division, label: 'Monto', icon: '💰' },
              ]).map((d) => (
                <button
                  key={d.key}
                  onClick={() => setTipoDivision(d.key)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95"
                  style={{
                    backgroundColor: tipoDivision === d.key ? '#1B4332' : '#EDE8DF',
                    color: tipoDivision === d.key ? '#F5F0E8' : '#1B4332',
                  }}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>

            <Field label="Contexto (opcional)" value={contexto} onChange={setContexto} placeholder="Notas adicionales" />

            <button
              onClick={() => setStep(2)}
              disabled={!titulo.trim() || monto <= 0}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold mt-2 transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: '#52B788', color: 'white' }}
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>Buscar por email</label>
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addParticipant() }}
                placeholder="amigo@email.com"
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
              />
              <button
                onClick={addParticipant}
                className="px-4 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                style={{ backgroundColor: '#1B4332', color: '#F5F0E8' }}
              >
                Agregar
              </button>
            </div>

            <p className="text-xs font-medium mb-2" style={{ color: '#1B4332', opacity: 0.5 }}>
              Participantes ({participants.length})
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {participants.map((p) => (
                <div key={p.email} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'white' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#52B788', color: 'white' }}>
                    {p.nombre[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#1B4332' }}>{p.nombre}</p>
                    <p className="text-[10px] truncate" style={{ color: '#1B4332', opacity: 0.4 }}>{p.email}</p>
                  </div>
                  {tipoDivision === 'igual' && montoPerPerson > 0 && (
                    <span className="text-xs font-bold" style={{ color: '#1B4332' }}>{formatMXN(montoPerPerson)}</span>
                  )}
                  {p.email !== user?.email && (
                    <button onClick={() => removeParticipant(p.email)} className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#FEE2E2' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {participants.length < 2 && (
              <p className="text-[10px] text-center mb-3" style={{ color: '#F59E0B' }}>
                Agrega al menos 2 participantes para continuar
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>Atrás</button>
              <button
                onClick={() => setStep(3)}
                disabled={participants.length < 2}
                className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: '#52B788', color: 'white' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#1B4332' }}>
              <p className="text-lg font-bold" style={{ color: '#F5F0E8' }}>{titulo}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#F5F0E8' }}>{formatMXN(monto)}</p>
              <p className="text-[10px] mt-1" style={{ color: 'rgba(245,240,232,0.4)' }}>
                División {tipoDivision} · {participants.length} participantes
              </p>
              {contexto && <p className="text-xs mt-2" style={{ color: 'rgba(245,240,232,0.6)' }}>{contexto}</p>}
            </div>

            <p className="text-xs font-medium mb-2" style={{ color: '#1B4332', opacity: 0.5 }}>Desglose</p>
            <div className="flex flex-col gap-1.5 mb-5">
              {participants.map((p) => (
                <div key={p.email} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: 'white' }}>
                  <span className="text-xs font-medium" style={{ color: '#1B4332' }}>{p.nombre}</span>
                  <span className="text-xs font-bold" style={{ color: '#1B4332' }}>{formatMXN(montoPerPerson)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl text-sm font-semibold active:scale-95" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>Atrás</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1B4332', color: '#F5F0E8' }}
              >
                {saving && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                {saving ? 'Creando...' : 'Crear Split'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* =============================================
   Shared Field
   ============================================= */

function Field({ label, value, onChange, placeholder, type = 'text', prefix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; prefix?: string
}) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>{prefix}</span>}
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{ backgroundColor: '#EDE8DF', color: '#1B4332', paddingLeft: prefix ? '2rem' : undefined }}
        />
      </div>
    </div>
  )
}
