'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { formatDate, showScore, isPlayoff, scoreWithWinner } from '@/lib/utils';
import SportBadge from '@/components/SportBadge';

import GameFinder from '@/components/GameFinder'

export default function LogPage() {
  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh' }}>
      <div style={{ padding: '32px 24px 0' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--ink)' }}>Your Scorebook</div>
        <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>Find games. Tell stories. Log encounters.</div>
      </div>
      <hr className="heavy-rule" style={{ margin: '16px 24px 0' }} />
      <div style={{ padding: 24, borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <div className="sec-head">Find a Matchup</div>
        <GameFinder />
      </div>
      <SaySomethingSection />
      <LogEncounter />
      <RecentlyPlayed />
    </div>
  );
}

function RecentlyPlayed() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rpSport, setRpSport] = useState('all');
  useEffect(() => {
    setLoading(true);
    let q = supabase.from('games').select('id,title,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info').order('game_date', { ascending: false }).limit(30);
    if (rpSport !== 'all') q = q.eq('sport', rpSport);
    q.then(({ data }) => {
      let filtered = (data || []).filter(g => { if (g.sport !== 'golf') return true; const t = (g.title || '').toLowerCase(); return !(t.includes('korn ferry') || t.includes('champions tour') || t.includes('senior') || t.includes('q-school') || t.includes('legends')); });
      setGames(filtered.slice(0, 10)); setLoading(false);
    });
  }, [rpSport]);
  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--rule)', background: 'var(--bg)' }}>
      <div className="sec-head">Recently Played</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, marginTop: -4 }}>
        {[{k:'all',l:'All'},{k:'basketball',l:'NBA'},{k:'football',l:'NFL'},{k:'golf',l:'PGA'},{k:'baseball',l:'MLB'}].map(s => (
          <button key={s.k} onClick={() => setRpSport(s.k)} className={`rp-tab${rpSport === s.k ? ' active' : ''}`}>{s.l}</button>
        ))}
      </div>
      {loading ? <p style={{ fontFamily: 'var(--ui)', color: 'var(--dim)', fontSize: 11 }}>Loading...</p> : (
        <div>{games.map(g => {
          const sc = scoreWithWinner(g); const playoff = isPlayoff(g.series_info);
          return (
            <div key={g.id} className="rp-row" onClick={() => router.push(`/game/${g.id}`)}>
              <SportBadge sport={g.sport} />
              {g.sport === 'golf' ? <span className="rp-score" style={{ fontFamily: 'var(--body)' }}>{g.title || 'Tournament'}</span>
              : sc ? <span className="rp-score">{sc.away.won ? `${sc.away.abbr} ${sc.away.score}` : <span className="lose">{sc.away.abbr} {sc.away.score}</span>}{' / '}{sc.home.won ? `${sc.home.abbr} ${sc.home.score}` : <span className="lose">{sc.home.score} {sc.home.abbr}</span>}</span>
              : <span className="rp-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</span>}
              {playoff && g.series_info && <span className="rp-tag">{g.series_info}</span>}
              <span className="rp-date">{formatDate(g.game_date)}</span>
            </div>
          );
        })}</div>
      )}
    </div>
  );
}

function SaySomethingSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pSearch, setPSearch] = useState(''); const [pOpts, setPOpts] = useState([]); const [selP, setSelP] = useState(null);
  const [tSearch, setTSearch] = useState(''); const [tOpts, setTOpts] = useState([]); const [selT, setSelT] = useState(null);
  const [vSearch, setVSearch] = useState(''); const [vOpts, setVOpts] = useState([]); const [selV, setSelV] = useState(null);
  const [selGame, setSelGame] = useState(null);

  const pickMode = (m) => { if (mode === m) { setMode(null); return; } setMode(m); setStory(''); setSaved(false); setPSearch(''); setPOpts([]); setSelP(null); setTSearch(''); setTOpts([]); setSelT(null); setVSearch(''); setVOpts([]); setSelV(null); setSelGame(null); };
  useEffect(() => { if (pSearch.length < 2 || selP) { setPOpts([]); return; } supabase.from('players').select('id,player_name,sport,position').ilike('player_name', `%${pSearch}%`).limit(8).then(({ data }) => setPOpts(data || [])); }, [pSearch, selP]);
  useEffect(() => { if (tSearch.length < 2 || selT) { setTOpts([]); return; } supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color').or(`full_name.ilike.%${tSearch}%,team_name.ilike.%${tSearch}%,city.ilike.%${tSearch}%`).limit(8).then(({ data }) => setTOpts(data || [])); }, [tSearch, selT]);
  useEffect(() => { if (vSearch.length < 2 || selV) { setVOpts([]); return; } supabase.from('venues').select('id,venue_name,venue_city,sport').ilike('venue_name', `%${vSearch}%`).limit(8).then(({ data }) => setVOpts(data || [])); }, [vSearch, selV]);

  const placeholder = mode === 'Player' && selP ? `Say something about ${selP.player_name}...` : mode === 'Team' && selT ? `Say something about the ${selT.team_name}...` : mode === 'Arena' && selV ? `Say something about ${selV.venue_name}...` : mode === 'Game' && selGame ? 'Say something about this game...' : "What's on your mind?";
  const canSave = story.trim().length > 0 && user;
  const handleSave = async () => { if (!canSave) return; setSaving(true); if (mode === 'Game' && selGame) { await supabase.from('user_games').upsert({ user_id: user.id, game_id: selGame.id, story: story.trim() }, { onConflict: 'user_id,game_id' }); } setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
      <div className="sec-head">Say Something About...</div>
      <div className="prompt-row">
        {['Player','Team','Game','Arena'].map(c => <button key={c} onClick={() => pickMode(c)} className={`prompt-btn${mode === c ? ' active' : ''}`}>{c}</button>)}
      </div>

      {mode === 'Player' && <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); }} placeholder="Search for a player..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 4, borderBottom: selP ? '2px solid var(--amber)' : undefined }} />
        {pOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{pOpts.map(p => <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}><SportBadge sport={p.sport} /><span>{p.player_name}</span>{p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}</div>)}</div>}
      </div>}
      {mode === 'Team' && <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={tSearch} onChange={e => { setTSearch(e.target.value); setSelT(null); }} placeholder="Search for a team..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 4, borderBottom: selT ? '2px solid var(--amber)' : undefined }} />
        {tOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{tOpts.map(t => <div key={t.id} className="ac-item" onClick={() => { setSelT(t); setTSearch(t.full_name); setTOpts([]); }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || 'var(--amber)', flexShrink: 0 }} /><span>{t.full_name}</span></div>)}</div>}
      </div>}
      {mode === 'Arena' && <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={vSearch} onChange={e => { setVSearch(e.target.value); setSelV(null); }} placeholder="Search for an arena or course..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 4, borderBottom: selV ? '2px solid var(--amber)' : undefined }} />
        {vOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{vOpts.map(v => <div key={v.id} className="ac-item" onClick={() => { setSelV(v); setVSearch(v.venue_name); setVOpts([]); }}><span>{v.venue_name}</span><span className="ac-sub" style={{ marginLeft: 'auto' }}>{v.venue_city}</span></div>)}</div>}
      </div>}
      {mode === 'Game' && <div style={{ marginBottom: 12 }}><GameFinder onSelect={setSelGame} /></div>}

      {mode && <div className="notepad" style={{ marginTop: 8 }}>
        <textarea value={story} onChange={e => setStory(e.target.value)} placeholder={placeholder} rows={4} />
        <div className="notepad-bar">
          {!user && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>Sign in to post</span>}
          <button onClick={handleSave} disabled={!canSave || saving} className={`post-btn${canSave ? '' : ' off'}`}>{saving ? 'Saving...' : saved ? 'Saved' : 'Post'}</button>
        </div>
      </div>}
    </div>
  );
}

function LogEncounter() {
  const { user } = useAuth();
  const [pSearch, setPSearch] = useState(''); const [pOpts, setPOpts] = useState([]); const [selP, setSelP] = useState(null);
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (pSearch.length < 2 || selP) { setPOpts([]); return; } supabase.from('players').select('id,player_name,sport,position').ilike('player_name', `%${pSearch}%`).limit(8).then(({ data }) => setPOpts(data || [])); }, [pSearch, selP]);
  const canSave = selP && user;
  const handleSave = async () => { if (!canSave) return; setSaving(true); await supabase.from('encounters').insert({ user_id: user.id, player_id: selP.id, location: location.trim() || null, year: year ? parseInt(year) : null, story: story.trim() || null }); setSaving(false); setSaved(true); setTimeout(() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); setSaved(false); }, 2000); };

  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--rule)', background: 'var(--bg)' }}>
      <div className="sec-head">Log an Encounter</div>
      <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)', marginBottom: 14, marginTop: -8 }}>Met a player? Saw them at the airport? Got an autograph?</div>
      <div className="scorecard">
        <div className="sc-row"><div className="sc-label">Player</div><div style={{ flex: 1, position: 'relative' }}>
          <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); setSaved(false); }} placeholder="Who did you meet?" className="sc-input" />
          {pOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{pOpts.map(p => <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}><SportBadge sport={p.sport} /><span>{p.player_name}</span>{p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}</div>)}</div>}
        </div></div>
        <div className="sc-row"><div className="sc-label">Where</div><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="sc-input" /></div>
        <div className="sc-row"><div className="sc-label">Year</div><input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" inputMode="numeric" className="sc-input" /></div>
        <div className="sc-row"><div className="sc-label">Story</div><textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Tell the story..." rows={3} className="sc-input" style={{ resize: 'vertical', lineHeight: 1.6 }} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} disabled={!canSave || saving} className={`post-btn${canSave ? '' : ' off'}`}>{saving ? 'Saving...' : saved ? 'Logged' : 'Log Encounter'}</button>
        {(selP || location || year || story) && !saved && <button onClick={() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); }} className="action-btn">Clear</button>}
        {!user && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>Sign in to log</span>}
      </div>
    </div>
  );
}
