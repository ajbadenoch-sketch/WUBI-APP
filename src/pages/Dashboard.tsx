import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  useFinanceData,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  filterByDateRange, sumByTipo, formatMXN,
  WEEKDAYS_SHORT, MONTHS,
} from '../hooks/useFinanceData'
import { GASTO_CATEGORIES, INGRESO_CATEGORIES } from '../types/categories'
import type { Transaction } from '../types/database'

type ViewMode = 'semana' | 'mes'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { accounts, transactions, budgets, loading } = useFinanceData()
  const [viewMode, setViewMode] = useState<ViewMode>('semana')
  const [refDate, setRefDate] = useState(() => new Date())

  const allCategories = [...GASTO_CATEGORIES, ...INGRESO_CATEGORIES]

  // Date range
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    if (viewMode === 'semana') {
      const s = startOfWeek(refDate)
      const e = endOfWeek(refDate)
      return {
        rangeStart: s,
        rangeEnd: e,
        rangeLabel: `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`,
      }
    }
    const s = startOfMonth(refDate)
    const e = endOfMonth(refDate)
    return {
      rangeStart: s,
      rangeEnd: e,
      rangeLabel: `${MONTHS[s.getMonth()]} ${s.getFullYear()}`,
    }
  }, [viewMode, refDate])

  const periodTxs = useMemo(
    () => filterByDateRange(transactions, rangeStart, rangeEnd),
    [transactions, rangeStart, rangeEnd]
  )

  const totalBalance = accounts.reduce((s, a) => s + a.saldo, 0)
  const periodIngresos = sumByTipo(periodTxs, 'ingreso')
  const periodGastos = sumByTipo(periodTxs, 'gasto')
  const ahorroNeto = periodIngresos - periodGastos

  // Budget usage for period
  const now = new Date()
  const currentBudgets = budgets.filter((b) => b.mes === now.getMonth() + 1 && b.anio === now.getFullYear())
  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.monto_presupuestado, 0)
  const monthGastos = sumByTipo(
    filterByDateRange(transactions, startOfMonth(now), endOfMonth(now)),
    'gasto'
  )
  const budgetPct = totalBudgeted > 0 ? Math.min(100, Math.round((monthGastos / totalBudgeted) * 100)) : 0

  // Week calendar with dots
  const weekDays = useMemo(() => {
    const ws = startOfWeek(refDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayTxs = transactions.filter((t) => t.fecha === dateStr)
      const hasGasto = dayTxs.some((t) => t.tipo === 'gasto')
      const hasIngreso = dayTxs.some((t) => t.tipo === 'ingreso')
      return { date: d, dateStr, hasGasto, hasIngreso }
    })
  }, [refDate, transactions])

  // Estimated transactions (upcoming this week)
  const today = new Date().toISOString().split('T')[0]
  const weekEnd = endOfWeek(new Date()).toISOString().split('T')[0]
  const estimadas = transactions.filter(
    (t) => t.es_estimada && t.fecha >= today && t.fecha <= weekEnd
  )

  // Recent real transactions
  const recentTxs = periodTxs.filter((t) => !t.es_estimada).slice(0, 8)

  const navigatePeriod = (dir: number) => {
    setRefDate((prev) => {
      const d = new Date(prev)
      if (viewMode === 'semana') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const getCategoryInfo = (catId: string | null) => {
    if (!catId) return { icono: '💸', nombre: 'Sin categoría' }
    return allCategories.find((c) => c.id === catId) || { icono: '💸', nombre: 'Otra' }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-32">
        <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Bienvenido de vuelta,</p>
          <h1 className="text-xl font-bold" style={{ color: '#1B4332' }}>{displayName}</h1>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* View toggle + date nav */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex rounded-xl overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
          {(['semana', 'mes'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="px-4 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor: viewMode === m ? '#1B4332' : 'transparent',
                color: viewMode === m ? '#F5F0E8' : '#1B4332',
                borderRadius: viewMode === m ? '12px' : '0',
              }}
            >
              {m === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigatePeriod(-1)} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="text-xs font-medium min-w-[120px] text-center" style={{ color: '#1B4332' }}>{rangeLabel}</span>
          <button onClick={() => navigatePeriod(1)} className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90" style={{ backgroundColor: '#EDE8DF' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
          </button>
        </div>
      </div>

      {/* Week calendar with dots */}
      {viewMode === 'semana' && (
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map((d, i) => {
            const isToday = d.dateStr === new Date().toISOString().split('T')[0]
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.4 }}>
                  {WEEKDAYS_SHORT[i]}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: isToday ? '#1B4332' : 'transparent',
                    color: isToday ? '#F5F0E8' : '#1B4332',
                  }}
                >
                  {d.date.getDate()}
                </div>
                <div className="flex gap-0.5 h-1.5">
                  {d.hasGasto && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#EF4444' }} />}
                  {d.hasIngreso && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-2xl p-5 mb-3" style={{ backgroundColor: '#1B4332', boxShadow: '0 8px 32px rgba(27,67,50,0.25)' }}>
        <p className="text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>Balance disponible</p>
        <p className="text-3xl font-bold mt-1" style={{ color: '#F5F0E8' }}>{formatMXN(totalBalance)}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(245,240,232,0.35)' }}>MXN · {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Ahorro neto</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: ahorroNeto >= 0 ? '#22C55E' : '#EF4444' }}>
            {ahorroNeto >= 0 ? '+' : ''}{formatMXN(ahorroNeto)}
          </p>
          <p className="text-[10px]" style={{ color: '#1B4332', opacity: 0.35 }}>
            {viewMode === 'semana' ? 'Esta semana' : 'Este mes'}
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Presupuesto usado</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#1B4332' }}>
            {totalBudgeted > 0 ? `${budgetPct}%` : '—'}
          </p>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${budgetPct}%`,
                backgroundColor: budgetPct > 90 ? '#EF4444' : budgetPct > 70 ? '#F59E0B' : '#52B788',
              }}
            />
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: 'Metas', icon: '🎯', path: '/metas' },
          { label: 'Deudas', icon: '📋', path: '/deudas' },
          { label: 'Flujo', icon: '🔄', path: '/informes' },
          { label: 'Recurrentes', icon: '🔁', path: '/recurrentes' },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl active:scale-95 transition-transform"
            style={{ backgroundColor: 'white' }}
          >
            <span className="text-xl">{s.icon}</span>
            <span className="text-[10px] font-medium" style={{ color: '#1B4332' }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Wubi AI widget */}
      <div className="rounded-2xl p-4 mb-5 flex items-start gap-3" style={{ backgroundColor: 'rgba(82,183,136,0.12)', border: '1px solid rgba(82,183,136,0.25)' }}>
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black" style={{ backgroundColor: '#52B788', color: 'white' }}>W</div>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#1B4332' }}>Wubi AI</p>
          <p className="text-xs mt-0.5" style={{ color: '#1B4332', opacity: 0.6 }}>
            {periodGastos > 0
              ? `Esta ${viewMode === 'semana' ? 'semana' : 'mes'} llevas ${formatMXN(periodGastos)} en gastos. ${ahorroNeto >= 0 ? '¡Vas bien! Sigue así.' : 'Cuidado, estás gastando más de lo que ingresas.'}`
              : 'Registra tus transacciones y te daré insights personalizados sobre tus finanzas.'
            }
          </p>
          <button onClick={() => navigate('/ask-wubi')} className="text-[11px] font-semibold mt-1.5" style={{ color: '#52B788' }}>
            Pregúntale a Wubi →
          </button>
        </div>
      </div>

      {/* Estimated upcoming */}
      {estimadas.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold mb-2.5" style={{ color: '#1B4332' }}>Próximos · Esta semana</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
            {estimadas.map((tx) => {
              const cat = getCategoryInfo(tx.categoria_id)
              return (
                <div key={tx.id} className="flex-shrink-0 w-36 rounded-2xl p-3" style={{ backgroundColor: 'white' }}>
                  <span className="text-lg">{cat.icono}</span>
                  <p className="text-xs font-medium mt-1 truncate" style={{ color: '#1B4332' }}>{tx.descripcion || cat.nombre}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: tx.tipo === 'gasto' ? '#EF4444' : '#22C55E' }}>
                    {tx.tipo === 'gasto' ? '-' : '+'}{formatMXN(tx.monto)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#1B4332', opacity: 0.35 }}>{tx.fecha}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold mb-2.5" style={{ color: '#1B4332' }}>
          Actividad · {viewMode === 'semana' ? 'Esta semana' : 'Este mes'}
        </h2>
        {recentTxs.length === 0 ? (
          <div className="rounded-2xl p-6 flex flex-col items-center gap-1.5" style={{ backgroundColor: '#EDE8DF' }}>
            <span className="text-2xl">📊</span>
            <p className="text-xs font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Sin movimientos en este período</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTxs.map((tx) => (
              <TxRow key={tx.id} tx={tx} getCategoryInfo={getCategoryInfo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TxRow({ tx, getCategoryInfo }: { tx: Transaction; getCategoryInfo: (id: string | null) => { icono: string; nombre: string } }) {
  const cat = getCategoryInfo(tx.categoria_id)
  return (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'white' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: '#F5F0E8' }}>
        {cat.icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#1B4332' }}>{tx.descripcion || cat.nombre}</p>
        <p className="text-[10px]" style={{ color: '#1B4332', opacity: 0.4 }}>{tx.fecha}</p>
      </div>
      <p className="text-sm font-bold" style={{ color: tx.tipo === 'gasto' ? '#EF4444' : '#22C55E' }}>
        {tx.tipo === 'gasto' ? '-' : '+'}{formatMXN(tx.monto)}
      </p>
    </div>
  )
}
