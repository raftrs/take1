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
    if (!user || !gameId) return;
    supabase
      .from('user_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingLog(data);
          setRating(data.rating || 0);
          setAttended(data.attended);
          setLogged(true);
        }
      });
  }, [user, gameId]);

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
        game_id: gameId,
        notable_game_id: notableGameId || null,
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
          fontFamily: "'Crete Round', Georgia, serif",
          fontSize: 14,
          color: '#b5563a',
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
        fontFamily: "'Crete Round', Georgia, serif",
        fontSize: 13,
        color: '#a09888',
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
              color: n <= displayRating ? '#c49a2a' : '#e5ddd1',
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
            fontFamily: 'Manrope, Arial, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            border: attended === true ? '2px solid #b5563a' : '2px solid #e5ddd1',
            borderRadius: 4,
            backgroundColor: attended === true ? '#b5563a' : 'transparent',
            color: attended === true ? '#f5f0e8' : '#a09888',
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
            fontFamily: 'Manrope, Arial, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            border: attended === false ? '2px solid #b5563a' : '2px solid #e5ddd1',
            borderRadius: 4,
            backgroundColor: attended === false ? '#b5563a' : 'transparent',
            color: attended === false ? '#f5f0e8' : '#a09888',
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
            backgroundColor: (rating > 0 || attended !== null) ? '#b5563a' : '#e5ddd1',
            color: (rating > 0 || attended !== null) ? '#f5f0e8' : '#a09888',
            border: 'none',
            borderRadius: 4,
            fontFamily: "'Crete Round', Georgia, serif",
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
