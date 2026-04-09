export default function FounderBadge({ number }) {
  if (!number || number > 1000) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      marginLeft: 4, verticalAlign: 'middle',
    }}>
      <svg width="10" height="14" viewBox="0 0 10 14" style={{ verticalAlign: 'middle' }}>
        <path d="M0,0 L10,0 L10,12 L5,14 L0,12 Z" fill="#c49a2a"/>
        <path d="M1,0.8 L9,0.8 L9,11.2 L5,13 L1,11.2 Z" fill="#b5563a"/>
      </svg>
      <span className="sans" style={{
        fontSize: 8, fontWeight: 800, color: 'var(--gold)',
        letterSpacing: 0.3, verticalAlign: 'middle',
      }}>#{number}</span>
    </span>
  )
}
