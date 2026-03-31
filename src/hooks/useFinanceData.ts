import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Account, Transaction, Budget, Debt } from '../types/database'

export interface FinanceData {
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
  debts: Debt[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useFinanceData(): FinanceData {
  const user = useAuthStore((s) => s.user)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const [accRes, txRes, budRes, debtRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('fecha', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('debts').select('*').eq('user_id', user.id),
    ])
    if (accRes.data) setAccounts(accRes.data)
    if (txRes.data) setTransactions(txRes.data)
    if (budRes.data) setBudgets(budRes.data)
    if (debtRes.data) setDebts(debtRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return { accounts, transactions, budgets, debts, loading, refresh }
}

// Date helpers
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday start
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeek(date: Date): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function filterByDateRange(txs: Transaction[], start: Date, end: Date): Transaction[] {
  const s = start.toISOString().split('T')[0]
  const e = end.toISOString().split('T')[0]
  return txs.filter((t) => t.fecha >= s && t.fecha <= e)
}

export function sumByTipo(txs: Transaction[], tipo: 'ingreso' | 'gasto'): number {
  return txs.filter((t) => t.tipo === tipo).reduce((s, t) => s + t.monto, 0)
}

export function formatMXN(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export { WEEKDAYS_SHORT, MONTHS, MONTHS_SHORT }
