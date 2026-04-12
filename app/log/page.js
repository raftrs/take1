'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { formatDate, showScore, isPlayoff, scoreWithWinner } from '@/lib/utils';
import SportBadge from '@/components/SportBadge';

/* ── Year Scroller ── */
function YearScroller({ value, onChange }) {
  const ref = useRef(null);
  const years = [];
  for (let y = new Date().getFullYear(); y >= 1967; y--) years.push(y);
  useEffect(() => {
    if (value && ref.current) {
      const el = ref.current.querySelector(`[data-y="${value}"]`);
      if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    }
  }, [value]);
  return (
    <div ref={ref} className="year-scroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      <style>{`.year-scroll::-webkit-scrollbar{display:none}`}</style>
      {years.map(y => {
        const active = value === String(y);
        return <button key={y} data-y={y} onClick={() => onChange(active ? '' : String(y))}
          className="mono" style={{
            padding: '5px 12px', flexShrink: 0, fontSize: 11, fontWeight: active ? 700 : 400,
            backgroundColor: active ? 'var(--copper)' : 'transparent',
            color: active ? 'var(--surface)' : 'var(--dim)',
            border: active ? '1.5px solid var(--copper)' : '1.5px solid var(--faint)',
            borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{y}</button>;
      })}
    </div>
  );
}

/* ── Sort Toggle ── */
function SortToggle({ value, onChange, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 }}>
      <div style={{ display: 'flex' }}>
        {['Recent', 'Oldest'].map(s => {
          const v = s === 'Recent' ? 'desc' : 'asc';
          return <button key={s} onClick={() => onChange(v)} className="rp-tab" style={{ borderBottomColor: v === value ? 'var(--copper)' : 'transparent', color: v === value ? 'var(--brown)' : 'var(--dim)' }}>{s}</button>;
        })}
      </div>
      {count > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>{count} game{count !== 1 ? 's' : ''}</span>}
    </div>
  );
}

/* ── Team Input ── */
function TeamInput({ value, onChange, selected, onSelect, onClear, sport, placeholder = 'Team' }) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    if (value.length < 2 || selected) { setOpts([]); return; }
    let q = supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color')
      .or(`full_name.ilike.%${value}%,team_name.ilike.%${value}%,team_abbr.ilike.%${value}%,city.ilike.%${value}%`);
    if (sport) q = q.eq('sport', sport);
    q.limit(8).then(({ data }) => setOpts(data || []));
  }, [value, selected, sport]);
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <input value={value} onChange={e => { onChange(e.target.value); if (selected) onClear(); }}
        placeholder={placeholder} className="sc-input" style={{ width: '100%', padding: '10px 12px', borderBottom: selected ? '2px solid var(--copper)' : '1px solid var(--faint)' }} />
      {opts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
        {opts.map(t => <button key={t.id} onClick={() => { onSelect(t); setOpts([]); }} className="ac-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--faint)', cursor: 'pointer' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || 'var(--copper)', flexShrink: 0 }} />
          <span>{t.full_name}</span>
          <span className="ac-sub" style={{ marginLeft: 'auto' }}>{t.sport === 'basketball' ? 'NBA' : t.sport === 'football' ? 'NFL' : t.sport === 'baseball' ? 'MLB' : ''}</span>
        </button>)}
      </div>}
    </div>
  );
}

