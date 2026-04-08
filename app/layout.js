import './globals.css'
import BottomNav from '@/components/BottomNav'
import Providers from '@/components/Providers'
export const metadata = { title: 'Raftrs', description: 'The games you carry with you' }
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Providers><div className="app-shell">{children}</div><BottomNav /></Providers></body></html>)
}
