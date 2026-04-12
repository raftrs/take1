'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { formatDate, showScore, isPlayoff, scoreWithWinner, sportColor } from '@/lib/utils';
import SportBadge from '@/components/SportBadge';
import TopLogo from '@/components/TopLogo';
import BottomNav from '@/components/BottomNav';
import GameFinder from '@/components/GameFinder'

export default function LogPage() {
  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh', background: 'var(--bg)' }}>
      <TopLogo />

      {/* Header */}
      <div style={{ padding: '28px 24px 0' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', fontWeight: 500 }}>Your Scorebook</div>
        <div style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.5 }}>Find games. Tell stories. Log encounters.</div>
      </div>

      <hr className="heavy-rule" style={{ margin: '16px 24px 0' }} />

      {/* Find a Matchup */}
      <div className="log-section" style={{ background: 'var(--surface)' }}>
        <div className="log-sec-head">Find a Matchup</div>
        <GameFinder />
      </div>

      {/* Say Something */}
      <SaySomethingSection />

      {/* Log an Encounter */}
      <LogEncounter />

      {/* Recently Played */}
      <RecentlyPlayed />

      <BottomNav />
    </div>
  );
}

function SaySomethingSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pSearch, setPSearch] = useState('');
  const [pOpts, setPOpts] = useState([]);
  const [selP, setSelP] = useState(null);

  const [tSearch, setTSearch] = useState('');
  const [tOpts, setTOpts] = useState([]);
  const [selT, setSelT] = useState(null);

  const [vSearch, setVSearch] = useState('');
  const [vOpts, setVOpts] = useState([]);
  const [selV, setSelV] = useState(null);

  const [selGame, setSelGame] = useState(null);

  const pickMode = (m) => {
    if (mode === m) { setMode(null); return; }
    setMode(m); setStory(''); setSaved(false);
    setPSearch(''); setPOpts([]); setSelP(null);
    setTSearch(''); setTOpts([]); setSelT(null);
    setVSearch(''); setVOpts([]); setSelV(null);
    setSelGame(null);
  };

  useEffect(() => {
    if (pSearch.length < 2 || selP) { setPOpts([]); return; }
    supabase.from('players').select('id,player_name,sport,position').ilike('player_name', `%${pSearch}%`).limit(8).then(({ data }) => setPOpts(data || []));
  }, [pSearch, selP]);

  useEffect(() => {
    if (tSearch.length < 2 || selT) { setTOpts([]); return; }
    supabase.from('teams').select('id,team_abbr,team_name,full_name,sport,primary_color')
      .or(`full_name.ilike.%${tSearch}%,team_name.ilike.%${tSearch}%,city.ilike.%${tSearch}%`)
      .limit(8).then(({ data }) => setTOpts(data || []));
  }, [tSearch, selT]);

  useEffect(() => {
    if (vSearch.length < 2 || selV) { setVOpts([]); return; }
    supabase.from('venues').select('id,venue_name,venue_city,sport').ilike('venue_name', `%${vSearch}%`).limit(8).then(({ data }) => setVOpts(data || []));
  }, [vSearch, selV]);

  const hasEntity = (mode === 'Player' && selP) || (mode === 'Team' && selT) || (mode === 'Arena' && selV) || (mode === 'Game' && selGame);

  const placeholder = mode === 'Player' && selP ? `Say something about ${selP.player_name}...`
    : mode === 'Team' && selT ? `Say something about the ${selT.team_name}...`
    : mode === 'Arena' && selV ? `Say something about ${selV.venue_name}...`
    : mode === 'Game' && selGame ? 'Say something about this game...'
    : "What's on your mind?";

  const canSave = story.trim().length > 0 && user && hasEntity;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (mode === 'Game' && selGame) {
        await supabase.from('user_games').upsert(
          { user_id: user.id, game_id: selGame.id, story: story.trim() },
          { onConflict: 'user_id,game_id' }
        );
      } else if (mode === 'Player' && selP) {
        await supabase.from('fan_notes').insert({
          user_id: user.id, entity_type: 'player', entity_id: selP.id, note: story.trim()
        });
      } else if (mode === 'Team' && selT) {
        await supabase.from('fan_notes').insert({
          user_id: user.id, entity_type: 'team', entity_id: selT.id, note: story.trim()
        });
      } else if (mode === 'Arena' && selV) {
        await supabase.from('fan_notes').insert({
          user_id: user.id, entity_type: 'venue', entity_id: selV.id, note: story.trim()
        });
      }
      setSaved(true);
      setTimeout(() => {
        setStory(''); setSaved(false); setMode(null);
        setSelP(null); setPSearch('');
        setSelT(null); setTSearch('');
        setSelV(null); setVSearch('');
        setSelGame(null);
      }, 1500);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="log-section" style={{ background: 'var(--bg)' }}>
      <div className="log-sec-head">Say Something About...</div>

      <div className="prompt-row">
        {['Player','Team','Game','Arena'].map(c => (
          <button key={c} onClick={() => pickMode(c)} className={`prompt-btn${mode === c ? ' active' : ''}`}>{c}</button>
        ))}
      </div>

      {/* Player search */}
      {mode === 'Player' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); }}
            placeholder="Search for a player..." autoFocus className="log-search-input"
            style={{ borderBottomColor: selP ? 'var(--amber)' : 'var(--rule)' }} />
          {selP && <div className="log-selected-badge">{selP.player_name}</div>}
          {pOpts.length > 0 && (
            <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
              {pOpts.map(p => (
                <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}>
                  <SportBadge sport={p.sport} /><span>{p.player_name}</span>
                  {p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team search */}
      {mode === 'Team' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={tSearch} onChange={e => { setTSearch(e.target.value); setSelT(null); }}
            placeholder="Search for a team..." autoFocus className="log-search-input"
            style={{ borderBottomColor: selT ? 'var(--amber)' : 'var(--rule)' }} />
          {selT && <div className="log-selected-badge">{selT.full_name}</div>}
          {tOpts.length > 0 && (
            <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
              {tOpts.map(t => (
                <div key={t.id} className="ac-item" onClick={() => { setSelT(t); setTSearch(t.full_name); setTOpts([]); }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.primary_color || 'var(--amber)', flexShrink: 0 }} />
                  <span>{t.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Venue search */}
      {mode === 'Arena' && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input value={vSearch} onChange={e => { setVSearch(e.target.value); setSelV(null); }}
            placeholder="Search for an arena or course..." autoFocus className="log-search-input"
            style={{ borderBottomColor: selV ? 'var(--amber)' : 'var(--rule)' }} />
          {selV && <div className="log-selected-badge">{selV.venue_name}</div>}
          {vOpts.length > 0 && (
            <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
              {vOpts.map(v => (
                <div key={v.id} className="ac-item" onClick={() => { setSelV(v); setVSearch(v.venue_name); setVOpts([]); }}>
                  <span>{v.venue_name}</span>
                  <span className="ac-sub" style={{ marginLeft: 'auto' }}>{v.venue_city}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game search */}
      {mode === 'Game' && <div style={{ marginBottom: 12 }}><GameFinder onSelect={setSelGame} /></div>}

      {/* Writing area - only shows after entity selected */}
      {mode && hasEntity && (
        <div className="log-notepad">
          <textarea value={story} onChange={e => setStory(e.target.value)} placeholder={placeholder} rows={4} />
          <div className="log-notepad-bar">
            {!user && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>Sign in to post</span>}
            {saved && <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Posted!</span>}
            <button onClick={handleSave} disabled={!canSave || saving}
              className={`post-btn${canSave ? '' : ' off'}`}>
              {saving ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {mode && mode !== 'Game' && !hasEntity && (
        <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--dim)', fontStyle: 'italic', marginTop: 4 }}>
          Search above to get started.
        </div>
      )}
    </div>
  );
}

function LogEncounter() {
  const { user } = useAuth();
  const [pSearch, setPSearch] = useState('');
  const [pOpts, setPOpts] = useState([]);
  const [selP, setSelP] = useState(null);
  const [location, setLocation] = useState('');
  const [year, setYear] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pSearch.length < 2 || selP) { setPOpts([]); return; }
    supabase.from('players').select('id,player_name,sport,position').ilike('player_name', `%${pSearch}%`).limit(8).then(({ data }) => setPOpts(data || []));
  }, [pSearch, selP]);

  const canSave = selP && user;
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await supabase.from('encounters').insert({
      user_id: user.id, player_id: selP.id,
      location: location.trim() || null,
      year: year ? parseInt(year) : null,
      story: story.trim() || null
    });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); setSaved(false); }, 2000);
  };

  return (
    <div className="log-section" style={{ background: 'var(--surface)' }}>
      <div className="log-sec-head">Log an Encounter</div>
      <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--dim)', fontStyle: 'italic', marginBottom: 14, marginTop: -8, lineHeight: 1.5 }}>
        Met a player? Saw them at the airport? Got an autograph?
      </div>
      <div className="scorecard">
        <div className="sc-row">
          <div className="sc-label">Player</div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input value={pSearch} onChange={e => { setPSearch(e.target.value); setSelP(null); setSaved(false); }}
              placeholder="Who did you meet?" className="sc-input" />
            {pOpts.length > 0 && (
              <div className="ac-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
                {pOpts.map(p => (
                  <div key={p.id} className="ac-item" onClick={() => { setSelP(p); setPSearch(p.player_name); setPOpts([]); }}>
                    <SportBadge sport={p.sport} /><span>{p.player_name}</span>
                    {p.position && <span className="ac-sub" style={{ marginLeft: 'auto' }}>{p.position}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sc-row"><div className="sc-label">Where</div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="sc-input" /></div>
        <div className="sc-row"><div className="sc-label">Year</div>
          <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" inputMode="numeric" className="sc-input" /></div>
        <div className="sc-row"><div className="sc-label">Story</div>
          <textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Tell the story..."
            rows={3} className="sc-input sc-story" style={{ resize: 'vertical', lineHeight: 1.6 }} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} disabled={!canSave || saving}
          className={`post-btn${canSave ? '' : ' off'}`}>
          {saving ? 'Saving...' : saved ? 'Logged!' : 'Log Encounter'}
        </button>
        {(selP || location || year || story) && !saved && (
          <button onClick={() => { setSelP(null); setPSearch(''); setLocation(''); setYear(''); setStory(''); }}
            className="action-btn" style={{ textDecoration: 'underline' }}>Clear</button>
        )}
        {!user && <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>Sign in to log</span>}
      </div>
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
      setGames(filtered.slice(0, 12));
      setLoading(false);
    });
  }, [rpSport]);

  return (
    <div className="log-section" style={{ background: 'var(--bg)' }}>
      <div className="log-sec-head">Recently Played</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, marginTop: -4 }}>
        {[{k:'all',l:'All'},{k:'basketball',l:'NBA'},{k:'football',l:'NFL'},{k:'golf',l:'PGA'},{k:'baseball',l:'MLB'}].map(s => (
          <button key={s.k} onClick={() => setRpSport(s.k)} className={`rp-tab${rpSport === s.k ? ' active' : ''}`}>{s.l}</button>
        ))}
      </div>
      {loading ? <p style={{ fontFamily: 'var(--ui)', color: 'var(--dim)', fontSize: 11 }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {games.map(g => {
            const sc = scoreWithWinner(g);
            const playoff = isPlayoff(g.series_info);
            const sColor = sportColor(g.sport);
            return (
              <div key={g.id} className="rp-card" onClick={() => router.push(`/game/${g.id}`)}
                style={{ borderLeftColor: sColor }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {g.sport === 'golf' ? (
                    <span style={{ fontFamily: 'var(--body)', fontSize: 14, color: 'var(--ink)' }}>{g.title || 'Tournament'}</span>
                  ) : sc ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span className="rp-team-score" style={{ opacity: sc.away.won ? 1 : 0.4 }}>
                        <span className="rp-abbr">{sc.away.abbr}</span>
                        <span className="rp-num">{sc.away.score}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--ui)', fontSize: 10, color: 'var(--dim)' }}>@</span>
                      <span className="rp-team-score" style={{ opacity: sc.home.won ? 1 : 0.4 }}>
                        <span className="rp-num">{sc.home.score}</span>
                        <span className="rp-abbr">{sc.home.abbr}</span>
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink)' }}>
                      {g.title || `${g.away_team_abbr} @ ${g.home_team_abbr}`}
                    </span>
                  )}
                  {playoff && g.series_info && <div className="rp-series">{g.series_info}</div>}
                </div>
                <div className="rp-date">{formatDate(g.game_date)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
