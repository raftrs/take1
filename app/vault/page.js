'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatDate, showScore, savePlaylist } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'
import TopLogo from '@/components/TopLogo'

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
      // All tier 1 with descriptions
      const { data: at } = await supabase.from('notable_games')
        .select('id,title,game_date,sport,tier,description,venue,home_team_abbr,away_team_abbr,home_score,away_score')
        .eq('tier', 1).not('description', 'is', null)
        .order('game_date', { ascending: false })

      if (at?.length) {
        setAllTimers({
          basketball: at.filter(g => g.sport === 'basketball'),
          football: at.filter(g => g.sport === 'football'),
          golf: at.filter(g => g.sport === 'golf'),
          baseball: at.filter(g => g.sport === 'baseball'),
        })
      }

      // Collections with counts and sport info
      const { data: cg } = await supabase.from('notable_games')
        .select('collections,sport').not('collections', 'is', null).eq('tier', 1)
      if (cg) {
        const counts = {}
        const collSports = {}
        cg.forEach(g => {
          if (Array.isArray(g.collections)) g.collections.forEach(c => {
            counts[c] = (counts[c] || 0) + 1
            if (!collSports[c]) collSports[c] = new Set()
            if (g.sport) collSports[c].add(g.sport)
          })
        })
        const skip = new Set(['Game 7s', 'Super Bowls', 'Greatest Playoff Games', 'Greatest Super Bowls', 'Greatest Majors'])
        setCollections(
          Object.entries(counts)
            .filter(([name]) => !skip.has(name))
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, sports: [...(collSports[name] || [])] }))
        )
      }

      // Tier 2 notables
      const { data: t2 } = await supabase.from('notable_games')
        .select('id,title,game_date,sport,tier')
        .eq('tier', 2).order('game_date', { ascending: false }).limit(500)
      setNotables(t2 || [])

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Loading...</div>

  // Pick featured hero based on sport filter
  const heroPool = atSport === 'all'
    ? [...allTimers.basketball, ...allTimers.football, ...allTimers.golf, ...allTimers.baseball]
    : allTimers[atSport] || []

  const hero = (() => {
    if (!heroPool.length) return null
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `-${mm}-${dd}`
    const todayGames = heroPool.filter(g => g.game_date?.endsWith(todayStr))
    if (todayGames.length > 0) return { type: 'today', game: todayGames[Math.floor(Math.random() * todayGames.length)] }
    return { type: 'random', game: heroPool[Math.floor(Math.random() * heroPool.length)] }
  })()

  const allAT = heroPool
  const sortedAT = [...allAT].sort((a, b) =>
    atSort === 'desc' ? (b.game_date || '').localeCompare(a.game_date || '') : (a.game_date || '').localeCompare(b.game_date || '')
  )
  const displayAT = showAllAT ? sortedAT : sortedAT.slice(0, 20)

  const filteredNotables = atSport === 'all' ? notables : notables.filter(g => g.sport === atSport)
  const sortedNotables = [...filteredNotables].sort((a, b) =>
    notableSort === 'desc' ? (b.game_date || '').localeCompare(a.game_date || '') : (a.game_date || '').localeCompare(b.game_date || '')
  )

  const filteredCollections = atSport === 'all' ? collections : collections.filter(c => c.sports?.includes(atSport))

  const heroGame = hero?.game

  return (
    <div>
      <TopLogo />
      {/* Museum entrance */}
      <div style={{ background:'linear-gradient(180deg, #3d1f0e 0%, #2a1508 100%)', padding:'32px 20px 20px', borderBottom:'3px solid var(--gold)' }}>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:11, letterSpacing:6, color:'var(--gold)', fontWeight:700, fontFamily:'Arial,sans-serif', marginBottom:8, opacity:0.8 }}>WELCOME TO</div>
          <div style={{ fontSize:28, color:'#f5f0e8', letterSpacing:2 }}>The Vault</div>
          <div style={{ fontSize:12, color:'#a08b70', marginTop:8, fontStyle:'italic', lineHeight:1.6 }}>The games, the collections, the ones that matter.</div>
        </div>
        {/* Sport filter */}
        <div style={{ display: 'flex', gap: 6, justifyContent:'center' }}>
          {[{ k: 'all', l: 'All' }, { k: 'basketball', l: 'NBA' }, { k: 'football', l: 'NFL' }, { k: 'golf', l: 'Golf' }, { k: 'baseball', l: 'MLB' }].map(s => (
            <button key={s.k} onClick={() => setAtSport(s.k)} className="sans" style={{
              padding: '5px 14px', fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              border: atSport === s.k ? '1.5px solid var(--gold)' : '1.5px solid #5a4a3a',
              borderRadius: 4, backgroundColor: atSport === s.k ? 'var(--gold)' : 'transparent',
              color: atSport === s.k ? '#1a1508' : '#a08b70', cursor: 'pointer',
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      {heroGame && (<>
        <hr className="sec-rule" /><hr className="sec-rule-thin" />
        <Link href={`/notable/${heroGame.id}`} style={{ display: 'block', padding: '20px', textDecoration: 'none' }}>
          <div className="sans" style={{ fontSize: 9, color: hero.type === 'today' ? 'var(--copper)' : 'var(--dim)', letterSpacing: 2.5, fontWeight: 700, marginBottom: 8 }}>
            {hero.type === 'today' ? 'ON THIS DAY' : 'FEATURED ALL-TIMER'}
          </div>
          <div style={{ fontSize: 20, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 6 }}>{heroGame.title}</div>
          {showScore(heroGame) && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>{showScore(heroGame)}</div>}
          <div className="sans" style={{ fontSize: 11, color: 'var(--dim)' }}>{formatDate(heroGame.game_date)}{heroGame.venue ? ` \u00B7 ${heroGame.venue}` : ''}</div>
          {heroGame.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>{heroGame.description}</div>}
        </Link>
      </>)}

      {/* ALL-TIMERS */}
      <hr className="sec-rule" /><hr className="sec-rule-thin" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="sec-head" style={{ marginBottom: 0 }}>ALL-TIMERS ({allAT.length})</div>
          <div style={{ display: 'flex' }}>
            {['Recent', 'Oldest'].map(s => {
              const v = s === 'Recent' ? 'desc' : 'asc'
              return <button key={s} onClick={() => setAtSort(v)} className="sans" style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: v === atSort ? 'var(--copper)' : 'var(--dim)', borderBottom: v === atSort ? '2px solid var(--copper)' : '2px solid transparent' }}>{s}</button>
            })}
          </div>
        </div>

        {/* Sport filter is now global at top of page */}

        <div style={{ maxHeight: showAllAT ? 'none' : 600, overflowY: showAllAT ? 'visible' : 'auto' }}>
          {displayAT.map((g, idx) => (
            <Link key={g.id} href={`/notable/${g.id}`} onClick={() => {
              savePlaylist(sortedAT.map(a => ({ href: `/notable/${a.id}`, title: a.title })), idx)
            }} className="game-row" style={{ padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="at-badge-sm">&#9733;</span>
                <SportBadge sport={g.sport} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{g.title}</div>
                  <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(g.game_date)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {sortedAT.length > 20 && (
          <div className="box-toggle" onClick={() => setShowAllAT(!showAllAT)} style={{ textAlign: 'center', marginTop: 8 }}>
            {showAllAT ? 'Show fewer \u2191' : `See all ${sortedAT.length} All-Timers \u2193`}
          </div>
        )}
      </div>

      {/* COLLECTIONS */}
      {filteredCollections.length > 0 && (<>
        <hr className="sec-rule" /><hr className="sec-rule-thin" />
        <div style={{ padding: 20 }}>
          <div className="sec-head">COLLECTIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {filteredCollections.map(c => (
              <Link key={c.name} href={`/collection/${encodeURIComponent(c.name)}`} style={{
                padding: '14px 12px', backgroundColor: 'var(--card)', border: '1px solid var(--faint)',
                borderRadius: 6, textDecoration: 'none',
              }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.3 }}>{c.name}</div>
                <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{c.count} game{c.count !== 1 ? 's' : ''}</div>
              </Link>
            ))}
          </div>
        </div>
      </>)}

      {/* NOTABLES (Tier 2) */}
      {sortedNotables.length > 0 && (<>
        <hr className="sec-rule" /><hr className="sec-rule-thin" />
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="sec-head" style={{ marginBottom: 0 }}>NOTABLE GAMES ({sortedNotables.length})</div>
            <div style={{ display: 'flex' }}>
              {['Recent', 'Oldest'].map(s => {
                const v = s === 'Recent' ? 'desc' : 'asc'
                return <button key={s} onClick={() => setNotableSort(v)} className="sans" style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: v === notableSort ? 'var(--copper)' : 'var(--dim)', borderBottom: v === notableSort ? '2px solid var(--copper)' : '2px solid transparent' }}>{s}</button>
              })}
            </div>
          </div>
          <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 14 }}>Great games that didn't quite reach All-Timer status.</div>
          {(showAllNotables ? sortedNotables : sortedNotables.slice(0, 15)).map((g, idx) => (
            <Link key={g.id} href={`/notable/${g.id}`} className="game-row" style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SportBadge sport={g.sport} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)' }}>{g.title}</div>
                  <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatDate(g.game_date)}</div>
                </div>
              </div>
            </Link>
          ))}
          {sortedNotables.length > 15 && (
            <div className="box-toggle" onClick={() => setShowAllNotables(!showAllNotables)} style={{ textAlign: 'center', marginTop: 8 }}>
              {showAllNotables ? 'Show fewer \u2191' : `See all ${sortedNotables.length} \u2193`}
            </div>
          )}
        </div>
      </>)}

      <div style={{ height: 80 }}></div>
    </div>
  )
}
