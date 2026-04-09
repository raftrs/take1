'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const { user, signUp, signIn } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [favoriteTeams, setFavoriteTeams] = useState([])
  const [teamSuggestions, setTeamSuggestions] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) router.push('/profile')
  }, [user])

  useEffect(() => {
    if (teamSearch.length < 2) { setTeamSuggestions([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('teams').select('id,full_name,sport,team_abbr').or(`full_name.ilike.%${teamSearch}%,city.ilike.%${teamSearch}%`).eq('active', true).limit(6)
      setTeamSuggestions(data || [])
    }, 200)
    return () => clearTimeout(t)
  }, [teamSearch])

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setSubmitting(true)
    if (mode === 'signup') {
      if (!username.trim() || !email.trim() || !password.trim()) { setError('Fill in all fields'); setSubmitting(false); return }
      if (password.length < 6) { setError('Password must be at least 6 characters'); setSubmitting(false); return }
      const { error: e } = await signUp(email, password, username.trim(), displayName.trim() || username.trim(), city.trim(), favoriteTeams.map(t => t.team_abbr))
      if (e) setError(e.message)
      else setSuccess('Check your email to confirm your account.')
    } else {
      const { error: e } = await signIn(email, password)
      if (e) setError(e.message)
    }
    setSubmitting(false)
  }

  function addTeam(team) {
    if (!favoriteTeams.find(t => t.id === team.id)) {
      setFavoriteTeams([...favoriteTeams, team])
    }
    setTeamSearch('')
    setTeamSuggestions([])
  }

  function removeTeam(id) {
    setFavoriteTeams(favoriteTeams.filter(t => t.id !== id))
  }

  const inputStyle = { width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid var(--faint)', background:'var(--card)', color:'var(--ink)', fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 }

  return (
    <div>
      <div style={{ padding:'40px 20px 20px', textAlign:'center' }}>
        <div style={{ fontSize:28, color:'var(--ink)', letterSpacing:4, marginBottom:8 }}>raftrs</div>
        <div style={{ fontSize:14, color:'var(--muted)', fontStyle:'italic', marginBottom:32 }}>Share the stories you&apos;ll never forget.</div>
      </div>

      <div style={{ padding:'0 20px' }}>
        <div className="att-toggle" style={{ marginBottom:24 }}>
          <button className={`att-opt${mode==='signin'?' on':''}`} onClick={() => { setMode('signin'); setError(''); setSuccess('') }}>Sign In</button>
          <button className={`att-opt${mode==='signup'?' on':''}`} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Create Account</button>
        </div>

        {mode === 'signup' && (<>
          <input style={inputStyle} placeholder="Username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
          <input style={inputStyle} placeholder="Display name (optional)" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </>)}

        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

        {mode === 'signup' && (<>
          <input style={inputStyle} placeholder="Your city (e.g. Springfield, MO)" value={city} onChange={e => setCity(e.target.value)} />

          <div style={{ marginBottom:12 }}>
            <input style={{...inputStyle, marginBottom:4}} placeholder="Your teams (search to add)" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} />
            {teamSuggestions.length > 0 && <div style={{ border:'1px solid var(--faint)', background:'var(--card)' }}>
              {teamSuggestions.map(t => <div key={t.id} onClick={() => addTeam(t)} style={{ padding:'8px 12px', fontSize:13, color:'var(--ink)', cursor:'pointer', borderBottom:'1px solid var(--faint)' }}>
                {t.full_name} <span className="sans" style={{ fontSize:10, color:'var(--dim)' }}>{t.sport}</span>
              </div>)}
            </div>}
            {favoriteTeams.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {favoriteTeams.map(t => <span key={t.id} className="sans" style={{ fontSize:11, padding:'4px 10px', background:'rgba(181,86,58,0.08)', color:'var(--copper)', border:'1px solid var(--copper)', cursor:'pointer' }} onClick={() => removeTeam(t.id)}>
                {t.full_name} &times;
              </span>)}
            </div>}
          </div>
        </>)}

        {error && <div className="sans" style={{ fontSize:12, color:'#c0392b', marginBottom:12 }}>{error}</div>}
        {success && <div className="sans" style={{ fontSize:12, color:'#27ae60', marginBottom:12 }}>{success}</div>}

        <div onClick={handleSubmit} style={{
          padding:'14px 0', background:'var(--copper)', color:'#fff', textAlign:'center',
          fontSize:13, fontFamily:"'Libre Franklin',sans-serif", fontWeight:600, letterSpacing:1,
          cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1,
          marginBottom:16
        }}>
          {submitting ? 'WORKING...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </div>

        {mode === 'signin' && <div className="sans" style={{ fontSize:11, color:'var(--dim)', textAlign:'center' }}>
          Don&apos;t have an account? <span style={{ color:'var(--copper)', cursor:'pointer' }} onClick={() => setMode('signup')}>Create one</span>
        </div>}
      </div>

      <div style={{ height:80 }}></div>
    </div>
  )
}
