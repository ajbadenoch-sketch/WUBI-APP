import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  useFinanceData,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  filterByDateRange, sumByTipo, formatMXN,
  WEEKDAYS_SHORT, MONTHS,
} from '../hooks/useFinanceData'
import { GASTO_CATEGORIES, INGRESO_CATEGORIES } from '../types/categories'
import { useToastStore } from '../stores/toastStore'
import type { Transaction } from '../types/database'

type Tab = 'mes' | 'semana' | 'proximos'

const allCats = [...GASTO_CATEGORIES, ...INGRESO_CATEGORIES]
function getCat(id: string | null) {
  if (!id) return { icono: '💸', nombre: 'Sin categoría' }
  return allCats.find((c) => c.id === id) || { icono: '💸', nombre: 'Otra' }
}

export default function Calendario() {
  const [tab, setTab] = useState<Tab>('mes')
  const navigate = useNavigate()
  const data = useFinanceData()

  if (data.loading) {
    return (
      <div className="flex justify-center pt-32">
        <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>Calendario</h1>
        <button
          onClick={() => navigate('/transaction/new')}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#52B788', boxShadow: '0 4px 12px rgba(82,183,136,0.35)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: 'mes' as Tab, label: 'Mes' },
          { key: 'semana' as Tab, label: 'Semana' },
          { key: 'proximos' as Tab, label: 'Próximos' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === t.key ? '#1B4332' : '#EDE8DF',
              color: tab === t.key ? '#F5F0E8' : '#1B4332',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mes' && <TabMes transactions={data.transactions} />}
      {tab === 'semana' && <TabSemana transactions={data.transactions} />}
      {tab === 'proximos' && <TabProximos transactions={data.transactions} refresh={data.refresh} />}
    </div>
  )
}

/* =============================================
   TAB MES — Monthly Calendar
   ============================================= */

function TabMes({ transactions }: { transactions: Transaction[] }) {
  const [refDate, setRefDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const monthStart = startOfMonth(refDate)
  const monthEnd = endOfMonth(refDate)
  const monthTxs = useMemo(() => filterByDateRange(transactions, monthStart, monthEnd), [transactions, monthStart, monthEnd])

  const ingresos = sumByTipo(monthTxs, 'ingreso')
  const gastos = sumByTipo(monthTxs, 'gasto')

  // Build transaction map by date string
  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    monthTxs.forEach((t) => {
      const arr = map.get(t.fecha) || []
      arr.push(t)
      map.set(t.fecha, arr)
    })
    return map
  }, [monthTxs])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = refDate.getFullYear()
    const month = refDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const offset = firstDay === 0 ? 6 : firstDay - 1 // Monday start
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: (number | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [refDate])

  const todayStr = new Date().toISOString().split('T')[0]
  const selectedTxs = selectedDay ? (txByDate.get(selectedDay) || []) : []

  return (
    <div>
      {/* Month summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#52B788' }}>Ingresos</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: '#52B788' }}>{formatMXN(ingresos)}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#E63946' }}>Gastos</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: '#E63946' }}>{formatMXN(gastos)}</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Eventos</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: '#1B4332' }}>{monthTxs.length}</p>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1))} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm font-semibold" style={{ color: '#1B4332' }}>
          {MONTHS[refDate.getMonth()]} {refDate.getFullYear()}
        </span>
        <button onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1))} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: '#1B4332', opacity: 0.4 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-4">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="h-10" />
          const dateStr = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayTxs = txByDate.get(dateStr) || []
          const hasGasto = dayTxs.some((t) => t.tipo === 'gasto')
          const hasIngreso = dayTxs.some((t) => t.tipo === 'ingreso')
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              className="h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
              style={{
                backgroundColor: isSelected ? '#1B4332' : isToday ? 'rgba(82,183,136,0.15)' : 'transparent',
              }}
            >
              <span className="text-xs font-medium" style={{ color: isSelected ? '#F5F0E8' : '#1B4332' }}>
                {day}
              </span>
              <div className="flex gap-0.5 h-1">
                {hasGasto && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#FCA5A5' : '#E63946' }} />}
                {hasIngreso && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#86EFAC' : '#52B788' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="animate-[fadeInDown_0.2s_ease-out]">
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#1B4332' }}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {selectedTxs.length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#EDE8DF' }}>
              <p className="text-xs" style={{ color: '#1B4332', opacity: 0.5 }}>Sin transacciones este día</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* =============================================
   TAB SEMANA — Weekly View
   ============================================= */

function TabSemana({ transactions }: { transactions: Transaction[] }) {
  const [refDate, setRefDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0])

  const weekStart = startOfWeek(refDate)
  const weekEnd = endOfWeek(refDate)

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }, [weekStart])

  const todayStr = new Date().toISOString().split('T')[0]
  const weekTxs = useMemo(() => filterByDateRange(transactions, weekStart, weekEnd), [transactions, weekStart, weekEnd])

  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    weekTxs.forEach((t) => {
      const arr = map.get(t.fecha) || []
      arr.push(t)
      map.set(t.fecha, arr)
    })
    return map
  }, [weekTxs])

  const selectedTxs = txByDate.get(selectedDay) || []

  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => { const d = new Date(refDate); d.setDate(d.getDate() - 7); setRefDate(d) }} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-xs font-semibold" style={{ color: '#1B4332' }}>
          {weekStart.getDate()} – {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]}
        </span>
        <button onClick={() => { const d = new Date(refDate); d.setDate(d.getDate() + 7); setRefDate(d) }} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
        </button>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((dateStr, i) => {
          const day = parseInt(dateStr.split('-')[2])
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay
          const dayTxs = txByDate.get(dateStr) || []
          const hasGasto = dayTxs.some((t) => t.tipo === 'gasto')
          const hasIngreso = dayTxs.some((t) => t.tipo === 'ingreso')

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(dateStr)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all active:scale-90"
              style={{
                backgroundColor: isSelected ? '#1B4332' : isToday ? 'rgba(82,183,136,0.15)' : '#EDE8DF',
              }}
            >
              <span className="text-[10px] font-medium" style={{ color: isSelected ? 'rgba(245,240,232,0.6)' : '#1B4332', opacity: isSelected ? 1 : 0.4 }}>
                {WEEKDAYS_SHORT[i]}
              </span>
              <span className="text-sm font-bold" style={{ color: isSelected ? '#F5F0E8' : '#1B4332' }}>{day}</span>
              <div className="flex gap-0.5 h-1">
                {hasGasto && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#FCA5A5' : '#E63946' }} />}
                {hasIngreso && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#86EFAC' : '#52B788' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Transactions for selected day */}
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#1B4332' }}>
        {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>
      {selectedTxs.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#EDE8DF' }}>
          <span className="text-2xl block mb-1">📅</span>
          <p className="text-xs" style={{ color: '#1B4332', opacity: 0.5 }}>Sin transacciones este día</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {selectedTxs.map((tx) => <TxRow key={tx.id} tx={tx} />)}
        </div>
      )}
    </div>
  )
}

/* =============================================
   TAB PRÓXIMOS — Next 30 days estimated
   ============================================= */

function TabProximos({ transactions, refresh }: { transactions: Transaction[]; refresh: () => Promise<void> }) {
  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null)
  const [realMonto, setRealMonto] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useToastStore((s) => s.show)

  const todayStr = new Date().toISOString().split('T')[0]
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString().split('T')[0]

  const upcoming = useMemo(
    () => transactions
      .filter((t) => t.es_estimada && t.fecha >= todayStr && t.fecha <= in30Str)
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [transactions, todayStr, in30Str]
  )

  const openConfirm = (tx: Transaction) => {
    setConfirmTx(tx)
    setRealMonto(String(tx.monto))
  }

  const handleConfirm = async () => {
    if (!confirmTx) return
    const monto = parseFloat(realMonto)
    if (!monto || monto <= 0) return

    setSaving(true)
    const { error } = await supabase
      .from('transactions')
      .update({ es_estimada: false, monto })
      .eq('id', confirmTx.id)

    setSaving(false)
    if (error) {
      showToast('Error: ' + error.message)
      return
    }

    showToast('Transacción confirmada')
    setConfirmTx(null)
    await refresh()
  }

  return (
    <div>
      <p className="text-xs font-medium mb-3" style={{ color: '#1B4332', opacity: 0.5 }}>
        Próximos 30 días · {upcoming.length} transaccion{upcoming.length !== 1 ? 'es' : ''}
      </p>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl p-6 flex flex-col items-center gap-1.5" style={{ backgroundColor: '#EDE8DF' }}>
          <span className="text-2xl">📅</span>
          <p className="text-xs font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Sin transacciones estimadas</p>
          <p className="text-[10px] text-center" style={{ color: '#1B4332', opacity: 0.35 }}>
            Marca transacciones como estimadas para verlas aquí
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((tx) => {
            const cat = getCat(tx.categoria_id)
            return (
              <div key={tx.id} className="rounded-2xl p-3.5" style={{ backgroundColor: 'white' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: '#F5F0E8' }}>
                    {cat.icono}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1B4332' }}>
                      {tx.descripcion || cat.nombre}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#1B4332', opacity: 0.4 }}>
                      {new Date(tx.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {/* Badges */}
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {tx.es_estimada && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          ESTIMADO
                        </span>
                      )}
                      {tx.es_recurrente && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                          AUTO
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                        style={{
                          backgroundColor: tx.tipo === 'ingreso' ? '#DCFCE7' : '#FEE2E2',
                          color: tx.tipo === 'ingreso' ? '#166534' : '#991B1B',
                        }}
                      >
                        {tx.tipo === 'ingreso' ? 'INGRESO' : 'GASTO'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: tx.tipo === 'gasto' ? '#EF4444' : '#22C55E' }}>
                      {tx.tipo === 'gasto' ? '-' : '+'}{formatMXN(tx.monto)}
                    </p>
                    <button
                      onClick={() => openConfirm(tx)}
                      className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold active:scale-95 transition-transform"
                      style={{ backgroundColor: '#52B788', color: 'white' }}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmTx(null)} />
          <div
            className="relative w-[calc(100%-40px)] max-w-[390px] rounded-2xl p-5 animate-[fadeInDown_0.2s_ease-out]"
            style={{ backgroundColor: '#F5F0E8' }}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1B4332' }}>Confirmar transacción</h3>
            <p className="text-xs mb-4" style={{ color: '#1B4332', opacity: 0.5 }}>
              {confirmTx.descripcion || getCat(confirmTx.categoria_id).nombre}
            </p>

            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
              Monto real
            </label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={realMonto}
                onChange={(e) => setRealMonto(e.target.value)}
                className="w-full rounded-xl pl-8 pr-4 py-3 text-sm outline-none"
                style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTx(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !parseFloat(realMonto) || parseFloat(realMonto) <= 0}
                className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1B4332', color: '#F5F0E8' }}
              >
                {saving && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* =============================================
   Shared TxRow
   ============================================= */

function TxRow({ tx }: { tx: Transaction }) {
  const cat = getCat(tx.categoria_id)
  return (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'white' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: '#F5F0E8' }}>
        {cat.icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#1B4332' }}>{tx.descripcion || cat.nombre}</p>
        <div className="flex gap-1 mt-0.5">
          {tx.es_estimada && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>EST</span>
          )}
          {tx.es_recurrente && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold" style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>AUTO</span>
          )}
        </div>
      </div>
      <p className="text-sm font-bold" style={{ color: tx.tipo === 'gasto' ? '#EF4444' : '#22C55E' }}>
        {tx.tipo === 'gasto' ? '-' : '+'}{formatMXN(tx.monto)}
      </p>
    </div>
  )
}
