import './globals.css'
import BottomNav from '@/components/BottomNav'
export const metadata = { title: 'Raftrs', description: 'The games you carry with you' }
export default function RootLayout({ children }) {
  return (<html lang="en"><body><div className="app-shell">{children}</div><BottomNav /></body></html>)
}
