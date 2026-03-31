import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-between px-8 py-16"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-10 w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <WubiLogo />
          <div className="text-center">
            <h1
              className="text-5xl font-bold tracking-tight"
              style={{ color: '#1B4332' }}
            >
              Wubi
            </h1>
            <p className="text-base mt-2" style={{ color: '#1B4332', opacity: 0.6 }}>
              Tus finanzas, claras y simples
            </p>
          </div>
        </div>

        {/* Auth section */}
        <div className="w-full flex flex-col gap-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-center bg-red-50 text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60"
            style={{
              backgroundColor: '#1B4332',
              color: '#F5F0E8',
              boxShadow: '0 4px 20px rgba(27,67,50,0.35)',
            }}
          >
            {loading ? (
              <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-center" style={{ color: '#1B4332', opacity: 0.4 }}>
        Al continuar, aceptas nuestros{' '}
        <span className="underline cursor-pointer">Términos de servicio</span>
      </p>
    </div>
  )
}

function WubiLogo() {
  return (
    <div
      className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl font-black"
      style={{
        backgroundColor: '#1B4332',
        color: '#F5F0E8',
        boxShadow: '0 8px 32px rgba(27,67,50,0.3)',
        letterSpacing: '-2px',
      }}
    >
      W
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
