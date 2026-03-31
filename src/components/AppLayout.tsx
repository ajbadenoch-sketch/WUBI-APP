import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import FloatingActionButton from './FloatingActionButton'

export default function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <FloatingActionButton />
      <BottomNav />
    </div>
  )
}
