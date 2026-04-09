import { sportColor, sportLabel } from '@/lib/utils'
export default function SportBadge({ sport }) {
  const l = sportLabel(sport)
  if (!l) return null
  return <span className="sport-badge" style={{ display:'inline-block', padding:'2px 5px', fontSize:8, fontFamily:"'Courier Prime',monospace", fontWeight:700, letterSpacing:0.5, color:'#fff', background:sportColor(sport), borderRadius:2, minWidth:28, textAlign:'center' }}>{l}</span>
}
