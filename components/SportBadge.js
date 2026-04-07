import { sportColor, sportLabel } from '@/lib/utils'
export default function SportBadge({ sport }) {
  const l = sportLabel(sport)
  if (!l) return null
  return <span style={{ display:'inline-block', padding:'3px 8px', fontSize:9, fontFamily:'Arial,sans-serif', fontWeight:700, letterSpacing:1.5, color:'#fff', background:sportColor(sport) }}>{l}</span>
}
