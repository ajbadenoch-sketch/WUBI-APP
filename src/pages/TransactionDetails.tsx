import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '../stores/transactionStore'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export default function TransactionDetails() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const showToast = useToastStore((s) => s.show)
  const {
    draft,
    accounts,
    loadingAccounts,
    saving,
    setAccountId,
    setFecha,
    fetchAccounts,
    saveTransaction,
    invalidate,
    resetDraft,
  } = useTransactionStore()

  const {
    tipo,
    monto,
    selectedCategoryId,
    selectedCategoryName,
    selectedCategoryIcon,
    accountId,
    fecha,
  } = draft
  const montoNum = parseFloat(monto) || 0

  // Redirect if missing required data from previous steps
  useEffect(() => {
    if (montoNum <= 0) {
      navigate('/transaction/new', { replace: true })
    } else if (!selectedCategoryId) {
      navigate('/transaction/category', { replace: true })
    }
  }, [montoNum, selectedCategoryId, navigate])

  // Fetch accounts
  useEffect(() => {
    if (user) fetchAccounts(user.id)
  }, [user, fetchAccounts])

  const handleSave = async () => {
    if (!user) return
    const result = await saveTransaction(user.id)
    if (result.success) {
      // Invalidate stores so dashboard shows fresh data
      await invalidate(user.id)
      resetDraft()
      showToast('✓ Transacción guardada')
      navigate('/dashboard', { replace: true })
    } else {
      showToast('Error: ' + (result.error || 'No se pudo guardar'))
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button
          onClick={() => navigate('/transaction/category')}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: '#1B4332' }}>
          Detalles
        </h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EDE8DF', color: '#1B4332' }}>
          3/3
        </span>
      </div>

      <div className="flex-1 px-5 pt-2 pb-4">
        {/* Preview card */}
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: '#1B4332' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
              {tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
            </span>
            <span className="text-2xl font-bold" style={{ color: '#F5F0E8' }}>
              {tipo === 'gasto' ? '-' : '+'}${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {selectedCategoryName && (
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(245,240,232,0.1)' }}>
              <span className="text-lg">{selectedCategoryIcon}</span>
              <span className="text-sm font-medium" style={{ color: 'rgba(245,240,232,0.8)' }}>
                {selectedCategoryName}
              </span>
            </div>
          )}
        </div>

        {/* Account selector */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Cuenta
          </label>
          {loadingAccounts ? (
            <div className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: '#EDE8DF' }} />
          ) : accounts.length === 0 ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: '#EDE8DF', color: 'rgba(27,67,50,0.5)' }}
            >
              No tienes cuentas. Crea una en Cartera.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((acc) => {
                const isSelected = accountId === acc.id
                return (
                  <button
                    key={acc.id}
                    onClick={() => setAccountId(acc.id)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: isSelected ? 'rgba(82,183,136,0.15)' : '#EDE8DF',
                      border: isSelected ? '2px solid #52B788' : '2px solid transparent',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: acc.color || '#52B788', color: 'white' }}
                    >
                      {acc.banco.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold" style={{ color: '#1B4332' }}>{acc.nombre}</p>
                      <p className="text-xs" style={{ color: 'rgba(27,67,50,0.5)' }}>
                        {acc.banco} · ${acc.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {isSelected && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Date picker */}
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#1B4332', opacity: 0.5 }}>
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: '#EDE8DF',
              color: '#1B4332',
              border: '2px solid transparent',
            }}
          />
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 pb-6 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !accountId}
          className="w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
          style={{
            backgroundColor: '#1B4332',
            color: '#F5F0E8',
            boxShadow: '0 4px 20px rgba(27,67,50,0.35)',
          }}
        >
          {saving ? (
            <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : null}
          {saving ? 'Guardando...' : 'Guardar transacción'}
        </button>
      </div>
    </div>
  )
}
