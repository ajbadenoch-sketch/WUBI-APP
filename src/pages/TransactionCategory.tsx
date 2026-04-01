import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '../stores/transactionStore'
import { useAuthStore } from '../stores/authStore'
import { GASTO_CATEGORIES, INGRESO_CATEGORIES } from '../types/categories'

export default function TransactionCategory() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const {
    draft,
    categories,
    loadingCategories,
    selectCategory,
    setDescripcion,
    fetchCategories,
  } = useTransactionStore()

  const { tipo, selectedCategoryId, descripcion } = draft

  // REGLA FIJA: disabled={!selectedId}
  const [selectedId, setSelectedId] = useState<string | null>(selectedCategoryId)

  // Fetch categories from Supabase
  useEffect(() => {
    if (user) fetchCategories(user.id, tipo)
  }, [user, tipo, fetchCategories])

  // Use Supabase categories if available, otherwise fall back to local constants
  const displayCategories = categories.length > 0
    ? categories.map((c) => ({ id: c.id, nombre: c.nombre, icono: c.icono }))
    : (tipo === 'gasto' ? GASTO_CATEGORIES : INGRESO_CATEGORIES)

  const handleSelect = (id: string, nombre: string, icono: string) => {
    setSelectedId(id)
    selectCategory(id, nombre, icono)
  }

  // Redirect to step 1 if no monto
  const montoNum = parseFloat(draft.monto) || 0
  useEffect(() => {
    if (montoNum <= 0) navigate('/transaction/new', { replace: true })
  }, [montoNum, navigate])

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button
          onClick={() => navigate('/transaction/new')}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#1B4332' }}>
          Categoría
        </h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>
          2/3
        </span>
      </div>

      {/* Category grid */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        <p className="text-xs font-medium mb-3" style={{ color: '#1B4332', opacity: 0.5 }}>
          Selecciona una categoría
        </p>

        {loadingCategories ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl animate-pulse"
                style={{ backgroundColor: '#EDE8DF' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {displayCategories.map((cat) => {
              const isSelected = selectedId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat.id, cat.nombre, cat.icono)}
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
        )}

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

      {/* REGLA FIJA: Continuar button — disabled={!selectedId} — NUNCA puede ser otra cosa */}
      <div className="px-5 pb-6 pt-2">
        <button
          onClick={() => navigate('/transaction/details')}
          disabled={!selectedId}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          style={{
            backgroundColor: selectedId ? '#52B788' : '#9CA3AF',
            color: 'white',
            boxShadow: selectedId ? '0 4px 16px rgba(82,183,136,0.4)' : 'none',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
