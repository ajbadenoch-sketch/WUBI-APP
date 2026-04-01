import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { formatMXN } from '../hooks/useFinanceData'
import type { Goal } from '../types/database'

const ICONOS = ['🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏥', '🎯', '💰', '🛍️', '📦']

type View = 'list' | 'create' | 'detail'

export default function Metas() {
  const user = useAuthStore((s) => s.user)
  const toast = useToastStore((s) => s.show)
  const [metas, setMetas] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selectedMeta, setSelectedMeta] = useState<Goal | null>(null)

  // Create form
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('🎯')
  const [montoObjetivo, setMontoObjetivo] = useState('')
  const [plazoMeses, setPlazoMeses] = useState('')

  // Aporte modal
  const [showAporte, setShowAporte] = useState(false)
  const [aporteAmount, setAporteAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMetas = async () => {
    if (!user) return
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: false })
    if (data) setMetas(data)
    setLoading(false)
  }

  useEffect(() => { fetchMetas() }, [user])

  const resetForm = () => {
    setNombre('')
    setCategoria('🎯')
    setMontoObjetivo('')
    setPlazoMeses('')
  }

  const handleCreate = async () => {
    if (!user || !nombre.trim() || !montoObjetivo || !plazoMeses) return
    setSaving(true)
    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      nombre: nombre.trim(),
      categoria,
      monto_objetivo: parseFloat(montoObjetivo),
      monto_actual: 0,
      plazo_meses: parseInt(plazoMeses),
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (error) { toast('Error al crear meta'); return }
    toast('Meta creada')
    resetForm()
    setView('list')
    fetchMetas()
  }

  const handleAporte = async () => {
    if (!selectedMeta || !aporteAmount) return
    const amount = parseFloat(aporteAmount)
    if (isNaN(amount) || amount <= 0) return
    setSaving(true)
    const newActual = Math.min(selectedMeta.monto_actual + amount, selectedMeta.monto_objetivo)
    const { error } = await supabase
      .from('goals')
      .update({ monto_actual: newActual })
      .eq('id', selectedMeta.id)
    setSaving(false)
    if (error) { toast('Error al registrar aporte'); return }
    toast(`Aporte de ${formatMXN(amount)} registrado`)
    setShowAporte(false)
    setAporteAmount('')
    setSelectedMeta({ ...selectedMeta, monto_actual: newActual })
    fetchMetas()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) { toast('Error al eliminar'); return }
    toast('Meta eliminada')
    setView('list')
    setSelectedMeta(null)
    fetchMetas()
  }

  const pct = (meta: Goal) => meta.monto_objetivo > 0
    ? Math.min((meta.monto_actual / meta.monto_objetivo) * 100, 100)
    : 0

  const mesesTranscurridos = (meta: Goal) => {
    const start = new Date(meta.fecha_inicio)
    const now = new Date()
    return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth())
  }

  const proyeccion = (meta: Goal) => {
    const elapsed = mesesTranscurridos(meta)
    if (meta.monto_actual <= 0) return null
    const rate = meta.monto_actual / elapsed
    const remaining = meta.monto_objetivo - meta.monto_actual
    return Math.ceil(remaining / rate)
  }

  // ─── LIST VIEW ───
  if (view === 'list') {
    return (
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>Metas</h1>
          <button
            onClick={() => { resetForm(); setView('create') }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: '#52B788' }}
          >+</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
          </div>
        ) : metas.length === 0 ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{ backgroundColor: '#EDE8DF' }}>
            <span className="text-3xl">🎯</span>
            <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
              Agrega tu primera meta financiera
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {metas.map((meta) => {
              const p = pct(meta)
              return (
                <button
                  key={meta.id}
                  onClick={() => { setSelectedMeta(meta); setView('detail') }}
                  className="w-full text-left rounded-2xl p-4"
                  style={{ backgroundColor: '#EDE8DF' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{meta.categoria}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1B4332' }}>{meta.nombre}</p>
                      <p className="text-xs" style={{ color: '#1B4332', opacity: 0.5 }}>
                        {formatMXN(meta.monto_actual)} de {formatMXN(meta.monto_objetivo)}
                      </p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: p >= 100 ? '#52B788' : '#1B4332' }}>
                      {p.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#D9D4CC' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p}%`, backgroundColor: p >= 100 ? '#52B788' : '#1B4332' }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── CREATE VIEW ───
  if (view === 'create') {
    const canSave = nombre.trim() && montoObjetivo && parseFloat(montoObjetivo) > 0 && plazoMeses && parseInt(plazoMeses) > 0
    return (
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-2xl" style={{ color: '#1B4332' }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>Nueva Meta</h1>
        </div>

        <div className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Viaje a Europa"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Icono */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#1B4332', opacity: 0.6 }}>Categoría</label>
            <div className="flex flex-wrap gap-2">
              {ICONOS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setCategoria(icon)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all"
                  style={{
                    backgroundColor: categoria === icon ? '#1B4332' : '#EDE8DF',
                    transform: categoria === icon ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Monto objetivo */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>Monto objetivo</label>
            <input
              type="number"
              inputMode="decimal"
              value={montoObjetivo}
              onChange={(e) => setMontoObjetivo(e.target.value)}
              placeholder="$0.00"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Plazo */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>Plazo (meses)</label>
            <input
              type="number"
              inputMode="numeric"
              value={plazoMeses}
              onChange={(e) => setPlazoMeses(e.target.value)}
              placeholder="12"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Ahorro mensual sugerido */}
          {montoObjetivo && plazoMeses && parseInt(plazoMeses) > 0 && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#1B4332' }}>
              <span className="text-xl">💡</span>
              <div>
                <p className="text-xs text-white/60">Ahorro mensual sugerido</p>
                <p className="text-lg font-bold text-white">
                  {formatMXN(parseFloat(montoObjetivo) / parseInt(plazoMeses))}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!canSave || saving}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity"
            style={{ backgroundColor: '#52B788', opacity: canSave && !saving ? 1 : 0.4 }}
          >
            {saving ? 'Guardando...' : 'Crear Meta'}
          </button>
        </div>
      </div>
    )
  }

  // ─── DETAIL VIEW ───
  if (view === 'detail' && selectedMeta) {
    const meta = selectedMeta
    const p = pct(meta)
    const proy = proyeccion(meta)
    const elapsed = mesesTranscurridos(meta)
    const sugerido = (meta.monto_objetivo - meta.monto_actual) / Math.max(1, meta.plazo_meses - elapsed)
    const startDate = new Date(meta.fecha_inicio)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + meta.plazo_meses)

    return (
      <div className="px-5 pt-14 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setView('list'); setSelectedMeta(null) }} className="text-2xl" style={{ color: '#1B4332' }}>←</button>
          <h1 className="text-xl font-bold flex-1 truncate" style={{ color: '#1B4332' }}>{meta.nombre}</h1>
          <button
            onClick={() => { if (confirm('¿Eliminar esta meta?')) handleDelete(meta.id) }}
            className="text-sm px-3 py-1 rounded-lg"
            style={{ color: '#E53E3E', backgroundColor: '#FED7D7' }}
          >Eliminar</button>
        </div>

        {/* Progress circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#D9D4CC" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={p >= 100 ? '#52B788' : '#1B4332'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - p / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl">{meta.categoria}</span>
              <span className="text-lg font-bold" style={{ color: '#1B4332' }}>{p.toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1B4332' }}>
            {formatMXN(meta.monto_actual)} <span style={{ opacity: 0.4 }}>de {formatMXN(meta.monto_objetivo)}</span>
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#EDE8DF' }}>
            <p className="text-xs mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Plazo</p>
            <p className="text-sm font-bold" style={{ color: '#1B4332' }}>{meta.plazo_meses} meses</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#EDE8DF' }}>
            <p className="text-xs mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Transcurridos</p>
            <p className="text-sm font-bold" style={{ color: '#1B4332' }}>{elapsed} meses</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#EDE8DF' }}>
            <p className="text-xs mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Ahorro sugerido/mes</p>
            <p className="text-sm font-bold" style={{ color: '#1B4332' }}>{sugerido > 0 ? formatMXN(sugerido) : '—'}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#EDE8DF' }}>
            <p className="text-xs mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Proyección restante</p>
            <p className="text-sm font-bold" style={{ color: proy !== null && proy <= meta.plazo_meses - elapsed ? '#52B788' : '#E53E3E' }}>
              {proy !== null ? `${proy} meses` : '—'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#EDE8DF' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#1B4332', opacity: 0.6 }}>Timeline</p>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#1B4332' }}>
              {startDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#D9D4CC' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((elapsed / meta.plazo_meses) * 100, 100)}%`,
                  backgroundColor: '#1B4332',
                }}
              />
            </div>
            <span className="text-xs" style={{ color: '#1B4332' }}>
              {endDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Aporte button */}
        <button
          onClick={() => { setAporteAmount(''); setShowAporte(true) }}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: '#52B788' }}
        >
          + Agregar Aporte
        </button>

        {/* Aporte modal */}
        {showAporte && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div
              className="w-full rounded-t-2xl p-5 pb-8"
              style={{ maxWidth: 430, backgroundColor: '#F5F0E8' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: '#1B4332' }}>Registrar Aporte</h3>
                <button onClick={() => setShowAporte(false)} className="text-xl" style={{ color: '#1B4332' }}>✕</button>
              </div>
              <p className="text-xs mb-3" style={{ color: '#1B4332', opacity: 0.5 }}>
                Faltan {formatMXN(meta.monto_objetivo - meta.monto_actual)} para completar tu meta
              </p>
              <input
                type="number"
                inputMode="decimal"
                value={aporteAmount}
                onChange={(e) => setAporteAmount(e.target.value)}
                placeholder="$0.00"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
                style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
              />
              <button
                onClick={handleAporte}
                disabled={!aporteAmount || parseFloat(aporteAmount) <= 0 || saving}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity"
                style={{ backgroundColor: '#52B788', opacity: aporteAmount && parseFloat(aporteAmount) > 0 && !saving ? 1 : 0.4 }}
              >
                {saving ? 'Guardando...' : 'Confirmar Aporte'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
