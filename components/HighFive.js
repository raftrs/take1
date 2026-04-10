'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function HFIcon({ size = 18, style = {} }) {
  return (
    <svg className="hf-icon" width={size} height={size} viewBox="0 0 1500 1500" fill="currentColor" style={style}>
      <path d="M1229.4 745.8c0 11.1-10.9 35.7-14.7 44.7-24.6 57-118.2 271.4-166.7 349.5-10.4 16.7-46.6 63.4-46.6 63.4l-.1-.1c-33.9 40.3-110.6 90.4-204 98.1-27.5 2.3-68.9 2.8-98.7 1.7-18.3-.6-320.3-20.2-320.3-390.4 0-12.1-.2-25.7-.2-25.7V438.8c0-20.8 26.8-44.6 60.7-44.6s59.4 23.8 59.4 53.1v263.2c0 10 3.4 18.1 15 18.1 11.6 0 17.6-8.1 17.6-18.1V264c0-28.4 25.1-51.7 57.1-54.2h19.3c32 2.4 57.1 25.8 57.1 54.2v412c0 10 6.1 18.1 17.6 18.1 11.6 0 17.6-8.1 17.6-18.1V207.1c0-30.4 27.4-55.2 61.8-56.9h15.6c34.5 1.7 61.8 26.5 61.8 56.9v451.4c0 10 6 18.1 17.5 18.1s18.8-8.1 18.8-18.1V292.7c0-30.1 30.8-54.4 65.4-54.4s63.4 24.3 63.4 54.4c0 51.4 0 432.1 0 580.6-80.5-13.5-195.4 23.3-257.1 112.1-.3.5-.6 1-.8 1.6-.2.6-.4 1.1-.5 1.7-.1.6-.1 1.2-.1 1.8 0 .6.1 1.2.2 1.8.1.6.3 1.1.5 1.7.2.6.5 1.1.8 1.6.3.5.7 1 1.1 1.4.4.4.9.8 1.4 1.1.5.3 1 .6 1.5.9.5.2 1.1.4 1.7.5.6.1 1.2.2 1.8.2.6 0 1.2 0 1.8-.1.6-.1 1.2-.2 1.7-.4.6-.2 1.1-.4 1.6-.8.5-.3 1-.6 1.4-1 .4-.4.9-.8 1.2-1.3 65.8-94.6 184.3-117 247.4-102.7.5.1 1.1.1 1.6.1 3.5.7 7.5-1.4 10-4.1 2.3-2.6 4.3-5.4 5.9-8.4l80.1-166.2s3.9-6.3 5-8 17.4-14 32.2-15.7c10.2-1.1 21.5.8 26.7 2 15.8 3.4 29.2 15 35.2 22.7 7 8.9 12.2 24.3 12.2 38.7z"/>
    </svg>
  )
}

export default function HighFive({ userGameId, size }) {
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
      setTimeout(() => setAnimating(false), 700)
    }
  }

  return (
    <button onClick={toggle} className="action-btn" style={{
      color: myHighFive ? 'var(--gold)' : 'var(--dim)',
      transition: 'color 0.2s',
    }}>
      <span className={`hf-wrap${animating ? ' animate' : ''}`}>
        <HFIcon size={size || 18} />
      </span>
      {count > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
    </button>
  )
}
