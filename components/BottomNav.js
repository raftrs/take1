'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
const HIDE = ['/game/','/notable/','/collection/','/venue/','/team/','/player/','/city/','/auth']
export default function BottomNav() {
  const path = usePathname()
  if (HIDE.some(p => path.startsWith(p))) return null
  const tabs = [
    { href:'/', label:'Home', d:'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z' },
    { href:'/browse', label:'Browse', d:'M4 6h16M4 12h16M4 18h7' },
    { href:'/log', label:'Log', raised:true },
    { href:'/search', label:'Search', d:'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35' },
    { href:'/profile', label:'Profile', d:'M12 2L4 8v14l8-4 8 4V8z' },
  ]
  return (
    <div className="bottom-nav">
      {tabs.map(t => {
        const active = t.href === '/' ? path === '/' : path.startsWith(t.href)
        const c = active ? '#b5563a' : '#a09888'
        if (t.raised) return (
          <Link key={t.href} href={t.href} className="nav-tab" style={{ position:'relative' }}>
            <div style={{
              width:46, height:46, borderRadius:'50%', background:'var(--copper)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginTop:-18, boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{width:22,height:22}}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <span className="nav-label" style={{color:'var(--copper)', marginTop:2}}>Log</span>
          </Link>
        )
        return (
          <Link key={t.href} href={t.href} className="nav-tab">
            <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" style={{width:22,height:22}}><path d={t.d}/></svg>
            <span className="nav-label" style={{color:c}}>{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
