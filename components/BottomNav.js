'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const tabs = [
  { href:'/', label:'Home', icon:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { href:'/log', label:'Log', icon:'M4 19V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2z', extra:'M14 3v5h5M9 13h6M9 17h3' },
  { href:'/browse', label:'Explore', circle:true },
  { href:'/profile', label:'Profile', icon:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', circle2:true },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <div className="bottom-nav">
      {tabs.map(t => {
        const active = t.href === '/' ? path === '/' : path?.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href} className={`nav-tab${active ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--amber)' : 'var(--dim)'} strokeWidth="1.5">
              {t.circle ? <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></> : null}
              {t.circle2 ? <><path d={t.icon}/><circle cx="12" cy="7" r="4"/></> : null}
              {!t.circle && !t.circle2 ? <path d={t.icon}/> : null}
              {t.extra ? <path d={t.extra}/> : null}
            </svg>
            <span className="nav-label">{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
