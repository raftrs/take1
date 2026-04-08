'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { formatDate, sportLabel, showScore } from '@/lib/utils'
import TopLogo from '@/components/TopLogo'
import SportBadge from '@/components/SportBadge'

export default function LogPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [sport, setSport] = useState('basketball')
  const [teams, setTeams] = useState([])
  const [team1, setTeam1] = useState('')
  const [team2, setTeam2] = useState('')
  const [team1Search, setTeam1Search] = useState('')
  const [team2Search, setTeam2Search] = useState('')
  const [team1Suggestions, setTeam1Suggestions] = useState([])
  const [team2Suggestions, setTeam2Suggestions] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)

  // Load teams for sport
  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('team_abbr,full_name,sport').eq('sport', sport).eq('active', true).order('full_name')
      setTeams(data || [])
      setTeam1(''); setTeam2(''); setTeam1Search(''); setTeam2Search(''); setGames([])
    }
    loadTeams()
  }, [sport])

  function filterTeams(q, exclude) {
    if (q.length < 1) return []
    return teams.filter(t => t.team_abbr !== exclude && (t.full_name.toLowerCase().includes(q.toLowerCase()) || t.team_abbr.toLowerCase().includes(q.toLowerCase()))).slice(0, 6)
  }

  function selectTeam1(t) {
    setTeam1(t.team_abbr); setTeam1Search(t.full_name); setTeam1Suggestions([])
  }
  function selectTeam2(t) {
    setTeam2(t.team_abbr); setTeam2Search(t.full_name); setTeam2Suggestions([])
  }

  // Fetch matchups when both teams selected
  useEffect(() => {
    if (!team1 || !team2) { setGames([]); return }
    async function loadGames() {
      setLoading(true)
      const { data } = await supabase.from('games').select('id,title,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info,venue')
        .or(`and(home_team_abbr.eq.${team1},away_team_abbr.eq.${team2}),and(home_team_abbr.eq.${team2},away_team_abbr.eq.${team1})`)
        .order('game_date', { ascending: false })
        .limit(100)
      setGames(data || [])
      setLoading(false)
    }
    loadGames()
  }, [team1, team2])

  if (!user) {
    return (
      <div>
        <TopLogo />
        <div style={{ padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:18, color:'var(--ink)', marginBottom:12 }}>Sign in to start logging</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:20, lineHeight:1.5 }}>Rate games, share stories, track your venues, and build your collection.</div>
          <div onClick={() => router.push('/auth')} style={{ display:'inline-block', padding:'14px 36px', background:'var(--copper)', color:'#fff', fontSize:13, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, cursor:'pointer' }}>SIGN IN</div>
        </div>
        <div style={{ height:80 }}></div>
      </div>
    )
  }

  const inputStyle = { width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid var(--faint)', background:'var(--card)', color:'var(--ink)', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div>
      <TopLogo />
      <div style={{ padding:'20px' }}>
        <div style={{ fontSize:20, color:'var(--ink)', marginBottom:4 }}>Log a Game</div>
        <div className="sans" style={{ fontSize:11, color:'var(--dim)', marginBottom:16 }}>Pick two teams to find their matchups</div>

        {/* Sport picker */}
        <div className="att-toggle" style={{ marginBottom:16 }}>
          {['basketball', 'football', 'golf'].map(s => (
            <button key={s} className={`att-opt${sport===s?' on':''}`} onClick={() => setSport(s)}>
              {s === 'basketball' ? 'NBA' : s === 'football' ? 'NFL' : 'Golf'}
            </button>
          ))}
        </div>

        {sport !== 'golf' ? (<>
          {/* Team 1 */}
          <div style={{ marginBottom:12, position:'relative' }}>
            <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginBottom:4 }}>TEAM 1</div>
            <input style={inputStyle} placeholder="Search teams..." value={team1Search}
              onChange={e => { setTeam1Search(e.target.value); setTeam1(''); setTeam1Suggestions(filterTeams(e.target.value, team2)) }}
              onFocus={() => { if (team1Search) setTeam1Suggestions(filterTeams(team1Search, team2)) }}
            />
            {team1Suggestions.length > 0 && <div style={{ position:'absolute', left:0, right:0, zIndex:10, border:'1px solid var(--faint)', background:'var(--card)', borderTop:'none' }}>
              {team1Suggestions.map(t => <div key={t.team_abbr} onClick={() => selectTeam1(t)} style={{ padding:'10px 14px', fontSize:13, color:'var(--ink)', cursor:'pointer', borderBottom:'1px solid var(--faint)' }}>
                {t.full_name} <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{t.team_abbr}</span>
              </div>)}
            </div>}
          </div>

          {/* Team 2 */}
          <div style={{ marginBottom:16, position:'relative' }}>
            <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginBottom:4 }}>TEAM 2</div>
            <input style={inputStyle} placeholder="Search teams..." value={team2Search}
              onChange={e => { setTeam2Search(e.target.value); setTeam2(''); setTeam2Suggestions(filterTeams(e.target.value, team1)) }}
              onFocus={() => { if (team2Search) setTeam2Suggestions(filterTeams(team2Search, team1)) }}
            />
            {team2Suggestions.length > 0 && <div style={{ position:'absolute', left:0, right:0, zIndex:10, border:'1px solid var(--faint)', background:'var(--card)', borderTop:'none' }}>
              {team2Suggestions.map(t => <div key={t.team_abbr} onClick={() => selectTeam2(t)} style={{ padding:'10px 14px', fontSize:13, color:'var(--ink)', cursor:'pointer', borderBottom:'1px solid var(--faint)' }}>
                {t.full_name} <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{t.team_abbr}</span>
              </div>)}
            </div>}
          </div>

          {/* Results */}
          {loading && <div className="loading" style={{ padding:20 }}>Finding matchups...</div>}

          {team1 && team2 && !loading && games.length === 0 && (
            <div className="sans" style={{ fontSize:12, color:'var(--dim)', textAlign:'center', padding:20 }}>No playoff matchups found between these teams.</div>
          )}

          {games.length > 0 && (
            <div>
              <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginBottom:10 }}>{games.length} MATCHUP{games.length !== 1 ? 'S' : ''}</div>
              <div style={{ maxHeight:400, overflowY:'auto' }}>
                {games.map(g => (
                  <div key={g.id} onClick={() => router.push(`/game/${g.id}`)} className="game-row" style={{ padding:'12px 0', cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ fontSize:14, color:'var(--ink)' }}>{showScore(g) || g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>
                      <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{formatDate(g.game_date)}</span>
                    </div>
                    {g.series_info && <div className="sans" style={{ fontSize:10, color:'var(--copper)', marginTop:2 }}>{g.series_info}</div>}
                    {g.venue && <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:1 }}>{g.venue}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>) : (
          /* Golf: just search by tournament name */
          <div>
            <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:1.5, fontWeight:600, marginBottom:4 }}>TOURNAMENT</div>
            <input style={inputStyle} placeholder="Search tournaments (e.g. 2019 Masters)..." value={team1Search}
              onChange={e => {
                setTeam1Search(e.target.value)
                if (e.target.value.length >= 3) {
                  supabase.from('games').select('id,title,game_date,venue,sport').eq('sport','golf').ilike('title', `%${e.target.value}%`).order('game_date', { ascending: false }).limit(15)
                    .then(({ data }) => setGames(data || []))
                } else setGames([])
              }}
            />
            {games.length > 0 && <div style={{ marginTop:12, maxHeight:400, overflowY:'auto' }}>
              {games.map(g => (
                <div key={g.id} onClick={() => router.push(`/game/${g.id}`)} className="game-row" style={{ padding:'12px 0', cursor:'pointer' }}>
                  <div style={{ fontSize:14, color:'var(--ink)' }}>{g.title}</div>
                  <div className="sans" style={{ fontSize:10, color:'var(--dim)', marginTop:2 }}>{formatDate(g.game_date)}{g.venue ? ` \u00B7 ${g.venue}` : ''}</div>
                </div>
              ))}
            </div>}
          </div>
        )}
      </div>
      <div style={{ height:80 }}></div>
    </div>
  )
}
