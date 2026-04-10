'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function YourCall({ gameId, notableGameId, onLogged }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [attended, setAttended] = useState(null); // null = not set, true = there, false = watched
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingLog, setExistingLog] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (!gameId && !notableGameId) return;
    let query = supabase.from('user_games').select('*').eq('user_id', user.id)
    if (gameId) query = query.eq('game_id', gameId)
    else query = query.eq('notable_game_id', notableGameId)
    query.maybeSingle().then(({ data }) => {
        if (data) {
          setExistingLog(data);
          setRating(data.rating || 0);
          setAttended(data.attended);
          setLogged(true);
        }
      });
  }, [user, gameId, notableGameId]);

  const handleLog = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (rating === 0 && attended === null) return;

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        game_id: gameId || null,
        rating: rating || null,
        attended: attended === true,
      };

      if (existingLog) {
        await supabase
          .from('user_games')
          .update(payload)
          .eq('id', existingLog.id);
      } else {
        await supabase
          .from('user_games')
          .insert(payload);
      }

      setLogged(true);
      if (onLogged) onLogged();
    } catch (err) {
      console.error('Log error:', err);
    }
    setLoading(false);
  };

  if (logged && !existingLog) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 14,
          color: 'var(--amber)',
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          LOGGED
        </p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Section header */}
      <h3 style={{
        fontFamily: 'var(--body)',
        fontSize: 13,
        color: 'var(--dim)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
      }}>
        Your Call
      </h3>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => setRating(n === rating ? 0 : n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 28,
              color: n <= displayRating ? '#c49a2a' : 'var(--faint)',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
      </div>

      {/* Attendance toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setAttended(attended === true ? null : true)}
          style={{
            padding: '8px 16px',
            fontFamily: 'var(--ui)',
            fontSize: 13,
            fontWeight: 600,
            border: attended === true ? '2px solid #b5563a' : '2px solid #e5ddd1',
            borderRadius: 4,
            backgroundColor: attended === true ? 'var(--amber)' : 'transparent',
            color: attended === true ? 'var(--surface)' : 'var(--dim)',
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          I Was There
        </button>
        <button
          onClick={() => setAttended(attended === false ? null : false)}
          style={{
            padding: '8px 16px',
            fontFamily: 'var(--ui)',
            fontSize: 13,
            fontWeight: 600,
            border: attended === false ? '2px solid #b5563a' : '2px solid #e5ddd1',
            borderRadius: 4,
            backgroundColor: attended === false ? 'var(--amber)' : 'transparent',
            color: attended === false ? 'var(--surface)' : 'var(--dim)',
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          Watched It
        </button>
      </div>

      {/* Log button */}
      {!logged && (
        <button
          onClick={handleLog}
          disabled={loading || (rating === 0 && attended === null)}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 0',
            backgroundColor: (rating > 0 || attended !== null) ? 'var(--amber)' : 'var(--faint)',
            color: (rating > 0 || attended !== null) ? 'var(--surface)' : 'var(--dim)',
            border: 'none',
            borderRadius: 4,
            fontFamily: 'var(--body)',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 1.5,
            cursor: (rating > 0 || attended !== null) ? 'pointer' : 'default',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'LOGGING...' : 'LOG THIS GAME'}
        </button>
      )}
    </div>
  );
}
