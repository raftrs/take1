'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'

const V = { bg: '#1e120a', card: '#2a1a10', border: '#3d2a1a', text: '#d4c4b0', dim: '#8a7a68', gold: '#c49a2a', cream: '#f0e8d8' }

export default function VaultPage() {
  const [allTimers, setAllTimers] = useState({ basketball: [], football: [], golf: [], baseball: [] })
  const [collections, setCollections] = useState([])
  const [notables, setNotables] = useState([])
  const [atSort, setAtSort] = useState('desc')
  const [atSport, setAtSport] = useState('all')
  const [showAllAT, setShowAllAT] = useState(false)
  const [showAllNotables, setShowAllNotables] = useState(false)
  const [notableSort, setNotableSort] = useState('desc')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: at } = await supabase.from('notable_games')
        .select('id,title,game_date,sport,tier,description,venue,home_team_abbr,away_team_abbr,home_score,away_score')
        .eq('tier', 1).not('description', 'is', null).order('game_date', { ascending: false })
      if (at?.length) {
        setAllTimers({
          basketball: at.filter(g => g.sport === 'basketball'),
          football: at.filter(g => g.sport === 'football'),
          golf: at.filter(g => g.sport === 'golf'),
          baseball: at.filter(g => g.sport === 'baseball'),
        })
      }
      const { data: cg } = await supabase.from('notable_games')
        .select('collections,sport').not('collections', 'is', null).eq('tier', 1)
      if (cg) {
        const counts = {}, collSports = {}
        cg.forEach(g => {
          if (Array.isArray(g.collections)) g.collections.forEach(c => {
            counts[c] = (counts[c] || 0) + 1
            if (!collSports[c]) collSports[c] = new Set()
            if (g.sport) collSports[c].add(g.sport)
          })
        })
        const skip = new Set(['Game 7s', 'Super Bowls', 'Greatest Playoff Games', 'Greatest Super Bowls', 'Greatest Majors'])
        setCollections(Object.entries(counts).filter(([name]) => !skip.has(name)).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, sports: [...(collSports[name] || [])] })))
      }
      const { data: t2 } = await supabase.from('notable_games')
        .select('id,title,game_date,sport,tier').eq('tier', 2).order('game_date', { ascending: false }).limit(500)
      setNotables(t2 || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  const heroPool = atSport === 'all'
    ? [...allTimers.basketball, ...allTimers.football, ...allTimers.golf, ...allTimers.baseball]
    : allTimers[atSport] || []
  const hero = (() => {
    if (!heroPool.length) return null
    const today = new Date(), mm = String(today.getMonth() + 1).padStart(2, '0'), dd = String(today.getDate()).padStart(2, '0')
    const todayGames = heroPool.filter(g => g.game_date?.endsWith(`-${mm}-${dd}`))
    if (todayGames.length > 0) return { type: 'today', game: todayGames[Math.floor(Math.random() * todayGames.length)] }
    return { type: 'random', game: heroPool[Math.floor(Math.random() * heroPool.length)] }
  })()
  const heroGame = hero?.game
  const allAT = heroPool
  const sortedAT = [...allAT].sort((a, b) => atSort === 'desc' ? (b.game_date || '').localeCompare(a.game_date || '') : (a.game_date || '').localeCompare(b.game_date || ''))
  const displayAT = showAllAT ? sortedAT : sortedAT.slice(0, 20)
  const filteredNotables = atSport === 'all' ? notables : notables.filter(g => g.sport === atSport)
  const sortedNotables = [...filteredNotables].sort((a, b) => notableSort === 'desc' ? (b.game_date || '').localeCompare(a.game_date || '') : (a.game_date || '').localeCompare(b.game_date || ''))
  const filteredCollections = atSport === 'all' ? collections : collections.filter(c => c.sports?.includes(atSport))

  return (
    <div style={{ background: V.bg, minHeight: '100vh' }}>
      <TopLogo />

      {/* Museum header */}
      <div style={{ padding: '32px 20px 20px', borderBottom: `1px solid ${V.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="sans" style={{ fontSize: 9, letterSpacing: 5, color: V.gold, fontWeight: 700, marginBottom: 8, opacity: 0.7 }}>WELCOME TO</div>
          <div style={{ fontSize: 28, color: V.cream, letterSpacing: 1 }}>The Vault</div>
          <div style={{ width: 40, height: 1, background: V.gold, margin: '12px auto', opacity: 0.4 }} />
          <div style={{ fontSize: 12, color: V.dim, fontStyle: 'italic' }}>The games, the collections, the ones that matter.</div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[{ k: 'all', l: 'All' }, { k: 'basketball', l: 'NBA' }, { k: 'football', l: 'NFL' }, { k: 'golf', l: 'Golf' }, { k: 'baseball', l: 'MLB' }].map(s => (
            <button key={s.k} onClick={() => setAtSport(s.k)} className="sans" style={{
              padding: '5px 14px', fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              border: atSport === s.k ? `1.5px solid ${V.gold}` : `1.5px solid ${V.border}`,
              borderRadius: 4, backgroundColor: atSport === s.k ? V.gold : 'transparent',
              color: atSport === s.k ? V.bg : V.dim, cursor: 'pointer',
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      {heroGame && (
        <Link href={`/notable/${heroGame.id}`} style={{ display: 'block', padding: '24px 20px', borderBottom: `1px solid ${V.border}`, textDecoration: 'none' }}>
          <div className="sans" style={{ fontSize: 9, color: hero.type === 'today' ? V.gold : V.dim, letterSpacing: 2.5, fontWeight: 700, marginBottom: 10 }}>
            {hero.type === 'today' ? 'ON THIS DAY' : 'FEATURED ALL-TIMER'}
          </div>
          <div style={{ fontSize: 20, color: V.cream, lineHeight: 1.3, marginBottom: 6 }}>{heroGame.title}</div>
          {showScore(heroGame) && <div style={{ fontSize: 14, color: V.text, marginBottom: 4 }}>{showScore(heroGame)}</div>}
          <div className="sans" style={{ fontSize: 11, color: V.dim }}>{formatDate(heroGame.game_date)}{heroGame.venue ? ` \u00B7 ${heroGame.venue}` : ''}</div>
          {heroGame.description && <div style={{ fontSize: 13, color: V.text, marginTop: 12, lineHeight: 1.7 }}>{heroGame.description}</div>}
        </Link>
      )}

      {/* ALL-TIMERS */}
      <div style={{ padding: 20, borderBottom: `1px solid ${V.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="sans" style={{ fontSize: 9, letterSpacing: 2.5, fontWeight: 700, color: V.gold }}>ALL-TIMERS ({allAT.length})</div>
          <div style={{ display: 'flex' }}>
            {['Recent', 'Oldest'].map(s => {
              const v = s === 'Recent' ? 'desc' : 'asc'
              return <button key={s} onClick={() => setAtSort(v)} className="sans" style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: v === atSort ? V.gold : V.dim, borderBottom: v === atSort ? `2px solid ${V.gold}` : '2px solid transparent' }}>{s}</button>
            })}
          </div>
        </div>
        <div style={{ maxHeight: showAllAT ? 'none' : 500, overflowY: showAllAT ? 'visible' : 'auto' }}>
          {displayAT.map((g, idx) => (
            <Link key={g.id} href={`/notable/${g.id}`} onClick={() => savePlaylist(sortedAT.map(a => ({ href: `/notable/${a.id}`, title: a.title })), idx)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: `1px solid ${V.border}`, textDecoration: 'none' }}>
              <span style={{ fontSize: 10, color: V.gold }}>&#9733;</span>
              <SportBadge sport={g.sport} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: V.cream }}>{g.title}</div>
                <div className="sans" style={{ fontSize: 10, color: V.dim, marginTop: 2 }}>{formatDate(g.game_date)}</div>
              </div>
            </Link>
          ))}
        </div>
        {sortedAT.length > 20 && (
          <div onClick={() => setShowAllAT(!showAllAT)} className="sans" style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: V.gold, cursor: 'pointer', fontWeight: 600 }}>
            {showAllAT ? 'Show fewer' : `See all ${sortedAT.length} All-Timers`}
          </div>
        )}
      </div>

      {/* COLLECTIONS */}
      {filteredCollections.length > 0 && (
        <div style={{ padding: 20, borderBottom: `1px solid ${V.border}` }}>
          <div className="sans" style={{ fontSize: 9, letterSpacing: 2.5, fontWeight: 700, color: V.gold, marginBottom: 14 }}>COLLECTIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {filteredCollections.map(c => (
              <Link key={c.name} href={`/collection/${encodeURIComponent(c.name)}`} style={{
                padding: '14px 12px', backgroundColor: V.card, border: `1px solid ${V.border}`,
                borderRadius: 6, textDecoration: 'none',
              }}>
                <div style={{ fontSize: 14, color: V.cream, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</div>
                <div className="sans" style={{ fontSize: 11, color: V.dim, marginTop: 4 }}>{c.count} game{c.count !== 1 ? 's' : ''}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* NOTABLES */}
      {sortedNotables.length > 0 && (
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="sans" style={{ fontSize: 9, letterSpacing: 2.5, fontWeight: 700, color: V.gold }}>NOTABLE GAMES ({sortedNotables.length})</div>
            <div style={{ display: 'flex' }}>
              {['Recent', 'Oldest'].map(s => {
                const v = s === 'Recent' ? 'desc' : 'asc'
                return <button key={s} onClick={() => setNotableSort(v)} className="sans" style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: v === notableSort ? V.gold : V.dim, borderBottom: v === notableSort ? `2px solid ${V.gold}` : '2px solid transparent' }}>{s}</button>
              })}
            </div>
          </div>
          <div className="sans" style={{ fontSize: 10, color: V.dim, marginBottom: 14 }}>Great games that didn't quite reach All-Timer status.</div>
          {(showAllNotables ? sortedNotables : sortedNotables.slice(0, 15)).map(g => (
            <Link key={g.id} href={`/notable/${g.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${V.border}`, textDecoration: 'none' }}>
              <SportBadge sport={g.sport} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: V.cream }}>{g.title}</div>
                <div className="sans" style={{ fontSize: 10, color: V.dim, marginTop: 2 }}>{formatDate(g.game_date)}</div>
              </div>
            </Link>
          ))}
          {sortedNotables.length > 15 && (
            <div onClick={() => setShowAllNotables(!showAllNotables)} className="sans" style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: V.gold, cursor: 'pointer', fontWeight: 600 }}>
              {showAllNotables ? 'Show fewer' : `See all ${sortedNotables.length}`}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
