'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { sportLabel, sportColor } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import BackButton from '@/components/BackButton'
import TopLogo from '@/components/TopLogo'

const SPORT_TABS = [
  { k: 'all', l: 'All' },
  { k: 'basketball', l: 'NBA Arenas' },
  { k: 'football', l: 'NFL Stadiums' },
  { k: 'baseball', l: 'MLB Ballparks' },
  { k: 'golf', l: 'Golf Courses' },
]

export default function VenuesPage() {
  const { user } = useAuth()
  const [venues, setVenues] = useState([])
  const [visited, setVisited] = useState(new Set())
  const [sport, setSport] = useState('all')
  const [loading, setLoading] = useState(true)
  const [myList, setMyList] = useState(new Set())
  const [view, setView] = useState('all')

  useEffect(() => {
    async function load() {
      const { data: vn } = await supabase.from('venues').select('id,venue_name,venue_city,sport,description,capacity,opened,active')
        .not('description', 'is', null).order('sport').order('venue_name')
      setVenues(vn || [])

      if (user) {
        const { data: uv } = await supabase.from('user_venues').select('venue_id,status').eq('user_id', user.id)
        if (uv) {
          setVisited(new Set(uv.filter(v => !v.status || v.status === 'visited').map(v => v.venue_id)))
          setMyList(new Set(uv.filter(v => v.status === 'want').map(v => v.venue_id)))
        }
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function toggleVisit(venueId) {
    if (!user) { alert('Sign in to track venue visits'); return }
    const newVisited = new Set(visited)
    if (visited.has(venueId)) {
      newVisited.delete(venueId)
      await supabase.from('user_venues').delete().eq('user_id', user.id).eq('venue_id', venueId)
    } else {
      newVisited.add(venueId)
      const newMyList = new Set(myList); newMyList.delete(venueId); setMyList(newMyList)
      await supabase.from('user_venues').upsert({ user_id: user.id, venue_id: venueId, status: 'visited' }, { onConflict: 'user_id,venue_id' })
    }
    setVisited(newVisited)
  }

  let allFiltered = sport === 'all' ? venues : venues.filter(v => v.sport === sport)
  if (view === 'visited') allFiltered = allFiltered.filter(v => visited.has(v.id))
  if (view === 'mylist') allFiltered = allFiltered.filter(v => myList.has(v.id))
  const filtered = allFiltered.filter(v => v.active !== false)
  const historic = allFiltered.filter(v => v.active === false)

  // Progress per sport (only active venues)
  const progress = {}
  SPORT_TABS.filter(t => t.k !== 'all').forEach(t => {
    const sportVenues = venues.filter(v => v.sport === t.k && v.active !== false)
    const sportVisited = sportVenues.filter(v => visited.has(v.id))
    progress[t.k] = { total: sportVenues.length, visited: sportVisited.length }
  })
  const activeVenues = venues.filter(v => v.active !== false)
  const activeVisited = activeVenues.filter(v => visited.has(v.id))

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div>
      <TopLogo />
      <BackButton />
      <div style={{ padding: '20px 20px 0', borderBottom: '2px solid var(--rule)' }}>
        <div style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>Venue Checklist</div>
        {/* View toggle */}
        <div style={{ display:'flex', gap:4, marginBottom:10 }}>
          {[{k:'all',l:'All Venues'},{k:'visited',l:'Visited'},{k:'mylist',l:'My List'}].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} className={view === v.k ? 'prompt-btn active' : 'prompt-btn'} style={{ flex:'none' }}>{v.l}{v.k === 'visited' ? ` (${visited.size})` : v.k === 'mylist' ? ` (${myList.size})` : ''}</button>
          ))}
        </div>
        <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 12, fontStyle: 'italic' }}>
          {activeVisited.length} of {activeVenues.length} visited
        </div>

        {/* Sport tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
          {SPORT_TABS.map(s => (
            <button key={s.k} onClick={() => setSport(s.k)} className="sans" style={{
              padding: '5px 12px', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap',
              border: sport === s.k ? '1.5px solid var(--copper)' : '1.5px solid var(--faint)',
              borderRadius: 4, backgroundColor: sport === s.k ? 'var(--copper)' : 'transparent',
              color: sport === s.k ? '#fff' : 'var(--dim)', cursor: 'pointer',
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {/* Progress bars per sport */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--faint)' }}>
          {SPORT_TABS.filter(t => t.k !== 'all').filter(t => sport === 'all' || t.k === sport).map(t => {
            const p = progress[t.k]
            if (!p || p.total === 0) return null
            const pct = p.total > 0 ? (p.visited / p.total * 100) : 0
            return (
              <div key={t.k} style={{ marginBottom: 10 }}>
                <div className="sans" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', fontWeight: 600, marginBottom: 4 }}>
                  <span>{sportLabel(t.k)}</span>
                  <span>{p.visited} / {p.total}</span>
                </div>
                <div style={{ height: 4, background: 'var(--faint)', borderRadius: 2 }}>
                  <div style={{ height: 4, background: sportColor(t.k), borderRadius: 2, width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
        </div>

      {/* Venue list */}
      <div style={{ padding: '0 0 80px' }}>
        {filtered.map(v => {
          const isVisited = visited.has(v.id)
          return (
            <div key={v.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--faint)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <Link href={`/venue/${v.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{v.venue_name}</div>
                  <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                    {v.venue_city}
                    {v.capacity ? ` \u00B7 ${Number(v.capacity).toLocaleString()} capacity` : ''}
                  </div>
                  {v.description && (
                    <div className="sans" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {v.description}
                    </div>
                  )}
                </Link>
                <button onClick={() => toggleVisit(v.id)} className="sans" style={{
                  flexShrink: 0, padding: '6px 12px', fontSize: 10, fontWeight: 600,
                  border: isVisited ? '1.5px solid var(--copper)' : '1.5px solid var(--faint)',
                  borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: isVisited ? 'rgba(181,86,58,0.08)' : 'transparent',
                  color: isVisited ? 'var(--copper)' : 'var(--dim)',
                  transition: 'all 0.2s',
                }}>
                  {isVisited ? '\u2713 Visited' : 'Been here'}
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <div className="empty">No venues found for this sport.</div>}
      </div>

      {/* Historic venues */}
      {historic.length > 0 && (<>
        <div style={{ padding: '16px 20px 0', borderTop: '2px solid var(--rule)' }}>
          <div className="sec-head">HISTORIC VENUES ({historic.length})</div>
          <div className="sans" style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 12 }}>No longer active. Not counted toward your progress.</div>
        </div>
        <div style={{ padding: '0 0 80px' }}>
          {historic.map(v => {
            const isVisited = visited.has(v.id)
            return (
              <div key={v.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--faint)', opacity: 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <Link href={`/venue/${v.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{v.venue_name}</div>
                    <div className="sans" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                      {v.venue_city}
                      {v.capacity ? ` \u00B7 ${Number(v.capacity).toLocaleString()} capacity` : ''}
                    </div>
                    {v.description && (
                      <div className="sans" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {v.description}
                      </div>
                    )}
                  </Link>
                  <button onClick={() => toggleVisit(v.id)} className="sans" style={{
                    flexShrink: 0, padding: '6px 12px', fontSize: 10, fontWeight: 600,
                    border: isVisited ? '1.5px solid var(--copper)' : '1.5px solid var(--faint)',
                    borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: isVisited ? 'rgba(181,86,58,0.08)' : 'transparent',
                    color: isVisited ? 'var(--copper)' : 'var(--dim)',
                    transition: 'all 0.2s',
                  }}>
                    {isVisited ? '\u2713 Visited' : 'Been here'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </>)}
    </div>
  )
}
