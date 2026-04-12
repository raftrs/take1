export default function FounderBadge({ number }) {
  if (!number || number > 1000) return null
  return (
    <span className="founder-mark">#{number}</span>
  )
}
