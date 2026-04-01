import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { formatMXN } from '../hooks/useFinanceData'
import type { Debt } from '../types/database'

type View = 'list' | 'create'
type Tab = 'te_deben' | 'debes'

export default function Deudas() {
  const user = useAuthStore((s) => s.user)
  const toast = useToastStore((s) => s.show)
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [tab, setTab] = useState<Tab>('te_deben')

  // Create form
  const [direction, setDirection] = useState<Tab>('te_deben')
  const [persona, setPersona] = useState('')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchDebts = async () => {
    if (!user) return
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_vencimiento', { ascending: true })
    if (data) setDebts(data)
    setLoading(false)
  }

  useEffect(() => { fetchDebts() }, [user])

  const userEmail = user?.email || ''

  // "Te deben" = user is acreedor (others owe me)
  const teDeben = debts.filter((d) => d.acreedor === userEmail || (d.acreedor === 'Yo' && d.user_id === user?.id))
  // "Debes" = user is deudor (I owe others)
  const debes = debts.filter((d) => d.deudor === userEmail || (d.deudor === 'Yo' && d.user_id === user?.id))
  // Fallback: if neither match, show based on direction logic
  const currentList = tab === 'te_deben' ? teDeben : debes

  const pendientes = currentList.filter((d) => !d.pagado)
  const pagadas = currentList.filter((d) => d.pagado)

  const totalPendiente = pendientes.reduce((s, d) => s + d.monto, 0)

  const isNearDue = (fecha: string) => {
    const diff = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && diff >= 0
  }

  const isOverdue = (fecha: string) => {
    return new Date(fecha).getTime() < Date.now()
  }

  const resetForm = () => {
    setDirection('te_deben')
    setPersona('')
    setMonto('')
    setConcepto('')
    setFechaVenc('')
  }

  const handleCreate = async () => {
    if (!user || !persona.trim() || !monto || !concepto.trim()) return
    setSaving(true)
    const row = {
      user_id: user.id,
      acreedor: direction === 'te_deben' ? (userEmail || 'Yo') : persona.trim(),
      deudor: direction === 'te_deben' ? persona.trim() : (userEmail || 'Yo'),
      monto: parseFloat(monto),
      concepto: concepto.trim(),
      fecha_vencimiento: fechaVenc || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      pagado: false,
    }
    const { error } = await supabase.from('debts').insert(row)
    setSaving(false)
    if (error) { toast('Error al crear deuda'); return }
    toast('Deuda registrada')
    resetForm()
    setView('list')
    fetchDebts()
  }

  const togglePaid = async (debt: Debt) => {
    const { error } = await supabase
      .from('debts')
      .update({ pagado: !debt.pagado })
      .eq('id', debt.id)
    if (error) { toast('Error al actualizar'); return }
    toast(debt.pagado ? 'Marcada como pendiente' : 'Marcada como pagada')
    fetchDebts()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) { toast('Error al eliminar'); return }
    toast('Deuda eliminada')
    fetchDebts()
  }

  // ─── CREATE VIEW ───
  if (view === 'create') {
    const canSave = persona.trim() && monto && parseFloat(monto) > 0 && concepto.trim()
    return (
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-2xl" style={{ color: '#1B4332' }}>←</button>
          <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>Nueva Deuda</h1>
        </div>

        <div className="space-y-5">
          {/* Direction toggle */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: '#1B4332', opacity: 0.6 }}>Dirección</label>
            <div className="flex gap-2">
              {([['te_deben', 'Me deben'], ['debes', 'Yo debo']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDirection(key)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: direction === key ? '#1B4332' : '#EDE8DF',
                    color: direction === key ? 'white' : '#1B4332',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Persona */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>
              {direction === 'te_deben' ? '¿Quién te debe?' : '¿A quién le debes?'}
            </label>
            <input
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Nombre o email"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>Monto</label>
            <input
              type="number"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="$0.00"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Concepto */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>Concepto</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Comida del viernes"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          {/* Fecha vencimiento */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#1B4332', opacity: 0.6 }}>
              Fecha de vencimiento (opcional)
            </label>
            <input
              type="date"
              value={fechaVenc}
              onChange={(e) => setFechaVenc(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!canSave || saving}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity"
            style={{ backgroundColor: '#52B788', opacity: canSave && !saving ? 1 : 0.4 }}
          >
            {saving ? 'Guardando...' : 'Registrar Deuda'}
          </button>
        </div>
      </div>
    )
  }

  // ─── LIST VIEW ───
  return (
    <div className="px-5 pt-14 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>Deudas</h1>
        <button
          onClick={() => { resetForm(); setView('create') }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ backgroundColor: '#52B788' }}
        >+</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([['te_deben', 'Te deben'], ['debes', 'Debes']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: tab === key ? '#1B4332' : '#EDE8DF',
              color: tab === key ? 'white' : '#1B4332',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {pendientes.length > 0 && (
        <div className="rounded-xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: '#1B4332' }}>
          <div>
            <p className="text-xs text-white/60">
              {tab === 'te_deben' ? 'Total por cobrar' : 'Total por pagar'}
            </p>
            <p className="text-xl font-bold text-white">{formatMXN(totalPendiente)}</p>
          </div>
          <span className="text-2xl">{tab === 'te_deben' ? '📥' : '📤'}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{ backgroundColor: '#EDE8DF' }}>
          <span className="text-3xl">{tab === 'te_deben' ? '📥' : '📤'}</span>
          <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
            {tab === 'te_deben' ? 'Nadie te debe por ahora' : 'No debes nada por ahora'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <>
              <p className="text-xs font-semibold mt-2 mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Pendientes</p>
              {pendientes.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  tab={tab}
                  isNearDue={isNearDue(debt.fecha_vencimiento)}
                  isOverdue={isOverdue(debt.fecha_vencimiento) && !debt.pagado}
                  onTogglePaid={() => togglePaid(debt)}
                  onDelete={() => { if (confirm('¿Eliminar esta deuda?')) handleDelete(debt.id) }}
                />
              ))}
            </>
          )}

          {/* Pagadas */}
          {pagadas.length > 0 && (
            <>
              <p className="text-xs font-semibold mt-4 mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>Pagadas</p>
              {pagadas.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  tab={tab}
                  isNearDue={false}
                  isOverdue={false}
                  onTogglePaid={() => togglePaid(debt)}
                  onDelete={() => { if (confirm('¿Eliminar esta deuda?')) handleDelete(debt.id) }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function DebtCard({
  debt, tab, isNearDue, isOverdue, onTogglePaid, onDelete,
}: {
  debt: Debt
  tab: Tab
  isNearDue: boolean
  isOverdue: boolean
  onTogglePaid: () => void
  onDelete: () => void
}) {
  const personLabel = tab === 'te_deben' ? debt.deudor : debt.acreedor
  const fechaStr = new Date(debt.fecha_vencimiento).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short',
  })

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        backgroundColor: debt.pagado ? '#E8E3DB' : '#EDE8DF',
        opacity: debt.pagado ? 0.7 : 1,
        borderLeft: isOverdue ? '4px solid #E53E3E' : isNearDue ? '4px solid #ED8936' : '4px solid transparent',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate" style={{ color: '#1B4332' }}>{personLabel}</p>
            {isOverdue && !debt.pagado && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FED7D7', color: '#E53E3E' }}>
                VENCIDA
              </span>
            )}
            {isNearDue && !debt.pagado && !isOverdue && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FEEBC8', color: '#C05621' }}>
                POR VENCER
              </span>
            )}
            {debt.pagado && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#C6F6D5', color: '#276749' }}>
                PAGADA
              </span>
            )}
          </div>
          <p className="text-xs mb-1" style={{ color: '#1B4332', opacity: 0.5 }}>{debt.concepto}</p>
          <p className="text-xs" style={{ color: '#1B4332', opacity: 0.4 }}>Vence: {fechaStr}</p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-3">
          <p className="text-base font-bold" style={{ color: '#1B4332' }}>{formatMXN(debt.monto)}</p>
          <div className="flex gap-1.5">
            <button
              onClick={onTogglePaid}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{
                backgroundColor: debt.pagado ? '#EDE8DF' : '#52B788',
                color: debt.pagado ? '#1B4332' : 'white',
              }}
            >
              {debt.pagado ? 'Deshacer' : 'Pagada'}
            </button>
            <button
              onClick={onDelete}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: '#E53E3E', backgroundColor: '#FED7D7' }}
            >✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}
