import { useAuthStore } from '../stores/authStore'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="px-5 pt-14 pb-6">
      <p className="text-sm" style={{ color: '#1B4332', opacity: 0.5 }}>
        Hola,
      </p>
      <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>
        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Wubi'}
      </h1>

      <div
        className="mt-6 rounded-2xl p-5"
        style={{
          backgroundColor: '#1B4332',
          boxShadow: '0 8px 32px rgba(27,67,50,0.25)',
        }}
      >
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.6)' }}>
          Balance total
        </p>
        <p className="text-3xl font-bold mt-1" style={{ color: '#F5F0E8' }}>
          $0.00
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(245,240,232,0.4)' }}>
          MXN
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#1B4332' }}>
          Últimos movimientos
        </h2>
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-2"
          style={{ backgroundColor: '#EDE8DF' }}
        >
          <span className="text-3xl">📊</span>
          <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
            Sin movimientos aún
          </p>
          <p className="text-xs text-center" style={{ color: '#1B4332', opacity: 0.35 }}>
            Toca el botón + para agregar tu primera transacción
          </p>
        </div>
      </div>
    </div>
  )
}
