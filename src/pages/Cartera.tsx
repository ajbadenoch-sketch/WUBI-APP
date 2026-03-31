import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import type { Account } from '../types/database'

const BANCOS = [
  'BBVA', 'Banamex', 'Santander', 'HSBC', 'Banorte',
  'Hey Banco', 'Nu', 'Scotiabank', 'Inbursa', 'BanCoppel',
  'Banco Azteca', 'Rappi', 'Mercado Pago', 'Stori', 'Otro',
]

const TIPOS: { value: Account['tipo']; label: string }[] = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'efectivo', label: 'Efectivo' },
]

const COLORES = [
  '#6366f1', '#ec4899', '#f59e0b', '#22c55e',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
]

const TIPO_ICONS: Record<Account['tipo'], string> = {
  debito: '💳',
  credito: '💎',
  ahorro: '🏦',
  inversion: '📈',
  efectivo: '💵',
}

type FormData = {
  nombre: string
  banco: string
  tipo: Account['tipo']
  saldo: string
  color: string
}

const emptyForm: FormData = {
  nombre: '',
  banco: '',
  tipo: 'debito',
  saldo: '0',
  color: COLORES[0],
}

export default function Cartera() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)

  const fetchAccounts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setAccounts(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (acc: Account) => {
    setEditingId(acc.id)
    setForm({
      nombre: acc.nombre,
      banco: acc.banco,
      tipo: acc.tipo,
      saldo: String(acc.saldo),
      color: acc.color,
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!user) return
    const nombre = form.nombre.trim()
    const banco = form.banco.trim()

    if (!nombre) { setFormError('El nombre es requerido'); return }
    if (!banco) { setFormError('Selecciona un banco'); return }

    const saldoNum = parseFloat(form.saldo) || 0

    // Anti-duplicate check
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('banco', banco)
      .eq('nombre', nombre)

    if (existing && existing.length > 0) {
      const isDuplicate = editingId ? existing.some((e) => e.id !== editingId) : true
      if (isDuplicate) {
        setFormError('Ya tienes una cuenta con ese nombre en ese banco')
        return
      }
    }

    setSaving(true)
    setFormError(null)

    if (editingId) {
      const { error } = await supabase
        .from('accounts')
        .update({ nombre, banco, tipo: form.tipo, saldo: saldoNum, color: form.color })
        .eq('id', editingId)
      setSaving(false)
      if (error) { setFormError(error.message); return }
      showToast('Cuenta actualizada')
    } else {
      const { error } = await supabase
        .from('accounts')
        .insert({ user_id: user.id, nombre, banco, tipo: form.tipo, saldo: saldoNum, color: form.color })
      setSaving(false)
      if (error) {
        if (error.code === '23505') {
          setFormError('Ya tienes una cuenta con ese nombre en ese banco')
        } else {
          setFormError(error.message)
        }
        return
      }
      showToast('Cuenta creada')
    }

    closeForm()
    fetchAccounts()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) {
      showToast('Error: ' + error.message)
    } else {
      showToast('Cuenta eliminada')
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    }
    setConfirmDeleteId(null)
  }

  return (
    <div className="px-5 pt-14 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>Cartera</h1>
        <button
          onClick={openCreate}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#52B788', boxShadow: '0 4px 12px rgba(82,183,136,0.35)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Accounts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{ backgroundColor: '#EDE8DF' }}>
          <span className="text-3xl">💳</span>
          <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
            Sin cuentas aún
          </p>
          <p className="text-xs text-center" style={{ color: '#1B4332', opacity: 0.35 }}>
            Toca + para agregar tu primera cuenta
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={() => openEdit(acc)}
              onDelete={() => setConfirmDeleteId(acc.id)}
              confirmingDelete={confirmDeleteId === acc.id}
              onConfirmDelete={() => handleDelete(acc.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

      {/* Total */}
      {accounts.length > 0 && (
        <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: '#1B4332' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>Balance total</span>
            <span className="text-xl font-bold" style={{ color: '#F5F0E8' }}>
              ${accounts.reduce((s, a) => s + a.saldo, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AccountFormModal
          form={form}
          setForm={setForm}
          formError={formError}
          saving={saving}
          isEditing={!!editingId}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}

/* =============================================
   Account Card with swipe-to-delete
   ============================================= */

function AccountCard({
  account,
  onEdit,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  account: Account
  onEdit: () => void
  onDelete: () => void
  confirmingDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const swiping = useRef(false)
  const [offset, setOffset] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    swiping.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return
    currentX.current = e.touches[0].clientX
    const diff = startX.current - currentX.current
    // Only allow swipe left, clamped to 80px
    const clamped = Math.max(0, Math.min(80, diff))
    setOffset(clamped)
  }

  const handleTouchEnd = () => {
    swiping.current = false
    if (offset > 50) {
      setOffset(80) // snap open
    } else {
      setOffset(0) // snap closed
    }
  }

  // Close swipe when tapping elsewhere
  useEffect(() => {
    if (offset === 0) return
    const handler = (e: TouchEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOffset(0)
      }
    }
    document.addEventListener('touchstart', handler)
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('mousedown', handler)
    }
  }, [offset])

  if (confirmingDelete) {
    return (
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#FEE2E2', border: '2px solid #FCA5A5' }}>
        <p className="text-sm font-medium text-center mb-3" style={{ color: '#991B1B' }}>
          ¿Eliminar "{account.nombre}"?
        </p>
        <p className="text-xs text-center mb-4" style={{ color: '#991B1B', opacity: 0.7 }}>
          Esto eliminará también todas las transacciones asociadas.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancelDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
            style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
            style={{ backgroundColor: '#DC2626', color: 'white' }}
          >
            Eliminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-2xl"
        style={{ width: '80px', backgroundColor: '#DC2626' }}
      >
        <button onClick={onDelete} className="flex flex-col items-center gap-0.5 text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="text-[10px] font-medium">Eliminar</span>
        </button>
      </div>

      {/* Card content */}
      <div
        className="relative rounded-2xl p-4 transition-transform duration-150 ease-out"
        style={{
          backgroundColor: 'white',
          transform: `translateX(-${offset}px)`,
          borderLeft: `4px solid ${account.color}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset === 0) onEdit() }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: account.color + '20' }}
          >
            {TIPO_ICONS[account.tipo]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#1B4332' }}>
              {account.nombre}
            </p>
            <p className="text-xs" style={{ color: '#1B4332', opacity: 0.5 }}>
              {account.banco} · {TIPOS.find((t) => t.value === account.tipo)?.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold" style={{ color: '#1B4332' }}>
              ${account.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px]" style={{ color: '#1B4332', opacity: 0.35 }}>MXN</p>
          </div>
        </div>
        {/* Edit hint */}
        <p className="text-[10px] text-right mt-1" style={{ color: '#1B4332', opacity: 0.25 }}>
          Toca para editar · desliza para eliminar
        </p>
      </div>
    </div>
  )
}

/* =============================================
   Account Form Modal
   ============================================= */

function AccountFormModal({
  form,
  setForm,
  formError,
  saving,
  isEditing,
  onSave,
  onClose,
}: {
  form: FormData
  setForm: (f: FormData) => void
  formError: string | null
  saving: boolean
  isEditing: boolean
  onSave: () => void
  onClose: () => void
}) {
  const update = (patch: Partial<FormData>) => setForm({ ...form, ...patch })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl px-5 pt-6 pb-8 animate-[slideUp_0.3s_ease-out]"
        style={{ backgroundColor: '#F5F0E8', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#D4CFC7' }} />

        <h2 className="text-xl font-bold mb-5" style={{ color: '#1B4332' }}>
          {isEditing ? 'Editar cuenta' : 'Nueva cuenta'}
        </h2>

        {/* Error */}
        {formError && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4 bg-red-50 text-red-600 border border-red-200">
            {formError}
          </div>
        )}

        {/* Nombre */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Nombre de la cuenta
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Ej: Cuenta principal"
            maxLength={50}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
          />
        </div>

        {/* Banco */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Banco
          </label>
          <select
            value={form.banco}
            onChange={(e) => update({ banco: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
            style={{ backgroundColor: '#EDE8DF', color: form.banco ? '#1B4332' : 'rgba(27,67,50,0.4)' }}
          >
            <option value="">Seleccionar banco</option>
            {BANCOS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Tipo
          </label>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => update({ tipo: t.value })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: form.tipo === t.value ? '#1B4332' : '#EDE8DF',
                  color: form.tipo === t.value ? '#F5F0E8' : '#1B4332',
                }}
              >
                {TIPO_ICONS[t.value]} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saldo inicial */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            {isEditing ? 'Saldo actual' : 'Saldo inicial'}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>$</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.saldo}
              onChange={(e) => update({ saldo: e.target.value })}
              className="w-full rounded-xl pl-8 pr-4 py-3 text-sm outline-none"
              style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
            />
          </div>
        </div>

        {/* Color */}
        <div className="mb-6">
          <label className="text-xs font-medium mb-2 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Color
          </label>
          <div className="flex gap-2.5">
            {COLORES.map((c) => (
              <button
                key={c}
                onClick={() => update({ color: c })}
                className="w-9 h-9 rounded-full transition-all active:scale-90"
                style={{
                  backgroundColor: c,
                  border: form.color === c ? '3px solid #1B4332' : '3px solid transparent',
                  boxShadow: form.color === c ? '0 0 0 2px #F5F0E8' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold active:scale-95 transition-transform"
            style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1B4332', color: '#F5F0E8' }}
          >
            {saving && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}
