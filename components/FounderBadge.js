export default function FounderBadge({ number }) {
  if (!number || number > 1000) return null
  return (
    <span className="sans" style={{
      display: 'inline-block', marginLeft: 5,
      fontSize: 9, fontWeight: 700, color: 'var(--gold)',
      verticalAlign: 'super', lineHeight: 1, letterSpacing: 0.3,
    }}>#{number}</span>
  )
}
