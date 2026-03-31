import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/dashboard', label: 'Inicio', icon: HomeIcon },
  { path: '/informes', label: 'Informes', icon: ChartIcon },
  { path: '/ask-wubi', label: 'Ask Wubi', icon: null },
  { path: '/cartera', label: 'Cartera', icon: CardIcon },
  { path: '/grupos', label: 'Grupos', icon: PeopleIcon },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end justify-around px-2 h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path
          const isWubi = tab.path === '/ask-wubi'

          if (isWubi) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center -mt-5 transition-transform active:scale-90"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: isActive ? '#1B4332' : '#52B788',
                    boxShadow: '0 4px 16px rgba(82,183,136,0.4)',
                  }}
                >
                  <span className="text-white text-xl font-black" style={{ letterSpacing: '-1px' }}>
                    W
                  </span>
                </div>
                <span
                  className="text-[10px] mt-1 font-medium"
                  style={{ color: isActive ? '#1B4332' : '#9CA3AF' }}
                >
                  {tab.label}
                </span>
              </button>
            )
          }

          const Icon = tab.icon!
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 py-2 px-3 transition-colors"
            >
              <Icon color={isActive ? '#1B4332' : '#9CA3AF'} />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#1B4332' : '#9CA3AF' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChartIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function CardIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
