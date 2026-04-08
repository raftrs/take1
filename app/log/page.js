'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { formatDate, showScore, savePlaylist } from '@/lib/utils';
import SportBadge from '@/components/SportBadge';

/* ── Design tokens ── */
const copper = '#b5563a', cream = '#f5f0e8', ink = '#2c2a25',
      dim = '#a09888', faint = '#e5ddd1', card = '#faf7f2';

/* ── Shared styles ── */
const secStyle = { padding: '24px 16px', borderBottom: `2px solid ${faint}` };
const secHead = {
  fontFamily: "'Crete Round', Georgia, serif", fontSize: 13, color: dim,
  textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, marginTop: 0,
};
const inputStyle = {
  width: '100%', padding: '12px', fontFamily: "'Crete Round', Georgia, serif",
  fontSize: 14, color: ink, backgroundColor: card,
  border: `2px solid ${faint}`, borderRadius: 4, outline: 'none', boxSizing: 'border-box',
};
const inputActiveStyle = { ...inputStyle, border: `2px solid ${copper}` };
const dropWrap = {
  position: 'absolute', top: '100%', left: 0, right: 0,
  backgroundColor: card, border: `1px solid ${faint}`,
  borderRadius: 4, zIndex: 50, maxHeight: 220, overflowY: 'auto',
};
const dropRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent',
  cursor: 'pointer', textAlign: 'left', borderBottom: `1px solid ${faint}`,
  fontFamily: "'Crete Round', Georgia, serif", fontSize: 13, color: ink,
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE: Year Scroller
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
    <div ref={ref} className="year-scroll" style={{
      display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6,
      WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
    }}>
      <style>{`.year-scroll::-webkit-scrollbar{display:none}`}</style>
      {years.map(y => {
        const active = value === String(y);
        return <button key={y} data-y={y} onClick={() => onChange(active ? '' : String(y))}
          style={{
            padding: '5px 12px', flexShrink: 0, fontFamily: 'Manrope, Arial, sans-serif',
            fontSize: 12, fontWeight: active ? 700 : 500,
            backgroundColor: active ? copper : 'transparent',
            color: active ? cream : dim,
            border: active ? `1.5px solid ${copper}` : `1.5px solid ${faint}`,
            borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{y}</button>;
      })}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE: Sort Toggle
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SortToggle({ value, onChange, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 }}>
      <div style={{ display: 'flex' }}>
        {['Recent', 'Oldest'].map(s => {
          const v = s === 'Recent' ? 'desc' : 'asc';
          return <button key={s} onClick={() => onChange(v)} className="sans"
            style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 600, background: 'none',
              border: 'none', cursor: 'pointer', color: v === value ? copper : dim,
              borderBottom: v === value ? `2px solid ${copper}` : '2px solid transparent',
            }}>{s}</button>;
        })}
      </div>
      {count > 0 && <span style={{ fontFamily: 'Manrope, Arial, sans-serif', fontSize: 11, color: dim }}>{count} game{count !== 1 ? 's' : ''}</span>}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE: Team Autocomplete
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
        placeholder={placeholder} style={selected ? inputActiveStyle : inputStyle} />
      {opts.length > 0 && <div style={dropWrap}>{opts.map(t =>
        <button key={t.id} onClick={() => { onSelect(t); setOpts([]); }} style={dropRow}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || copper, flexShrink: 0 }} />
          <span>{t.full_name}</span>
          <span style={{ color: dim, fontSize: 11, marginLeft: 'auto' }}>{t.sport === 'basketball' ? 'NBA' : t.sport === 'football' ? 'NFL' : ''}</span>
        </button>
      )}</div>}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE: Game Finder (two teams + year)
   Used in both Say Something > Game and Find a Matchup
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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

  // Restore state for standalone usage
  useEffect(() => {
    if (!onSelect) {
      const s = sessionStorage.getItem('log_matchup');
      if (s) { try { const d = JSON.parse(s); if (d.sport) setSport(d.sport); if (d.t1) { setT1(d.t1); setT1s(d.t1.team_name||''); } if (d.t2) { setT2(d.t2); setT2s(d.t2.team_name||''); } if (d.year) setYear(d.year); } catch(e){} }
    }
  }, [onSelect]);

  useEffect(() => {
    if (!onSelect) sessionStorage.setItem('log_matchup', JSON.stringify({ sport, t1, t2, year }));
  }, [sport, t1, t2, year, onSelect]);

  // Search logic: two teams, OR one team + year, OR two teams + year
  useEffect(() => {
    const hasYear = year.length === 4;
    const hasBoth = t1 && t2;
    const hasOne = t1 || t2;
    if (!hasBoth && !(hasOne && hasYear)) { setResults([]); return; }

    setLoading(true);
    let q = supabase.from('games')
      .select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info,nba_game_id')
      .order('game_date', { ascending: sort === 'asc' }).limit(100);

    if (hasBoth) {
      q = q.or(`and(home_team_abbr.eq.${t1.team_abbr},away_team_abbr.eq.${t2.team_abbr}),and(home_team_abbr.eq.${t2.team_abbr},away_team_abbr.eq.${t1.team_abbr})`);
    } else if (t1) {
      q = q.or(`home_team_abbr.eq.${t1.team_abbr},away_team_abbr.eq.${t1.team_abbr}`);
    } else if (t2) {
      q = q.or(`home_team_abbr.eq.${t2.team_abbr},away_team_abbr.eq.${t2.team_abbr}`);
    }
    if (hasYear) q = q.gte('game_date', `${year}-01-01`).lte('game_date', `${year}-12-31`);

    q.then(async ({ data }) => {
      const games = data || [];
      // Top scorer for first 20 NBA games
      await Promise.all(games.slice(0, 20).map(async g => {
        if (g.sport === 'basketball' && g.nba_game_id) {
          const { data: bs } = await supabase.from('box_scores')
            .select('player_name,points').eq('nba_game_id', g.nba_game_id)
            .order('points', { ascending: false }).limit(1);
          if (bs?.[0]) g._top = bs[0];
        }
      }));
      setResults(games);
      setLoading(false);
      // Save playlist for nav
      if (!onSelect) {
        const pl = games.map(g => ({ href: `/game/${g.id}`, title: showScore(g) || `${g.away_team_abbr} @ ${g.home_team_abbr}` }));
        sessionStorage.setItem('raftrs_playlist', JSON.stringify(pl.map((p, i) => ({ ...p, id: games[i].id, type: 'game' }))));
        sessionStorage.setItem('raftrs_playlist_source', 'log');
      }
    });
  }, [t1, t2, year, sort, onSelect]);

  const clearAll = () => {
    setT1(null); setT2(null); setT1s(''); setT2s('');
    setYear(''); setResults([]); setSelected(null);
    sessionStorage.removeItem('log_matchup');
  };

  const handleGameClick = (g) => {
    if (onSelect) { setSelected(g); onSelect(g); }
    else router.push(`/game/${g.id}`);
  };

  return (
    <div>
      {/* Sport toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['basketball', 'football'].map(s => (
          <button key={s} onClick={() => { setSport(s); clearAll(); }}
            style={{
              padding: '5px 14px', fontFamily: 'Manrope, Arial, sans-serif',
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              border: sport === s ? `2px solid ${copper}` : `2px solid ${faint}`,
              borderRadius: 4, backgroundColor: sport === s ? copper : 'transparent',
              color: sport === s ? cream : dim, cursor: 'pointer',
            }}>{s === 'basketball' ? 'NBA' : 'NFL'}</button>
        ))}
      </div>

      {/* Team inputs */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <TeamInput value={t1s} onChange={setT1s} selected={t1}
          onSelect={t => { setT1(t); setT1s(t.team_name); }} onClear={() => { setT1(null); setSelected(null); }}
          sport={sport} />
        <span style={{ fontFamily: "'Crete Round', Georgia, serif", fontSize: 14, color: dim }}>vs</span>
        <TeamInput value={t2s} onChange={setT2s} selected={t2}
          onSelect={t => { setT2(t); setT2s(t.team_name); }} onClear={() => { setT2(null); setSelected(null); }}
          sport={sport} />
      </div>

      {/* Year scroller */}
      <YearScroller value={year} onChange={setYear} />

      {/* Clear */}
      {(t1 || t2 || year) && <div style={{ marginTop: 6 }}>
        <button onClick={clearAll} className="sans" style={{ fontSize: 12, color: dim, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Clear all</button>
      </div>}

      {/* Results */}
      {loading && <p className="sans" style={{ color: dim, fontSize: 12, marginTop: 8 }}>Finding games...</p>}
      {results.length > 0 && <>
        <SortToggle value={sort} onChange={setSort} count={results.length} />
        <div style={{ maxHeight: onSelect ? 240 : 'none', overflowY: onSelect ? 'auto' : 'visible', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {results.map(g => (
            <button key={g.id} onClick={() => handleGameClick(g)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', backgroundColor: selected?.id === g.id ? '#f0e8dc' : card,
              border: selected?.id === g.id ? `1px solid ${copper}` : `1px solid ${faint}`,
              borderRadius: 4, cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SportBadge sport={g.sport} />
                  <span style={{ fontFamily: "'Crete Round', Georgia, serif", fontSize: 14, color: ink, fontWeight: 700 }}>{showScore(g)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  {g.series_info && <span className="sans" style={{ fontSize: 11, color: dim }}>{g.series_info}</span>}
                  {g._top && <span className="sans" style={{ fontSize: 11, color: copper }}>{g._top.player_name} {g._top.points}pts</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                <div style={{ fontFamily: "'Crete Round', Georgia, serif", fontSize: 15, color: ink, fontWeight: 700, lineHeight: 1 }}>{new Date(g.game_date + 'T00:00:00').getFullYear()}</div>
                <div className="sans" style={{ fontSize: 10, color: dim }}>{formatDate(g.game_date)}</div>
              </div>
            </button>
          ))}
        </div>
      </>}
      {(t1 || t2) && year.length === 4 && !loading && results.length === 0 && (
        <p className="sans" style={{ color: dim, fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>No games found for that search.</p>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function LogPage() {
  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh' }}>
      <JustPlayed />
      <SaySomethingSection />
      <LogEncounter />
      <FindMatchupSection />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. JUST PLAYED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function JustPlayed() {
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('games')
      .select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info')
      .order('game_date', { ascending: false }).limit(6)
      .then(({ data }) => { setGames(data || []); setLoading(false); });
  }, []);
  return (
    <div style={secStyle}>
      <h3 style={secHead}>Just Played</h3>
      <p className="sans" style={{ fontSize: 11, color: dim, marginBottom: 12, marginTop: -8, fontStyle: 'italic' }}>Recent playoff and championship games</p>
      {loading ? <p className="sans" style={{ color: dim, fontSize: 13 }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {games.map(g => (
            <button key={g.id} onClick={() => router.push(`/game/${g.id}`)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', backgroundColor: card, border: `1px solid ${faint}`,
              borderRadius: 4, cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <SportBadge sport={g.sport} />
                <div>
                  <div style={{ fontFamily: "'Crete Round', Georgia, serif", fontSize: 14, color: ink, fontWeight: 700 }}>{showScore(g)}</div>
                  {g.series_info && <div className="sans" style={{ fontSize: 11, color: dim }}>{g.series_info}</div>}
                </div>
              </div>
              <span className="sans" style={{ fontSize: 11, color: dim, whiteSpace: 'nowrap' }}>{formatDate(g.game_date)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. SAY SOMETHING (Editorial Cards)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CARDS = [
  { key: 'Player', headline: 'A Player', sub: 'The ones who changed how you watch the game.' },
  { key: 'Team', headline: 'A Team', sub: 'Dynasties, heartbreaks, and the colors you bled.' },
  { key: 'Game', headline: 'A Game', sub: 'The one you still talk about.' },
  { key: 'Arena', headline: 'An Arena', sub: 'The building that holds the memory.' },
];

function SaySomethingSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Player
  const [pSearch, setPSearch] = useState(''); const [pOpts, setPOpts] = useState([]); const [selP, setSelP] = useState(null);
  // Team
  const [tSearch, setTSearch] = useState(''); const [tOpts, setTOpts] = useState([]); const [selT, setSelT] = useState(null);
  // Arena
  const [vSearch, setVSearch] = useState(''); const [vOpts, setVOpts] = useState([]); const [selV, setSelV] = useState(null);
  // Game
  const [selGame, setSelGame] = useState(null);

  const pickMode = (m) => {
    if (mode === m) { setMode(null); return; }
    setMode(m); setStory(''); setSaved(false);
    setPSearch(''); setPOpts([]); setSelP(null);
    setTSearch(''); setTOpts([]); setSelT(null);
    setVSearch(''); setVOpts([]); setSelV(null);
    setSelGame(null);
  };

  // Player autocomplete
  useEffect(() => {
    if (pSearch.length < 2 || selP) { setPOpts([]); return; }
    supabase.from('players').select('id,player_name,sport,position')
      .ilike('player_name', `%${pSearch}%`).limit(8)
      .then(({ data }) => setPOpts(data || []));
  }, [pSearch, selP]);

  // Team autocomplete
  useEffect(() => {
    if (tSearch.length < 2 || selT) { setTOpts([]); return; }
    supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color')
      .or(`full_name.ilike.%${tSearch}%,team_name.ilike.%${tSearch}%,city.ilike.%${tSearch}%`)
      .limit(8).then(({ data }) => setTOpts(data || []));
  }, [tSearch, selT]);

  // Venue autocomplete
  useEffect(() => {
    if (vSearch.length < 2 || selV) { setVOpts([]); return; }
    supabase.from('venues').select('id,venue_name,venue_city,sport')
      .ilike('venue_name', `%${vSearch}%`).limit(8)
      .then(({ data }) => setVOpts(data || []));
  }, [vSearch, selV]);

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
      await supabase.from('user_games').upsert({
        user_id: user.id, game_id: selGame.id, story: story.trim(),
      }, { onConflict: 'user_id,game_id' });
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={secStyle}>
      <h3 style={secHead}>Say Something About...</h3>

      {/* Editorial cards - 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: mode ? 16 : 0 }}>
        {CARDS.map(c => {
          const active = mode === c.key;
          return (
            <button key={c.key} onClick={() => pickMode(c.key)} style={{
              padding: '14px 12px', backgroundColor: active ? ink : card,
              border: active ? `1.5px solid ${ink}` : `1.5px solid ${faint}`,
              borderRadius: 6, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ fontFamily: "'Crete Round', Georgia, serif", fontSize: 15, fontWeight: 700, color: active ? cream : ink, marginBottom: 4 }}>{c.headline}</div>
              <div style={{ fontFamily: 'Manrope, Arial, sans-serif', fontSize: 11, lineHeight: 1.4, color: active ? '#c9c0b4' : dim, fontStyle: 'italic' }}>{c.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Search area per mode */}
      {mode === 'Player' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); }}
            placeholder="Search for a player..." autoFocus style={selP ? inputActiveStyle : inputStyle} />
          {pOpts.length > 0 && <div style={dropWrap}>{pOpts.map(p =>
            <button key={p.id} onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }} style={dropRow}>
              <SportBadge sport={p.sport} /><span>{p.player_name}</span>
              {p.position && <span style={{ color: dim, fontSize: 11, marginLeft: 'auto' }}>{p.position}</span>}
            </button>
          )}</div>}
        </div>
      )}

      {mode === 'Team' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={tSearch} onChange={e => { setTSearch(e.target.value); setSelT(null); }}
            placeholder="Search for a team..." autoFocus style={selT ? inputActiveStyle : inputStyle} />
          {tOpts.length > 0 && <div style={dropWrap}>{tOpts.map(t =>
            <button key={t.id} onClick={() => { setSelT(t); setTSearch(t.full_name); setTOpts([]); }} style={dropRow}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || copper, flexShrink: 0 }} />
              <span>{t.full_name}</span>
            </button>
          )}</div>}
        </div>
      )}

      {mode === 'Arena' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={vSearch} onChange={e => { setVSearch(e.target.value); setSelV(null); }}
            placeholder="Search for an arena or course..." autoFocus style={selV ? inputActiveStyle : inputStyle} />
          {vOpts.length > 0 && <div style={dropWrap}>{vOpts.map(v =>
            <button key={v.id} onClick={() => { setSelV(v); setVSearch(v.venue_name); setVOpts([]); }} style={dropRow}>
              <span>{v.venue_name}</span>
              <span style={{ color: dim, fontSize: 11, marginLeft: 'auto' }}>{v.venue_city}</span>
            </button>
          )}</div>}
        </div>
      )}

      {mode === 'Game' && (
        <div style={{ marginBottom: 12 }}>
          <GameFinder onSelect={setSelGame} selectable />
        </div>
      )}

      {/* Textarea + Post */}
      {mode && <>
        <textarea value={story} onChange={e => setStory(e.target.value)} placeholder={placeholder} rows={4}
          style={{
            width: '100%', padding: 14, fontFamily: 'Manrope, Arial, sans-serif',
            fontSize: 14, lineHeight: 1.5, color: ink, backgroundColor: card,
            border: `2px solid ${faint}`, borderRadius: 4, outline: 'none',
            resize: 'vertical', boxSizing: 'border-box', marginTop: 8,
          }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <button onClick={handleSave} disabled={!canSave || saving} style={{
            padding: '10px 24px', fontFamily: "'Crete Round', Georgia, serif",
            fontSize: 14, fontWeight: 700, backgroundColor: canSave ? copper : faint,
            color: canSave ? cream : dim, border: 'none', borderRadius: 4,
            cursor: canSave ? 'pointer' : 'default', opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : saved ? 'Saved' : 'Post'}</button>
          {!user && <span className="sans" style={{ fontSize: 11, color: dim, fontStyle: 'italic' }}>Sign in to post</span>}
        </div>
      </>}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. LOG AN ENCOUNTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function LogEncounter() {
  const { user } = useAuth();
  const [pSearch, setPSearch] = useState(''); const [pOpts, setPOpts] = useState([]); const [selP, setSelP] = useState(null);
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pSearch.length < 2 || selP) { setPOpts([]); return; }
    supabase.from('players').select('id,player_name,sport,position')
      .ilike('player_name', `%${pSearch}%`).limit(8)
      .then(({ data }) => setPOpts(data || []));
  }, [pSearch, selP]);

  const canSave = selP && user;
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await supabase.from('encounters').insert({
      user_id: user.id, player_id: selP.id,
      location: location.trim() || null,
      year: year ? parseInt(year) : null,
      story: story.trim() || null,
    });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); setSaved(false); }, 2000);
  };

  return (
    <div style={secStyle}>
      <h3 style={secHead}>Log an Encounter</h3>
      <p className="sans" style={{ fontSize: 11, color: dim, marginBottom: 12, marginTop: -8, fontStyle: 'italic' }}>Met a player? Saw them at the airport? Got an autograph?</p>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); setSaved(false); }}
          placeholder="Who did you meet?" style={selP ? inputActiveStyle : inputStyle} />
        {pOpts.length > 0 && <div style={dropWrap}>{pOpts.map(p =>
          <button key={p.id} onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }} style={dropRow}>
            <SportBadge sport={p.sport} /><span>{p.player_name}</span>
            {p.position && <span style={{ color: dim, fontSize: 11, marginLeft: 'auto' }}>{p.position}</span>}
          </button>
        )}</div>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where?" style={{ ...inputStyle, flex: 2 }} />
        <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" inputMode="numeric" style={{ ...inputStyle, flex: 1 }} />
      </div>

      <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Tell the story..." rows={3}
        style={{ width: '100%', padding: 14, fontFamily: 'Manrope, Arial, sans-serif', fontSize: 14, lineHeight: 1.5, color: ink, backgroundColor: card, border: `2px solid ${faint}`, borderRadius: 4, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button onClick={handleSave} disabled={!canSave || saving} style={{
          padding: '10px 24px', fontFamily: "'Crete Round', Georgia, serif", fontSize: 14, fontWeight: 700,
          backgroundColor: canSave ? copper : faint, color: canSave ? cream : dim,
          border: 'none', borderRadius: 4, cursor: canSave ? 'pointer' : 'default', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : saved ? 'Logged' : 'Log Encounter'}</button>
        {!user && <span className="sans" style={{ fontSize: 11, color: dim, fontStyle: 'italic' }}>Sign in to log</span>}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. FIND A MATCHUP
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FindMatchupSection() {
  return (
    <div style={{ ...secStyle, borderBottom: 'none' }}>
      <h3 style={secHead}>Find a Matchup</h3>
      <GameFinder />
    </div>
  );
}
