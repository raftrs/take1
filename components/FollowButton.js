'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FollowButton({ targetUserId }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id === targetUserId) return
      const { data } = await supabase.from('follows')
        .select('id').eq('follower_id', user.id).eq('following_id', targetUserId).limit(1)
      if (data?.length) setFollowing(true)
    }
    check()
  }, [targetUserId])

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Sign in to follow people'); return }
    if (user.id === targetUserId) return
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading} className="sans" style={{
      padding: '6px 18px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      border: following ? '1.5px solid var(--copper)' : '1.5px solid var(--copper)',
      borderRadius: 4, cursor: 'pointer',
      background: following ? 'transparent' : 'var(--copper)',
      color: following ? 'var(--copper)' : '#fff',
      transition: 'all 0.2s',
    }}>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
