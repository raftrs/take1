'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatDate, showScore, isPlayoff, scoreWithWinner } from '@/lib/utils'
import SportBadge from '@/components/SportBadge'

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
    <div ref={ref} style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      <style>{`.year-scroll::-webkit-scrollbar{display:none}`}</style>
      {years.map(y => {
        const active = value === String(y);
        return <button key={y} data-y={y} onClick={() => onChange(active ? '' : String(y))}
          className={`rp-tab${active ? ' active' : ''}`}
          style={{ flexShrink: 0 }}>{y}</button>;
      })}
    </div>
  );
}

function SortToggle({ value, onChange, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {['Recent', 'Oldest'].map(s => {
          const v = s === 'Recent' ? 'desc' : 'asc';
          return <button key={s} onClick={() => onChange(v)} className={`rp-tab${v === value ? ' active' : ''}`}>{s}</button>;
        })}
      </div>
      {count > 0 && <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--dim)' }}>{count} game{count !== 1 ? 's' : ''}</span>}
    </div>
  );
}

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
        placeholder={placeholder} className="sc-input"
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderBottom: selected ? '2px solid var(--amber)' : '1px solid var(--rule)', borderRadius: 4 }} />
      {opts.length > 0 && <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
        {opts.map(t => <div key={t.id} className="ac-item" onClick={() => { onSelect(t); setOpts([]); }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || 'var(--amber)', flexShrink: 0 }} />
          <span>{t.full_name}</span>
          <span className="ac-sub" style={{ marginLeft: 'auto' }}>{t.sport === 'basketball' ? 'NBA' : t.sport === 'football' ? 'NFL' : t.sport === 'baseball' ? 'MLB' : ''}</span>
        </div>)}
      </div>}
    </div>
  );
}

function GameFinder({ onSelect, defaultSport }) {
  const router = useRouter();
  const [sport, setSport] = useState(defaultSport || 'basketball');
  const [t1s, setT1s] = useState(''); const [t1, setT1] = useState(null);
  const [t2s, setT2s] = useState(''); const [t2, setT2] = useState(null);
  const [year, setYear] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('desc');
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (!onSelect) { try { const d = JSON.parse(sessionStorage.getItem('log_matchup')||'{}'); if (d.sport) setSport(d.sport); if (d.t1) { setT1(d.t1); setT1s(d.t1.team_name||''); } if (d.t2) { setT2(d.t2); setT2s(d.t2.team_name||''); } if (d.year) setYear(d.year); } catch(e){} } }, [onSelect]);
  useEffect(() => { if (!onSelect) sessionStorage.setItem('log_matchup', JSON.stringify({ sport, t1, t2, year })); }, [sport, t1, t2, year, onSelect]);

  useEffect(() => {
    const hasYear = year.length === 4; const hasBoth = t1 && t2; const hasOne = t1 || t2;
    if (!hasBoth && !(hasOne && hasYear)) { setResults([]); return; }
    setLoading(true);
    let q = supabase.from('games').select('id,game_date,home_team_abbr,away_team_abbr,home_score,away_score,sport,series_info,nba_game_id').order('game_date', { ascending: sort === 'asc' }).limit(100);
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
      setResults(games); setLoading(false);
    });
  }, [t1, t2, year, sort, onSelect]);

  const clearAll = () => { setT1(null); setT2(null); setT1s(''); setT2s(''); setYear(''); setResults([]); setSelected(null); sessionStorage.removeItem('log_matchup'); };
  const handleGameClick = (g) => { if (onSelect) { setSelected(g); onSelect(g); } else router.push(`/game/${g.id}`); };

  return (
    <div>
      {!defaultSport && <div className="prompt-row" style={{ marginBottom: 12 }}>
        {['basketball', 'football', 'baseball'].map(s => (
          <button key={s} onClick={() => { setSport(s); clearAll(); }} className={`prompt-btn${sport === s ? ' active' : ''}`}>
            {s === 'basketball' ? 'NBA' : s === 'football' ? 'NFL' : 'MLB'}
          </button>
        ))}
      </div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <TeamInput value={t1s} onChange={setT1s} selected={t1} onSelect={t => { setT1(t); setT1s(t.team_name); }} onClear={() => { setT1(null); setSelected(null); }} sport={sport} />
        <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--dim)' }}>vs</span>
        <TeamInput value={t2s} onChange={setT2s} selected={t2} onSelect={t => { setT2(t); setT2s(t.team_name); }} onClear={() => { setT2(null); setSelected(null); }} sport={sport} />
      </div>
      <YearScroller value={year} onChange={setYear} />
      {(t1 || t2 || year) && <div style={{ marginTop: 6 }}><button onClick={clearAll} className="action-btn" style={{ textDecoration: 'underline' }}>Clear all</button></div>}
      {loading && <p style={{ fontFamily: 'var(--ui)', color: 'var(--dim)', fontSize: 11, marginTop: 8 }}>Finding games...</p>}
      {results.length > 0 && <>
        <SortToggle value={sort} onChange={setSort} count={results.length} />
        <div style={{ maxHeight: onSelect ? 240 : 'none', overflowY: onSelect ? 'auto' : 'visible', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {results.map(g => {
            const sc = scoreWithWinner(g); const playoff = isPlayoff(g.series_info);
            return (
              <button key={g.id} onClick={() => handleGameClick(g)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', backgroundColor: selected?.id === g.id ? 'var(--amber-glow)' : 'var(--surface)',
                border: selected?.id === g.id ? '1px solid var(--amber)' : '1px solid var(--faint)',
                borderLeft: playoff ? '3px solid var(--amber)' : undefined,
                borderRadius: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ flex: 1 }}>
                  {g._allTimer && <div style={{ fontFamily: 'var(--ui)', fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>&#9733; ALL-TIMER</div>}
                  {g._allTimer && <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--ink)', marginBottom: 3 }}>{g._allTimer.title}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SportBadge sport={g.sport} />
                    {sc ? <span className="game-ref-score">{sc.away.won ? `${sc.away.abbr} ${sc.away.score}` : <span className="lose">{sc.away.abbr} {sc.away.score}</span>}{' / '}{sc.home.won ? `${sc.home.abbr} ${sc.home.score}` : <span className="lose">{sc.home.score} {sc.home.abbr}</span>}</span>
                    : <span style={{ fontFamily: 'var(--ui)', fontSize: 14, color: 'var(--ink)' }}>{showScore(g) || g.title}</span>}
                  </div>
                  {(g.series_info || g._top) && <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    {g.series_info && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>{g.series_info}</span>}
                    {g._top && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--amber)' }}>{g._top.player_name} {g._top.points}pts</span>}
                  </div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--ink)', fontWeight: 700, lineHeight: 1 }}>{new Date(g.game_date + 'T00:00:00').getFullYear()}</div>
                  <div style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>{formatDate(g.game_date)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </>}
      {(t1 || t2) && year.length === 4 && !loading && results.length === 0 && (
        <p style={{ fontFamily: 'var(--ui)', color: 'var(--dim)', fontSize: 11, fontStyle: 'italic', marginTop: 8 }}>No games found for that search.</p>
      )}
    </div>
  );
}

export default GameFinder
