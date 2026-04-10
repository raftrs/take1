'use client';
import { useState } from 'react';

export default function StoryOverlay({ game, onSave, onSkip }) {
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!story.trim()) { onSkip(); return; }
    setSaving(true);
    await onSave(story.trim());
    setSaving(false);
  };

  const title = game?.title || 
    `${game?.away_team_abbr || ''} ${game?.away_score || ''} / ${game?.home_score || ''} ${game?.home_team_abbr || ''}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      backgroundColor: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 24px',
      overflowY: 'auto',
    }}>
      {/* Big X top right */}
      <button
        onClick={onSkip}
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          zIndex: 10000,
          background: 'none',
          border: 'none',
          fontSize: 32,
          color: 'var(--dim)',
          cursor: 'pointer',
          padding: 8,
          lineHeight: 1,
        }}
        aria-label="Skip"
      >
        ✕
      </button>

      <div style={{ maxWidth: 420, width: '100%', paddingTop: 72 }}>
        {/* Header */}
        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 14,
          color: 'var(--dim)',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 8,
          textAlign: 'center',
        }}>
          You logged it.
        </p>

        <h2 style={{
          fontFamily: 'var(--body)',
          fontSize: 22,
          color: 'var(--ink)',
          textAlign: 'center',
          marginBottom: 6,
          lineHeight: 1.3,
        }}>
          {title}
        </h2>

        <p style={{
          fontFamily: 'var(--body)',
          fontSize: 15,
          color: 'var(--dim)',
          textAlign: 'center',
          marginBottom: 40,
        }}>
          Now tell us about it.
        </p>

        {/* Textarea */}
        <textarea
          value={story}
          onChange={e => setStory(e.target.value)}
          placeholder="Say something..."
          style={{
            width: '100%',
            minHeight: 160,
            padding: 16,
            fontFamily: 'var(--body)',
            fontSize: 16,
            color: 'var(--ink)',
            backgroundColor: 'var(--surface)',
            border: '1px solid #e5ddd1',
            borderRadius: 4,
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
          autoFocus
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 0',
            marginTop: 20,
            backgroundColor: 'var(--amber)',
            color: 'var(--surface)',
            border: 'none',
            borderRadius: 4,
            fontFamily: 'var(--body)',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'SAVING...' : story.trim() ? 'SAVE' : 'SKIP'}
        </button>

        <p style={{
          fontFamily: 'var(--ui)',
          fontSize: 12,
          color: 'var(--dim)',
          textAlign: 'center',
          marginTop: 12,
          fontStyle: 'italic',
        }}>
          Not the play-by-play. The feelings. Where you were, who you were with, what it meant to you.
        </p>
      </div>
    </div>
  );
}
