import { useState, useMemo } from 'react'
import {
  useFinanceData,
  startOfMonth, endOfMonth,
  filterByDateRange, sumByTipo, formatMXN,
  MONTHS_SHORT,
} from '../hooks/useFinanceData'
import { GASTO_CATEGORIES, INGRESO_CATEGORIES } from '../types/categories'
import type { Transaction, Account, Budget, Debt } from '../types/database'

type Tab = 'presupuesto' | 'flujo' | 'resultados' | 'patrimonio'

const TABS: { key: Tab; label: string }[] = [
  { key: 'presupuesto', label: 'Presupuesto' },
  { key: 'flujo', label: 'Flujo' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'patrimonio', label: 'Patrimonio' },
]

export default function Informes() {
  const [tab, setTab] = useState<Tab>('presupuesto')
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
      <h1 className="text-xl font-bold mb-4" style={{ color: '#1B4332' }}>Informes</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              backgroundColor: tab === t.key ? '#1B4332' : '#EDE8DF',
              color: tab === t.key ? '#F5F0E8' : '#1B4332',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'presupuesto' && <TabPresupuesto transactions={data.transactions} budgets={data.budgets} />}
      {tab === 'flujo' && <TabFlujo transactions={data.transactions} />}
      {tab === 'resultados' && <TabResultados transactions={data.transactions} budgets={data.budgets} />}
      {tab === 'patrimonio' && <TabPatrimonio accounts={data.accounts} debts={data.debts} />}
    </div>
  )
}

/* =============================================
   TAB 1 — Presupuesto
   ============================================= */

