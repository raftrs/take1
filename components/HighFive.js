'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function HandIcon({ style = {} }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M18 11V6a2 2 0 0 0-4 0v1"/>
      <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
      <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8H9a8 8 0 0 1-5.6-2.4"/>
    </svg>
  )
}

export default function HighFive({ userGameId }) {
  const [count, setCount] = useState(0)
  const [myHighFive, setMyHighFive] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    async function load() {
      const { count: c } = await supabase.from('story_high_fives')
        .select('id', { count: 'exact', head: true }).eq('user_game_id', userGameId)
      setCount(c || 0)
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
      setTimeout(() => setAnimating(false), 600)
    }
  }

  return (
    <button onClick={toggle} className="sans" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', fontSize: 11, fontWeight: 600,
      background: 'none', border: 'none', cursor: 'pointer',
      color: myHighFive ? 'var(--copper)' : 'var(--dim)',
      position: 'relative', overflow: 'hidden',
      transition: 'color 0.2s',
    }}>
      <span style={{ position: 'relative', display: 'inline-flex', width: 22, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        {/* Main hand */}
        <span style={{
          display: 'inline-flex', position: 'absolute', left: 0,
          transform: animating ? 'scale(1.15) rotate(-8deg)' : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}>
          <HandIcon />
        </span>
        {/* Swooping second hand */}
        <span style={{
          position: 'absolute', left: 2, top: 0,
          display: 'inline-flex',
          opacity: animating ? 1 : 0,
          transform: animating ? 'translateX(-2px) scaleX(-1) rotate(8deg)' : 'translateX(16px) scaleX(-1) rotate(30deg)',
          transition: animating ? 'all 0.2s cubic-bezier(0.2, 0, 0.2, 1)' : 'all 0.3s ease-in 0.15s',
          color: 'var(--copper)',
        }}>
          <HandIcon />
        </span>
      </span>
      {count > 0 && <span style={{
        transform: animating ? 'scale(1.3)' : 'scale(1)',
        transition: 'transform 0.2s ease-out',
        fontVariantNumeric: 'tabular-nums',
      }}>{count}</span>}
    </button>
  )
}
