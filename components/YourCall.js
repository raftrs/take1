'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function YourCall({ gameId, notableGameId, onLogged }) {
  const { user } = useAuth()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [att, setAtt] = useState(null)
  const [logged, setLogged] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !gameId) return
    supabase.from('user_games').select('id,rating,attended').eq('user_id', user.id).eq('game_id', gameId).single()
      .then(({ data }) => {
        if (data) {
          setLogged(true)
          setRating(data.rating || 0)
          setAtt(data.attended ? 'there' : 'watched')
        }
      })
  }, [user, gameId])

  async function handleLog() {
    if (!user) { router.push('/auth'); return }
    if (!rating && !att) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      game_id: gameId,
      notable_game_id: notableGameId || null,
      rating: rating || null,
      attended: att === 'there',
    }
    if (logged) {
      await supabase.from('user_games').update(payload).eq('user_id', user.id).eq('game_id', gameId)
    } else {
      await supabase.from('user_games').upsert(payload)
    }
    setLogged(true)
    setSaving(false)
    if (onLogged) onLogged({ gameId, rating, attended: att === 'there' })
  }

  return (
    <div style={{ padding:'16px 0' }}>
      <div className="sec-head">YOUR CALL</div>
      <div className="star-row">
        {[1,2,3,4,5].map(n => (
          <button key={n} className={`star-btn ${rating >= n ? 'on' : ''}`} onClick={() => setRating(rating === n ? 0 : n)}>
            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
        ))}
      </div>
      <div className="att-toggle">
        <button className={`att-opt${att==='there'?' on':''}`} onClick={() => setAtt(att==='there'?null:'there')}>I Was There</button>
        <button className={`att-opt${att==='watched'?' on':''}`} onClick={() => setAtt(att==='watched'?null:'watched')}>Watched It</button>
      </div>
      <div className="log-btn" style={{ marginTop:12, opacity: saving ? 0.6 : 1 }} onClick={handleLog}>
        {saving ? 'SAVING...' : logged ? '✓ LOGGED' : 'LOG THIS GAME'}
      </div>
    </div>
  )
}