/* ── Game Finder ── */
function GameFinder({ onSelect, selectable }) {
  const router = useRouter();
  const [sport, setSport] = useState('basketball');
  const [t1s, setT1s] = useState(''); const [t1, setT1] = useState(null);
  const [t2s, setT2s] = useState(''); const [t2, setT2] = useState(null);
  const [year, setYear] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('desc');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!onSelect) {
      const s = sessionStorage.getItem('log_matchup');
      if (s) { try { const d = JSON.parse(s); if (d.sport) setSport(d.sport); if (d.t1) { setT1(d.t1); setT1s(d.t1.team_name||''); } if (d.t2) { setT2(d.t2); setT2s(d.t2.team_name||''); } if (d.year) setYear(d.year); } catch(e){} }
    }
  }, [onSelect]);

  useEffect(() => {
    if (!onSelect) sessionStorage.setItem('log_matchup', JSON.stringify({ sport, t1, t2, year }));
  }, [sport, t1, t2, year, onSelect]);

  useEffect(() => {
    const hasYear = year.length === 4;
    const hasBoth = t1 && t2;
    const hasOne = t1 || t2;
    if (!hasBoth && !(hasOne && hasYear)) { setResults([]); return; }
    setLoading(true);
    let q = supabase.from('games')
      .select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info,nba_game_id')
      .order('game_date', { ascending: sort === 'asc' }).limit(100);
    if (hasBoth) q = q.or(`and(home_team_abbr.eq.${t1.team_abbr},away_team_abbr.eq.${t2.team_abbr}),and(home_team_abbr.eq.${t2.team_abbr},away_team_abbr.eq.${t1.team_abbr})`);
    else if (t1) q = q.or(`home_team_abbr.eq.${t1.team_abbr},away_team_abbr.eq.${t1.team_abbr}`);
    else if (t2) q = q.or(`home_team_abbr.eq.${t2.team_abbr},away_team_abbr.eq.${t2.team_abbr}`);
    if (hasYear) q = q.gte('game_date', `${year}-01-01`).lte('game_date', `${year}-12-31`);
    q.then(async ({ data }) => {
      const games = data || [];
      await Promise.all(games.slice(0, 20).map(async g => {
        if (g.sport === 'basketball' && g.nba_game_id) {
          const { data: bs } = await supabase.from('box_scores').select('player_name,points').eq('nba_game_id', g.nba_game_id).order('points', { ascending: false }).limit(1);
          if (bs?.[0]) g._top = bs[0];
        }
      }));
      const gameIds = games.map(g => g.id).filter(Boolean);
      if (gameIds.length > 0) {
        const { data: notables } = await supabase.from('notable_games').select('game_id,title,tier').in('game_id', gameIds).eq('tier', 1);
        if (notables) { const nMap = {}; notables.forEach(n => { nMap[n.game_id] = n; }); games.forEach(g => { if (nMap[g.id]) g._allTimer = nMap[g.id]; }); }
      }
      setResults(games);
      setLoading(false);
    });
  }, [t1, t2, year, sort, onSelect]);

  const clearAll = () => { setT1(null); setT2(null); setT1s(''); setT2s(''); setYear(''); setResults([]); setSelected(null); sessionStorage.removeItem('log_matchup'); };
  const handleGameClick = (g) => { if (onSelect) { setSelected(g); onSelect(g); } else router.push(`/game/${g.id}`); };

  return (
    <div>
      {/* Sport toggle */}
      <div className="prompt-row" style={{ marginBottom: 12 }}>
        {['basketball', 'football', 'baseball'].map(s => (
          <button key={s} onClick={() => { setSport(s); clearAll(); }} className={`prompt-btn${sport === s ? ' active' : ''}`}>
            {s === 'basketball' ? 'NBA' : s === 'football' ? 'NFL' : 'MLB'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <TeamInput value={t1s} onChange={setT1s} selected={t1} onSelect={t => { setT1(t); setT1s(t.team_name); }} onClear={() => { setT1(null); setSelected(null); }} sport={sport} />
        <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--dim)' }}>vs</span>
        <TeamInput value={t2s} onChange={setT2s} selected={t2} onSelect={t => { setT2(t); setT2s(t.team_name); }} onClear={() => { setT2(null); setSelected(null); }} sport={sport} />
      </div>

      <YearScroller value={year} onChange={setYear} />

      {(t1 || t2 || year) && <div style={{ marginTop: 6 }}>
        <button onClick={clearAll} className="mono" style={{ fontSize: 10, color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Clear all</button>
      </div>}

      {loading && <p className="mono" style={{ color: 'var(--dim)', fontSize: 11, marginTop: 8 }}>Finding games...</p>}
      {results.length > 0 && <>
        <SortToggle value={sort} onChange={setSort} count={results.length} />
        <div style={{ maxHeight: onSelect ? 240 : 'none', overflowY: onSelect ? 'auto' : 'visible', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {results.map(g => {
            const sc = scoreWithWinner(g);
            const playoff = isPlayoff(g.series_info);
            return (
              <button key={g.id} onClick={() => handleGameClick(g)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', backgroundColor: selected?.id === g.id ? 'var(--warm)' : 'var(--card)',
                border: selected?.id === g.id ? '1px solid var(--copper)' : '1px solid var(--faint)',
                borderLeft: playoff ? '3px solid var(--copper)' : undefined,
                borderRadius: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ flex: 1 }}>
                  {g._allTimer && <div className="mono" style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>&#9733; ALL-TIMER</div>}
                  {g._allTimer && <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--ink)', marginBottom: 3 }}>{g._allTimer.title}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SportBadge sport={g.sport} />
                    {sc ? (
                      <span className="game-ref-score">
                        <span className={sc.away.won ? '' : 'dim'}>{sc.away.abbr} {sc.away.score}</span>{' / '}<span className={sc.home.won ? '' : 'dim'}>{sc.home.abbr} {sc.home.score}</span>
                      </span>
                    ) : <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)' }}>{showScore(g)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                    {g.series_info && <span className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>{g.series_info}</span>}
                    {g._top && <span className="mono" style={{ fontSize: 10, color: 'var(--copper)' }}>{g._top.player_name} {g._top.points}pts</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--ink)', fontWeight: 700, lineHeight: 1 }}>{new Date(g.game_date + 'T00:00:00').getFullYear()}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>{formatDate(g.game_date)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </>}
      {(t1 || t2) && year.length === 4 && !loading && results.length === 0 && (
        <p className="mono" style={{ color: 'var(--dim)', fontSize: 11, fontStyle: 'italic', marginTop: 8 }}>No games found for that search.</p>
      )}
    </div>
  );
}

/* ── PAGE ── */
export default function LogPage() {
  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh' }}>
      {/* Page header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', letterSpacing: 1 }}>Your Scorebook</div>
        <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--dim)', fontStyle: 'italic', marginTop: 4 }}>Find games. Tell stories. Log encounters.</div>
      </div>
      <hr className="heavy-rule" style={{ margin: '14px 20px 0' }} />
      <FindMatchupSection />
      <SaySomethingSection />
      <LogEncounter />
      <RecentlyPlayed />
    </div>
  );
}

/* ── RECENTLY PLAYED ── */
function RecentlyPlayed() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rpSport, setRpSport] = useState('all');
  useEffect(() => {
    setLoading(true);
    let q = supabase.from('games')
      .select('id,title,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info')
      .order('game_date', { ascending: false }).limit(30);
    if (rpSport !== 'all') q = q.eq('sport', rpSport);
    q.then(({ data }) => {
      let filtered = (data || []).filter(g => {
        if (g.sport !== 'golf') return true;
        const t = (g.title || '').toLowerCase();
        return !(t.includes('korn ferry') || t.includes('champions tour') || t.includes('senior') || t.includes('q-school') || t.includes('legends'));
      });
      setGames(filtered.slice(0, 10));
      setLoading(false);
    });
  }, [rpSport]);
  return (
    <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--faint)' }}>
      <div className="sec-head">RECENTLY PLAYED</div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, marginTop: -6 }}>
        {[{k:'all',l:'All'},{k:'basketball',l:'NBA'},{k:'football',l:'NFL'},{k:'golf',l:'PGA'},{k:'baseball',l:'MLB'}].map(s => (
          <button key={s.k} onClick={() => setRpSport(s.k)} className={`rp-tab${rpSport === s.k ? ' active' : ''}`}>{s.l}</button>
        ))}
      </div>
      {loading ? <p className="mono" style={{ color: 'var(--dim)', fontSize: 11 }}>Loading...</p> : (
        <div>
          {games.map(g => {
            const sc = scoreWithWinner(g);
            const playoff = isPlayoff(g.series_info);
            return (
              <div key={g.id} className="rp-row" onClick={() => router.push(`/game/${g.id}`)}>
                <SportBadge sport={g.sport} />
                {g.sport === 'golf' ? (
                  <div className="rp-score" style={{ fontFamily: 'var(--body)' }}>{g.title || 'Tournament'}</div>
                ) : sc ? (
                  <div className="rp-score">
                    <span className={sc.away.won ? '' : 'dim'}>{sc.away.abbr} {sc.away.score}</span>
                    {' / '}
                    <span className={sc.home.won ? '' : 'dim'}>{sc.home.abbr} {sc.home.score}</span>
                  </div>
                ) : (
                  <div className="rp-score">{g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}</div>
                )}
                {playoff && g.series_info && <span className="rp-tag">{g.series_info}</span>}
                <span className="rp-date">{formatDate(g.game_date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── SAY SOMETHING ── */
const CARDS = [
  { key: 'Player', label: 'PLAYER' },
  { key: 'Team', label: 'TEAM' },
  { key: 'Game', label: 'GAME' },
  { key: 'Arena', label: 'ARENA' },
];

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

  const pickMode = (m) => {
    if (mode === m) { setMode(null); return; }
    setMode(m); setStory(''); setSaved(false);
    setPSearch(''); setPOpts([]); setSelP(null);
    setTSearch(''); setTOpts([]); setSelT(null);
    setVSearch(''); setVOpts([]); setSelV(null);
    setSelGame(null);
  };

  useEffect(() => { if (pSearch.length < 2 || selP) { setPOpts([]); return; } supabase.from('players').select('id,player_name,sport,position').ilike('player_name', `%${pSearch}%`).limit(8).then(({ data }) => setPOpts(data || [])); }, [pSearch, selP]);
  useEffect(() => { if (tSearch.length < 2 || selT) { setTOpts([]); return; } supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color').or(`full_name.ilike.%${tSearch}%,team_name.ilike.%${tSearch}%,city.ilike.%${tSearch}%`).limit(8).then(({ data }) => setTOpts(data || [])); }, [tSearch, selT]);
  useEffect(() => { if (vSearch.length < 2 || selV) { setVOpts([]); return; } supabase.from('venues').select('id,venue_name,venue_city,sport').ilike('venue_name', `%${vSearch}%`).limit(8).then(({ data }) => setVOpts(data || [])); }, [vSearch, selV]);

  const placeholder = mode === 'Player' && selP ? `Say something about ${selP.player_name}...`
    : mode === 'Team' && selT ? `Say something about the ${selT.team_name}...`
    : mode === 'Arena' && selV ? `Say something about ${selV.venue_name}...`
    : mode === 'Game' && selGame ? 'Say something about this game...'
    : "What's on your mind?";

  const canSave = story.trim().length > 0 && user;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    if (mode === 'Game' && selGame) {
      await supabase.from('user_games').upsert({ user_id: user.id, game_id: selGame.id, story: story.trim() }, { onConflict: 'user_id,game_id' });
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--faint)' }}>
      <div className="sec-head">SAY SOMETHING ABOUT...</div>

      {/* Prompt buttons */}
      <div className="prompt-row">
        {CARDS.map(c => (
          <button key={c.key} onClick={() => pickMode(c.key)} className={`prompt-btn${mode === c.key ? ' active' : ''}`}>{c.label}</button>
        ))}
      </div>

      {/* Autocomplete per mode */}
      {mode === 'Player' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); }} placeholder="Search for a player..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderBottom: selP ? '2px solid var(--copper)' : '1px solid var(--rule)' }} />
          {pOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{pOpts.map(p =>
            <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}>
              <SportBadge sport={p.sport} /><span>{p.player_name}</span>
              {p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}
            </div>
          )}</div>}
        </div>
      )}

      {mode === 'Team' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={tSearch} onChange={e => { setTSearch(e.target.value); setSelT(null); }} placeholder="Search for a team..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderBottom: selT ? '2px solid var(--copper)' : '1px solid var(--rule)' }} />
          {tOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{tOpts.map(t =>
            <div key={t.id} className="ac-item" onClick={() => { setSelT(t); setTSearch(t.full_name); setTOpts([]); }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || 'var(--copper)', flexShrink: 0 }} />
              <span>{t.full_name}</span>
            </div>
          )}</div>}
        </div>
      )}

      {mode === 'Arena' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={vSearch} onChange={e => { setVSearch(e.target.value); setSelV(null); }} placeholder="Search for an arena or course..." autoFocus className="sc-input" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderBottom: selV ? '2px solid var(--copper)' : '1px solid var(--rule)' }} />
          {vOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{vOpts.map(v =>
            <div key={v.id} className="ac-item" onClick={() => { setSelV(v); setVSearch(v.venue_name); setVOpts([]); }}>
              <span>{v.venue_name}</span><span className="ac-sub" style={{ marginLeft: 'auto' }}>{v.venue_city}</span>
            </div>
          )}</div>}
        </div>
      )}

      {mode === 'Game' && <div style={{ marginBottom: 12 }}><GameFinder onSelect={setSelGame} selectable /></div>}

      {/* Notepad form */}
      {mode && (
        <div className="notepad" style={{ marginTop: 8 }}>
          <textarea value={story} onChange={e => setStory(e.target.value)} placeholder={placeholder} rows={4} />
          <div className="notepad-bar">
            {!user && <span className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>Sign in to post</span>}
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={handleSave} disabled={!canSave || saving} className={`post-btn${canSave ? '' : ' off'}`}>
                {saving ? 'Saving...' : saved ? 'Saved' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── LOG AN ENCOUNTER ── */
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
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await supabase.from('encounters').insert({ user_id: user.id, player_id: selP.id, location: location.trim() || null, year: year ? parseInt(year) : null, story: story.trim() || null });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); setSaved(false); }, 2000);
  };

  return (
    <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--faint)' }}>
      <div className="sec-head">LOG AN ENCOUNTER</div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 14, marginTop: -8 }}>Met a player? Saw them at the airport? Got an autograph?</div>

      <div className="scorecard">
        <div className="sc-row">
          <div className="sc-label">Player</div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); setSaved(false); }} placeholder="Who did you meet?" className="sc-input" />
            {pOpts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>{pOpts.map(p =>
              <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}>
                <SportBadge sport={p.sport} /><span>{p.player_name}</span>
                {p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}
              </div>
            )}</div>}
          </div>
        </div>
        <div className="sc-row">
          <div className="sc-label">Where</div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="sc-input" />
        </div>
        <div className="sc-row">
          <div className="sc-label">Year</div>
          <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" inputMode="numeric" className="sc-input" />
        </div>
        <div className="sc-row">
          <div className="sc-label">Story</div>
          <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Tell the story..." rows={3} className="sc-input" style={{ resize: 'vertical', fontFamily: 'var(--body)', lineHeight: 1.7 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} disabled={!canSave || saving} className={`post-btn${canSave ? '' : ' off'}`}>
          {saving ? 'Saving...' : saved ? 'Logged' : 'Log Encounter'}
        </button>
        {(selP || location || year || story) && !saved && <button onClick={() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); }} className="action-btn">Clear</button>}
        {!user && <span className="mono" style={{ fontSize: 10, color: 'var(--dim)' }}>Sign in to log</span>}
      </div>
    </div>
  );
}

/* ── FIND A MATCHUP ── */
function FindMatchupSection() {
  return (
    <div style={{ padding: '24px 20px' }}>
      <div className="sec-head">FIND A MATCHUP</div>
      <GameFinder />
    </div>
  );
}
