'use client'
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const PROMPTS = {
  game: [
    "I was at _____ watching this with...",
    "The text I sent after this game...",
    "Where I was when this happened...",
    "The moment I knew it was over...",
    "The call I made before the game started...",
    "What I tell people about this game...",
    "The thing nobody talks about from this game...",
    "How this game ended my night...",
    "The person I wish had seen this game...",
    "The text thread after this one...",
  ],
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function StoryOverlay({ gameId, onClose }) {
  const { user } = useAuth()
  const [stack, setStack] = useState(() => shuffle(PROMPTS.game))
  const [story, setStory] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const front = stack[0] || ''

  const doShuffle = useCallback(() => {
    setStack(prev => [...prev.slice(1), prev[0]])
  }, [])

  async function handleSave() {
    if (!story.trim() || !user) return
    setSaving(true)
    await supabase.from('user_games').update({ story: story.trim() }).eq('user_id', user.id).eq('game_id', gameId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'var(--cream)', display:'flex', flexDirection:'column',
      overflow:'auto',
    }}>
      <div style={{ padding:'20px 20px 0', display:'flex', justifyContent:'flex-end' }}>
        <div onClick={onClose} className="sans" style={{ fontSize:11, color:'var(--dim)', cursor:'pointer', padding:'6px 12px', border:'1px solid var(--faint)' }}>Skip</div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
        {saved ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🖐</div>
            <div style={{ fontSize:18, color:'var(--ink)' }}>Story saved.</div>
          </div>
        ) : (<>
          <div style={{ fontSize:18, color:'var(--ink)', marginBottom:24, textAlign:'center', lineHeight:1.4 }}>You logged it. Now tell us about it.</div>

          {/* Prompt card stack */}
          <div style={{ position:'relative', height:170, width:'100%', maxWidth:300, marginBottom:20 }}>
            <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-48%) rotate(6deg)', width:160, height:150, background:'var(--card)', borderRadius:6, borderLeft:'3px solid var(--faint)', border:'1px solid var(--faint)', zIndex:1 }} />
            <div style={{ position:'absolute', top:3, left:'50%', transform:'translateX(-49%) rotate(3deg)', width:160, height:150, background:'var(--card)', borderRadius:6, borderLeft:'3px solid var(--faint)', border:'1px solid var(--faint)', zIndex:2 }} />
            <div onClick={() => { setStory(front); }} style={{
              position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
              width:160, height:150, background:'var(--card)', borderRadius:6,
              borderLeft:'3px solid var(--copper)', borderTop:'1px solid var(--faint)', borderRight:'1px solid var(--faint)', borderBottom:'1px solid var(--faint)',
              zIndex:3, cursor:'pointer', padding:'16px 18px', display:'flex', alignItems:'center',
            }}>
              <div style={{ fontSize:13, color:'var(--copper)', fontFamily:"'Crete Round',Georgia,serif", lineHeight:1.5 }}>{front}</div>
            </div>
          </div>

          <div onClick={doShuffle} className="sans" style={{ fontSize:9, color:'var(--copper)', fontWeight:600, letterSpacing:1, cursor:'pointer', marginBottom:20, display:'flex', alignItems:'center', gap:4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
            SHUFFLE PROMPTS
          </div>

          <textarea
            value={story}
            onChange={e => setStory(e.target.value)}
            placeholder="Or write your own..."
            style={{
              width:'100%', maxWidth:300, height:140, padding:14, fontSize:14,
              border:'1px solid var(--faint)', background:'var(--card)', color:'var(--ink)',
              fontFamily:'inherit', resize:'none', boxSizing:'border-box',
            }}
          />

          <div onClick={handleSave} style={{
            marginTop:16, padding:'14px 48px', background: story.trim() ? 'var(--copper)' : 'var(--faint)',
            color: story.trim() ? '#fff' : 'var(--dim)', textAlign:'center',
            fontSize:13, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1,
            cursor: story.trim() ? 'pointer' : 'default',
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'SAVING...' : 'SHARE YOUR STORY'}
          </div>
        </>)}
      </div>
    </div>
  )
}
