'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// userGameId = the user_games.id of the story
export default function HighFive({ userGameId }) {
  const [count, setCount] = useState(0)
  const [myHighFive, setMyHighFive] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    async function load() {
      // Get count
      const { count: c } = await supabase.from('story_high_fives')
        .select('id', { count: 'exact', head: true }).eq('user_game_id', userGameId)
      setCount(c || 0)
      // Check if current user high-fived
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('story_high_fives')
          .select('id').eq('user_game_id', userGameId).eq('user_id', user.id).limit(1)
        if (data?.length) setMyHighFive(true)
      }
    }
    load()
  }, [userGameId])

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (myHighFive) {
      await supabase.from('story_high_fives').delete().eq('user_game_id', userGameId).eq('user_id', user.id)
      setMyHighFive(false)
      setCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('story_high_fives').insert({ user_game_id: userGameId, user_id: user.id })
      setMyHighFive(true)
      setCount(c => c + 1)
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }
  }

  return (
    <button onClick={toggle} className="sans" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', fontSize: 11, fontWeight: 600,
      background: 'none', border: 'none', cursor: 'pointer',
      color: myHighFive ? 'var(--copper)' : 'var(--dim)',
      transition: 'all 0.2s',
      transform: animating ? 'scale(1.3)' : 'scale(1)',
    }}>
      <span style={{ fontSize: 14 }}>{myHighFive ? '\u270B' : '\u270B'}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
