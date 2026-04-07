'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist } from '@/lib/utils'
import BackButton from '@/components/BackButton'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'

export default function CollectionPage() {
  const { slug } = useParams()
  const name = decodeURIComponent(slug)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const restored = useRef(false)

  useEffect(() => { async function ld() {
    const { data } = await supabase.from('notable_games').select('id,title,game_date,away_team_abbr,home_team_abbr,away_score,home_score,venue,sport,description,tier').contains('collections',[name]).order('game_date',{ascending:true})
    setGames(data||[]); setLoading(false)
  }; ld() }, [name])

  // Restore scroll position after data loads
  useEffect(() => {
    if (!loading && games.length > 0 && !restored.current) {
      restored.current = true
      const saved = sessionStorage.getItem(`scroll-coll-${slug}`)
      if (saved) { setTimeout(() => window.scrollTo(0, parseInt(saved)), 50) }
    }
  }, [loading, games, slug])

  function handleClick(index) {
    const playlist = games.map(g => ({ href: `/notable/${g.id}`, title: g.title }))
    savePlaylist(playlist, index)
    sessionStorage.setItem(`scroll-coll-${slug}`, window.scrollY.toString())
  }

  if (loading) return <div className="loading">Loading...</div>
  return (
    <div>
      <TopLogo />
      <BackButton/>
      <div style={{ padding:'20px 20px 0' }}>
        <div className="sans" style={{ fontSize:9, color:'var(--gold)', letterSpacing:2.5, fontWeight:700, marginBottom:6 }}>COLLECTION</div>
        <div style={{ fontSize:24, color:'var(--ink)', marginBottom:4 }}>{name}</div>
        <div className="sans" style={{ fontSize:12, color:'var(--dim)' }}>{games.length} game{games.length!==1?'s':''}</div>
      </div>
      <hr className="sec-rule" style={{marginTop:16}}/><hr className="sec-rule-thin"/>
      <div style={{ padding:20 }}>{games.map((g, idx) => <Link key={g.id} href={`/notable/${g.id}`} onClick={() => handleClick(idx)} className="game-row" style={{ padding:'12px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          {g.tier === 1 && <span className="at-badge-sm">&#9733; ALL-TIMER</span>}
          <SportBadge sport={g.sport}/>
        </div>
        <div style={{ fontSize:15, color:'var(--ink)', marginTop:4 }}>{g.title}</div>
        {showScore(g) && <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{showScore(g)}</div>}
        <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:3 }}>{formatDate(g.game_date)}{g.venue?` \u00B7 ${g.venue}`:''}</div>
        {g.description && <div style={{ fontSize:11, color:'var(--muted)', marginTop:6, lineHeight:1.6 }}>{g.description}</div>}
      </Link>)}</div>
      <div style={{ height:80 }}></div>
    </div>
  )
}
