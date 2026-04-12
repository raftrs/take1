import Link from 'next/link'
export default function TopLogo() {
  return (
    <Link href="/" style={{ display:'block', textAlign:'center', padding:'10px 0 8px', textDecoration:'none', borderBottom:'1px solid var(--faint)' }}>
      <span style={{ fontSize:16, color:'var(--copper)', letterSpacing:3, fontFamily:"Georgia, serif" }}>raftrs</span>
    </Link>
  )
}
