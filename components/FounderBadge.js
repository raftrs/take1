export default function FounderBadge({ number }) {
  if (!number || number > 1000) return null
  return (
    <span style={{ display:'inline-flex', alignItems:'center', marginLeft:4, verticalAlign:'middle' }}>
      <svg width="16" height="22" viewBox="0 0 34 50" style={{ verticalAlign:'middle' }}>
        <path d="M0,0 L34,0 L34,50 L17,43 L0,50 Z" fill="#b5563a"/>
        <path d="M3.5,3.5 L30.5,3.5 L30.5,44 L17,38.5 L3.5,44 Z" fill="#d4a843" opacity="0.85"/>
        <path d="M7,7 L27,7 L27,39.5 L17,34.5 L7,39.5 Z" fill="#b5563a"/>
        <text x="17" y="24" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="'Libre Franklin',sans-serif">{number}</text>
      </svg>
    </span>
  )
}