function TabPresupuesto({ transactions, budgets }: { transactions: Transaction[]; budgets: Budget[] }) {
  const now = new Date()
  const monthTxs = filterByDateRange(transactions, startOfMonth(now), endOfMonth(now))
  const currentBudgets = budgets.filter((b) => b.mes === now.getMonth() + 1 && b.anio === now.getFullYear())

  const allCats = [...GASTO_CATEGORIES, ...INGRESO_CATEGORIES]

  // Sum gastos per category
  const gastosByCategory = new Map<string, number>()
  monthTxs.filter((t) => t.tipo === 'gasto').forEach((t) => {
    if (t.categoria_id) {
      gastosByCategory.set(t.categoria_id, (gastosByCategory.get(t.categoria_id) || 0) + t.monto)
    }
  })

  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.monto_presupuestado, 0)
  const totalSpent = Array.from(gastosByCategory.values()).reduce((s, v) => s + v, 0)

  // Build rows: budgets first, then unbudgeted categories with spending
  const budgetRows = currentBudgets.map((b) => {
    const spent = gastosByCategory.get(b.categoria_id) || 0
    const cat = allCats.find((c) => c.id === b.categoria_id)
    const pct = b.monto_presupuestado > 0 ? Math.min(100, Math.round((spent / b.monto_presupuestado) * 100)) : 0
    return { catId: b.categoria_id, nombre: cat?.nombre || 'Otra', icono: cat?.icono || '📦', budgeted: b.monto_presupuestado, spent, pct }
  })

  const unbudgetedRows = Array.from(gastosByCategory.entries())
    .filter(([catId]) => !currentBudgets.some((b) => b.categoria_id === catId))
    .map(([catId, spent]) => {
      const cat = allCats.find((c) => c.id === catId)
      return { catId, nombre: cat?.nombre || 'Otra', icono: cat?.icono || '📦', budgeted: 0, spent, pct: 0 }
    })

  const rows = [...budgetRows, ...unbudgetedRows]

  return (
    <div>
      {/* Summary */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'white' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Gastado / Presupuestado</span>
          <span className="text-sm font-bold" style={{ color: '#1B4332' }}>{formatMXN(totalSpent)} / {formatMXN(totalBudgeted)}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDE8DF' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0}%`,
              backgroundColor: totalSpent > totalBudgeted ? '#EF4444' : '#52B788',
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="📊" text="Sin presupuestos este mes" sub="Agrega presupuestos para dar seguimiento a tus gastos" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.catId} className="rounded-xl p-3" style={{ backgroundColor: 'white' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-lg">{r.icono}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: '#1B4332' }}>{r.nombre}</span>
                <span className="text-xs font-bold" style={{ color: r.pct > 90 ? '#EF4444' : '#1B4332' }}>
                  {r.budgeted > 0 ? `${r.pct}%` : '—'}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#EDE8DF' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${r.pct}%`,
                    backgroundColor: r.pct > 90 ? '#EF4444' : r.pct > 70 ? '#F59E0B' : '#52B788',
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: '#1B4332', opacity: 0.4 }}>{formatMXN(r.spent)} gastado</span>
                {r.budgeted > 0 && <span className="text-[10px]" style={{ color: '#1B4332', opacity: 0.4 }}>de {formatMXN(r.budgeted)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =============================================
   TAB 2 — Flujo
   ============================================= */

function TabFlujo({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const s = startOfMonth(d)
      const e = endOfMonth(d)
      const txs = filterByDateRange(transactions, s, e)
      const ingresos = sumByTipo(txs, 'ingreso')
      const gastos = sumByTipo(txs, 'gasto')
      return { month: d, label: MONTHS_SHORT[d.getMonth()], ingresos, gastos, neto: ingresos - gastos }
    })
  }, [transactions])

  const maxVal = Math.max(...months.flatMap((m) => [m.ingresos, m.gastos]), 1)

  const currentMonth = months[months.length - 1]
  const totalIngresos = currentMonth.ingresos
  const totalGastos = currentMonth.gastos
  const saldoFinal = totalIngresos - totalGastos

  // Upcoming estimated transactions
  const today = new Date().toISOString().split('T')[0]
  const upcoming = transactions
    .filter((t) => t.es_estimada && t.fecha >= today)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5)

  const allCats = [...GASTO_CATEGORIES, ...INGRESO_CATEGORIES]

  return (
    <div>
      {/* Bar chart */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'white' }}>
        <p className="text-xs font-medium mb-3" style={{ color: '#1B4332', opacity: 0.5 }}>Entradas vs Salidas (6 meses)</p>
        <div className="flex items-end gap-2 h-32">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '100px' }}>
                <div
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(2, (m.ingresos / maxVal) * 100)}%`,
                    backgroundColor: '#22C55E',
                  }}
                />
                <div
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(2, (m.gastos / maxVal) * 100)}%`,
                    backgroundColor: '#EF4444',
                  }}
                />
              </div>
              <span className="text-[9px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            <span className="text-[10px]" style={{ color: '#1B4332', opacity: 0.5 }}>Entradas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span className="text-[10px]" style={{ color: '#1B4332', opacity: 0.5 }}>Salidas</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniCard label="Saldo final" value={formatMXN(saldoFinal)} color={saldoFinal >= 0 ? '#22C55E' : '#EF4444'} />
        <MiniCard label="Entradas" value={formatMXN(totalIngresos)} color="#22C55E" />
        <MiniCard label="Salidas" value={formatMXN(totalGastos)} color="#EF4444" />
      </div>

      {/* Upcoming */}
      <h3 className="text-sm font-semibold mb-2" style={{ color: '#1B4332' }}>Próximos & Proyección</h3>
      {upcoming.length === 0 ? (
        <EmptyState icon="📅" text="Sin transacciones estimadas" sub="" />
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((tx) => {
            const cat = allCats.find((c) => c.id === tx.categoria_id)
            return (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'white' }}>
                <span className="text-lg">{cat?.icono || '💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#1B4332' }}>{tx.descripcion || cat?.nombre || 'Transacción'}</p>
                  <p className="text-[10px]" style={{ color: '#1B4332', opacity: 0.4 }}>{tx.fecha}</p>
                </div>
                <p className="text-xs font-bold" style={{ color: tx.tipo === 'gasto' ? '#EF4444' : '#22C55E' }}>
                  {tx.tipo === 'gasto' ? '-' : '+'}{formatMXN(tx.monto)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* =============================================
   TAB 3 — Resultados
   ============================================= */

function TabResultados({ transactions, budgets }: { transactions: Transaction[]; budgets: Budget[] }) {
  const now = new Date()
  const monthTxs = filterByDateRange(transactions, startOfMonth(now), endOfMonth(now))
  const realTxs = monthTxs.filter((t) => !t.es_estimada)

  const ingresos = sumByTipo(realTxs, 'ingreso')
  const gastos = sumByTipo(realTxs, 'gasto')
  const ahorroNeto = ingresos - gastos
  const tasaAhorro = ingresos > 0 ? Math.round((ahorroNeto / ingresos) * 100) : 0

  const currentBudgets = budgets.filter((b) => b.mes === now.getMonth() + 1 && b.anio === now.getFullYear())
  const allCats = [...GASTO_CATEGORIES, ...INGRESO_CATEGORIES]

  // Real vs budget per category
  const gastosByCategory = new Map<string, number>()
  realTxs.filter((t) => t.tipo === 'gasto').forEach((t) => {
    if (t.categoria_id) {
      gastosByCategory.set(t.categoria_id, (gastosByCategory.get(t.categoria_id) || 0) + t.monto)
    }
  })

  const comparisonRows = currentBudgets.map((b) => {
    const cat = allCats.find((c) => c.id === b.categoria_id)
    const real = gastosByCategory.get(b.categoria_id) || 0
    const diff = b.monto_presupuestado - real
    return { catId: b.categoria_id, nombre: cat?.nombre || 'Otra', icono: cat?.icono || '📦', presupuesto: b.monto_presupuestado, real, diff }
  })

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Ahorro neto</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: ahorroNeto >= 0 ? '#22C55E' : '#EF4444' }}>
            {ahorroNeto >= 0 ? '+' : ''}{formatMXN(ahorroNeto)}
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Tasa de ahorro</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: tasaAhorro >= 20 ? '#22C55E' : tasaAhorro >= 0 ? '#F59E0B' : '#EF4444' }}>
            {tasaAhorro}%
          </p>
        </div>
      </div>

      {/* Ingresos / Gastos */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MiniCard label="Ingresos reales" value={formatMXN(ingresos)} color="#22C55E" />
        <MiniCard label="Gastos reales" value={formatMXN(gastos)} color="#EF4444" />
      </div>

      {/* Budget vs Real table */}
      <h3 className="text-sm font-semibold mb-2.5" style={{ color: '#1B4332' }}>Presupuesto vs Real</h3>
      {comparisonRows.length === 0 ? (
        <EmptyState icon="📋" text="Sin presupuestos configurados" sub="Crea presupuestos para comparar contra tus gastos reales" />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white' }}>
          {/* Header */}
          <div className="grid grid-cols-4 gap-1 px-3 py-2" style={{ backgroundColor: '#EDE8DF' }}>
            <span className="text-[10px] font-semibold col-span-1" style={{ color: '#1B4332' }}>Categoría</span>
            <span className="text-[10px] font-semibold text-right" style={{ color: '#1B4332' }}>Presupu.</span>
            <span className="text-[10px] font-semibold text-right" style={{ color: '#1B4332' }}>Real</span>
            <span className="text-[10px] font-semibold text-right" style={{ color: '#1B4332' }}>Dif.</span>
          </div>
          {comparisonRows.map((r) => (
            <div key={r.catId} className="grid grid-cols-4 gap-1 px-3 py-2 items-center" style={{ borderBottom: '1px solid #F5F0E8' }}>
              <div className="flex items-center gap-1.5 col-span-1 min-w-0">
                <span className="text-sm">{r.icono}</span>
                <span className="text-[10px] font-medium truncate" style={{ color: '#1B4332' }}>{r.nombre}</span>
              </div>
              <span className="text-[10px] text-right" style={{ color: '#1B4332', opacity: 0.6 }}>{formatMXN(r.presupuesto)}</span>
              <span className="text-[10px] text-right font-medium" style={{ color: '#1B4332' }}>{formatMXN(r.real)}</span>
              <span className="text-[10px] text-right font-bold" style={{ color: r.diff >= 0 ? '#22C55E' : '#EF4444' }}>
                {r.diff >= 0 ? '+' : ''}{formatMXN(r.diff)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =============================================
   TAB 4 — Patrimonio
   ============================================= */

function TabPatrimonio({ accounts, debts }: { accounts: Account[]; debts: Debt[] }) {
  // Deduplicate accounts by id (unique constraint guarantees no dupes, but safeguard)
  const uniqueAccounts = useMemo(() => {
    const seen = new Set<string>()
    return accounts.filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  }, [accounts])

  const activos = uniqueAccounts.reduce((s, a) => s + a.saldo, 0)
  const deudasPendientes = debts.filter((d) => !d.pagado)
  const pasivos = deudasPendientes.reduce((s, d) => s + d.monto, 0)
  const patrimonio = activos - pasivos
  const ratioLiquidez = pasivos > 0 ? (activos / pasivos) : activos > 0 ? Infinity : 0
  const ratioDeuda = activos > 0 ? Math.round((pasivos / activos) * 100) : 0

  // Group accounts by tipo
  const TIPO_LABELS: Record<Account['tipo'], string> = {
    debito: 'Débito', credito: 'Crédito', ahorro: 'Ahorro', inversion: 'Inversión', efectivo: 'Efectivo',
  }
  const TIPO_ICONS: Record<Account['tipo'], string> = {
    debito: '💳', credito: '💎', ahorro: '🏦', inversion: '📈', efectivo: '💵',
  }

  const grouped = useMemo(() => {
    const map = new Map<Account['tipo'], Account[]>()
    uniqueAccounts.forEach((a) => {
      const arr = map.get(a.tipo) || []
      arr.push(a)
      map.set(a.tipo, arr)
    })
    return Array.from(map.entries())
  }, [uniqueAccounts])

  return (
    <div>
      {/* Patrimonio card */}
      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: '#1B4332' }}>
        <p className="text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>Patrimonio neto</p>
        <p className="text-3xl font-bold mt-1" style={{ color: '#F5F0E8' }}>{formatMXN(patrimonio)}</p>
      </div>

      {/* Activos / Pasivos */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Activos</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: '#22C55E' }}>{formatMXN(activos)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Pasivos</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: pasivos > 0 ? '#EF4444' : '#1B4332' }}>{formatMXN(pasivos)}</p>
        </div>
      </div>

      {/* Ratios */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Ratio Liquidez</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: '#1B4332' }}>
            {ratioLiquidez === Infinity ? '∞' : ratioLiquidez.toFixed(2) + 'x'}
          </p>
          <p className="text-[9px]" style={{ color: '#1B4332', opacity: 0.3 }}>Activos / Pasivos</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'white' }}>
          <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>Ratio Deuda</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: ratioDeuda > 50 ? '#EF4444' : '#1B4332' }}>
            {ratioDeuda}%
          </p>
          <p className="text-[9px]" style={{ color: '#1B4332', opacity: 0.3 }}>Pasivos / Activos</p>
        </div>
      </div>

      {/* Assets grouped by type */}
      <h3 className="text-sm font-semibold mb-2.5" style={{ color: '#1B4332' }}>Activos por tipo</h3>
      {grouped.length === 0 ? (
        <EmptyState icon="🏦" text="Sin cuentas" sub="Agrega cuentas en Cartera" />
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([tipo, accs]) => (
            <div key={tipo} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: '#EDE8DF' }}>
                <span className="text-sm">{TIPO_ICONS[tipo]}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: '#1B4332' }}>{TIPO_LABELS[tipo]}</span>
                <span className="text-xs font-bold" style={{ color: '#1B4332' }}>
                  {formatMXN(accs.reduce((s, a) => s + a.saldo, 0))}
                </span>
              </div>
              {accs.map((acc) => (
                <div key={acc.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
                  <span className="text-xs flex-1" style={{ color: '#1B4332' }}>{acc.nombre} · {acc.banco}</span>
                  <span className="text-xs font-semibold" style={{ color: '#1B4332' }}>{formatMXN(acc.saldo)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Deudas pendientes */}
      {deudasPendientes.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mt-5 mb-2.5" style={{ color: '#1B4332' }}>Deudas pendientes</h3>
          <div className="flex flex-col gap-2">
            {deudasPendientes.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'white' }}>
                <span className="text-lg">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#1B4332' }}>{d.concepto}</p>
                  <p className="text-[10px]" style={{ color: '#1B4332', opacity: 0.4 }}>{d.acreedor} · Vence: {d.fecha_vencimiento}</p>
                </div>
                <p className="text-xs font-bold" style={{ color: '#EF4444' }}>{formatMXN(d.monto)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* =============================================
   Shared Components
   ============================================= */

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: 'white' }}>
      <p className="text-[10px] font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  )
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col items-center gap-1.5" style={{ backgroundColor: '#EDE8DF' }}>
      <span className="text-2xl">{icon}</span>
      <p className="text-xs font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>{text}</p>
      {sub && <p className="text-[10px] text-center" style={{ color: '#1B4332', opacity: 0.35 }}>{sub}</p>}
    </div>
  )
}
