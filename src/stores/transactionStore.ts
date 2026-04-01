import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Account, Transaction, Category } from '../types/database'

interface TransactionDraft {
  tipo: 'gasto' | 'ingreso'
  monto: string
  selectedCategoryId: string | null
  selectedCategoryName: string | null
  selectedCategoryIcon: string | null
  descripcion: string
  accountId: string | null
  fecha: string
}

interface TransactionStore {
  // Draft state for new transaction flow
  draft: TransactionDraft

  // Data
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  loadingAccounts: boolean
  loadingCategories: boolean
  saving: boolean

  // Draft actions
  setTipo: (tipo: 'gasto' | 'ingreso') => void
  setMonto: (monto: string) => void
  selectCategory: (id: string, nombre: string, icono: string) => void
  setDescripcion: (desc: string) => void
  setAccountId: (id: string) => void
  setFecha: (fecha: string) => void
  resetDraft: () => void

  // Data actions
  fetchAccounts: (userId: string) => Promise<void>
  fetchCategories: (userId: string, tipo: 'gasto' | 'ingreso') => Promise<void>
  fetchTransactions: (userId: string) => Promise<void>
  saveTransaction: (userId: string) => Promise<{ success: boolean; error?: string }>
  invalidate: (userId: string) => Promise<void>
}

const initialDraft: TransactionDraft = {
  tipo: 'gasto',
  monto: '0',
  selectedCategoryId: null,
  selectedCategoryName: null,
  selectedCategoryIcon: null,
  descripcion: '',
  accountId: null,
  fecha: new Date().toISOString().split('T')[0],
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  draft: { ...initialDraft },
  accounts: [],
  transactions: [],
  categories: [],
  loadingAccounts: false,
  loadingCategories: false,
  saving: false,

  // Draft actions
  setTipo: (tipo) =>
    set((s) => ({
      draft: { ...s.draft, tipo, selectedCategoryId: null, selectedCategoryName: null, selectedCategoryIcon: null },
    })),
  setMonto: (monto) => set((s) => ({ draft: { ...s.draft, monto } })),
  selectCategory: (id, nombre, icono) =>
    set((s) => ({
      draft: { ...s.draft, selectedCategoryId: id, selectedCategoryName: nombre, selectedCategoryIcon: icono },
    })),
  setDescripcion: (descripcion) => set((s) => ({ draft: { ...s.draft, descripcion } })),
  setAccountId: (accountId) => set((s) => ({ draft: { ...s.draft, accountId } })),
  setFecha: (fecha) => set((s) => ({ draft: { ...s.draft, fecha } })),
  resetDraft: () => set({ draft: { ...initialDraft, fecha: new Date().toISOString().split('T')[0] } }),

  // Data actions
  fetchAccounts: async (userId) => {
    set({ loadingAccounts: true })
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
    if (data) {
      set({ accounts: data, loadingAccounts: false })
      // Auto-select first account if none selected
      const { draft } = get()
      if (!draft.accountId && data.length > 0) {
        set({ draft: { ...get().draft, accountId: data[0].id } })
      }
    } else {
      set({ loadingAccounts: false })
    }
  },

  fetchCategories: async (userId, tipo) => {
    set({ loadingCategories: true })
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},es_default.eq.true`)
      .eq('tipo', tipo)
      .order('es_default', { ascending: false })
    if (data) {
      set({ categories: data, loadingCategories: false })
    } else {
      set({ loadingCategories: false })
    }
  },

  fetchTransactions: async (userId) => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })
    if (data) set({ transactions: data })
  },

  saveTransaction: async (userId) => {
    const { draft } = get()
    const montoNum = parseFloat(draft.monto) || 0
    if (!draft.accountId || !draft.selectedCategoryId || montoNum <= 0) {
      return { success: false, error: 'Datos incompletos' }
    }

    set({ saving: true })
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      account_id: draft.accountId,
      tipo: draft.tipo,
      monto: montoNum,
      categoria_id: draft.selectedCategoryId,
      fecha: draft.fecha,
      descripcion: draft.descripcion.trim() || null,
      es_estimada: false,
      es_recurrente: false,
    })
    set({ saving: false })

    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  invalidate: async (userId) => {
    // Refresh both accounts (saldo updated by trigger) and transactions
    const [accRes, txRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
    ])
    if (accRes.data) set({ accounts: accRes.data })
    if (txRes.data) set({ transactions: txRes.data })
  },
}))
