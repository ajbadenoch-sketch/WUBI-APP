import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Informes from './pages/Informes'
import AskWubi from './pages/AskWubi'
import Cartera from './pages/Cartera'
import Grupos from './pages/Grupos'
import Metas from './pages/Metas'
import Deudas from './pages/Deudas'
import Recurrentes from './pages/Recurrentes'
import Calendario from './pages/Calendario'
import NewTransaction from './pages/NewTransaction'
import Toast from './components/Toast'

function App() {
  const { session, loading, setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  if (loading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ backgroundColor: '#F5F0E8' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
            style={{ backgroundColor: '#1B4332', color: '#F5F0E8' }}
          >
            W
          </div>
          <div
            className="h-1 w-16 rounded-full overflow-hidden"
            style={{ backgroundColor: '#EDE8DF' }}
          >
            <div
              className="h-full w-1/2 rounded-full animate-[shimmer_1s_ease-in-out_infinite_alternate]"
              style={{ backgroundColor: '#52B788' }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/informes" element={<Informes />} />
              <Route path="/ask-wubi" element={<AskWubi />} />
              <Route path="/cartera" element={<Cartera />} />
              <Route path="/grupos" element={<Grupos />} />
              <Route path="/metas" element={<Metas />} />
              <Route path="/deudas" element={<Deudas />} />
              <Route path="/recurrentes" element={<Recurrentes />} />
              <Route path="/calendario" element={<Calendario />} />
            </Route>
            <Route path="/transaction/new" element={<NewTransaction />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
