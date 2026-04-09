'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Props: gameId (from games table) OR notableGameId (from notable_games table)
export default function RaftersButton({ gameId, notableGameId }) {
  const [isRafted, setIsRafted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSlots, setShowSlots] = useState(false)
  const [slots, setSlots] = useState([])

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: favs } = await supabase.from('favorite_games').select('*').eq('user_id', user.id)
      if (favs) {
        setSlots(favs)
        const match = favs.find(f =>
          (gameId && f.game_id === parseInt(gameId)) ||
          (notableGameId && f.notable_game_id === parseInt(notableGameId))
        )
        if (match) setIsRafted(true)
      }
    }
    check()
  }, [gameId, notableGameId])

  async function handleTap() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Sign in to add to your Rafters'); return }

    if (isRafted) {
      // Remove it
      setLoading(true)
      if (gameId) await supabase.from('favorite_games').delete().eq('user_id', user.id).eq('game_id', parseInt(gameId))
      if (notableGameId) await supabase.from('favorite_games').delete().eq('user_id', user.id).eq('notable_game_id', parseInt(notableGameId))
      setIsRafted(false)
      setLoading(false)
      return
    }

    // Refresh slots
    const { data: favs } = await supabase.from('favorite_games').select('*').eq('user_id', user.id).order('position')
    const currentSlots = favs || []
    setSlots(currentSlots)

    if (currentSlots.length < 5) {
      // Find next open position
      const usedPositions = new Set(currentSlots.map(f => f.position))
      let nextPos = 1
      for (let i = 1; i <= 5; i++) { if (!usedPositions.has(i)) { nextPos = i; break } }
      setLoading(true)
      const row = { user_id: user.id, position: nextPos }
      if (notableGameId) row.notable_game_id = parseInt(notableGameId)
      else if (gameId) row.game_id = parseInt(gameId)
      await supabase.from('favorite_games').insert(row)
      setIsRafted(true)
      setLoading(false)
    } else {
      // All 5 slots full, show picker
      setShowSlots(true)
    }
  }

  async function replaceSlot(position) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    // Delete the existing one at this position
    await supabase.from('favorite_games').delete().eq('user_id', user.id).eq('position', position)
    // Insert new
    const row = { user_id: user.id, position }
    if (notableGameId) row.notable_game_id = parseInt(notableGameId)
    else if (gameId) row.game_id = parseInt(gameId)
    await supabase.from('favorite_games').insert(row)
    setIsRafted(true)
    setShowSlots(false)
    setLoading(false)
  }

  return (
    <>
      <button onClick={handleTap} disabled={loading} className="sans" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        border: isRafted ? '1.5px solid var(--copper)' : '1.5px solid var(--faint)',
        borderRadius: 4, cursor: 'pointer',
        background: isRafted ? 'rgba(181,86,58,0.08)' : 'transparent',
        color: isRafted ? 'var(--copper)' : 'var(--dim)',
        transition: 'all 0.2s', marginTop: 12,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isRafted ? 'var(--copper)' : 'none'} stroke={isRafted ? 'var(--copper)' : 'var(--dim)'} strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        {isRafted ? 'In My Rafters' : 'Add to My Rafters'}
      </button>

      {/* Slot picker overlay */}
      {showSlots && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={() => setShowSlots(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 8, padding: 20,
            maxWidth: 320, width: '100%', border: '1px solid var(--faint)'
          }}>
            <div style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>My Rafters is full</div>
            <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 16 }}>Pick a slot to replace:</div>
            {[1,2,3,4,5].map(pos => {
              const slot = slots.find(s => s.position === pos)
              return (
                <div key={pos} onClick={() => replaceSlot(pos)} style={{
                  padding: '10px 12px', marginBottom: 6, border: '1px solid var(--faint)',
                  borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--card)',
                }}>
                  <span className="sans" style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 700, width: 16 }}>{pos}</span>
                  <span style={{ fontSize: 13, color: slot ? 'var(--ink)' : 'var(--dim)' }}>
                    {slot ? 'Slot ' + pos + ' (replace)' : 'Empty'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
