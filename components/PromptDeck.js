'use client'
import { useState, useCallback } from 'react'

const PROMPTS = {
  player: (name) => [
    `The argument I always make about ${name}...`,
    `My hottest ${name} take that nobody agrees with...`,
    `The moment I knew ${name} was different...`,
    `I was at _____ when ${name}...`,
    `${name} reminds me of...`,
    `The thing people get wrong about ${name}...`,
    `If I had to explain ${name} to someone who never watched...`,
    `The play I can still see in my head...`,
    `${name} in one word, and here's why...`,
    `The first time I saw ${name} play live...`,
  ],
  game: () => [
    `I was at _____ watching this with...`,
    `The text I sent after this game...`,
    `Where I was when this happened...`,
    `The moment I knew it was over...`,
    `I'll never forget when...`,
    `The call I made before the game started...`,
    `What I tell people about this game...`,
    `The thing nobody talks about from this game...`,
    `How this game ended my night...`,
    `The person I wish had seen this game...`,
  ],
  venue: (name) => [
    `What it feels like walking up to ${name || 'this place'}...`,
    `My first time here was...`,
    `The game I saw here that I'll never forget...`,
    `The thing about this place that surprised me...`,
    `The food, the crowd, the noise...`,
    `What you feel in the parking lot before the game...`,
    `The seat I had when...`,
    `If these walls could talk...`,
    `Why this place is different from everywhere else...`,
    `The person I was with the last time I was here...`,
  ],
  team: (name) => [
    `The game that defined ${name || 'this franchise'} for me...`,
    `The player from ${name || 'this team'} I respect the most...`,
    `My honest take on ${name || 'this team'}'s fans...`,
    `The best game I ever saw ${name || 'this team'} play...`,
    `The season I'll never forget...`,
    `The trade or draft pick that changed everything...`,
    `If I had to pick one moment in ${name || 'this team'}'s history...`,
    `What people outside the fanbase don't get...`,
    `The coach or player who set the tone...`,
    `My first memory of ${name || 'this team'}...`,
  ],
  city: (name) => [
    `What people don't understand about being a sports fan in ${name}...`,
    `The best place to watch a game in ${name}...`,
    `Game day in ${name} feels like...`,
    `The rivalry that defines ${name} sports...`,
    `My favorite sports memory in ${name}...`,
    `The bar where everything happened...`,
    `What ${name} sounds like after a championship...`,
    `Growing up watching sports in ${name}...`,
    `The thing about ${name} fans that outsiders don't see...`,
    `What ${name} loses if it ever loses a team...`,
  ],
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PromptDeck({ type = 'game', name = '', onSelect }) {
  const getPrompts = PROMPTS[type] || PROMPTS.game
  const allPrompts = getPrompts(name)
  const [visible, setVisible] = useState(() => shuffle(allPrompts).slice(0, 3))

  const reshuffle = useCallback(() => {
    setVisible(shuffle(allPrompts).slice(0, 3))
  }, [allPrompts])

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div className="sans" style={{ fontSize:9, color:'var(--dim)', letterSpacing:2, fontWeight:600 }}>FROM THE STANDS</div>
        <div onClick={reshuffle} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'var(--dim)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
          <span className="sans" style={{ fontSize:9, fontWeight:600, letterSpacing:1 }}>SHUFFLE</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
        {visible.map((prompt, i) => (
          <div key={i} onClick={() => onSelect && onSelect(prompt)} style={{
            flexShrink:0, width:200, padding:'12px 14px 12px 16px',
            background:'var(--card)', borderLeft:'3px solid var(--copper)',
            cursor:'pointer', borderTop:'1px solid var(--faint)', borderRight:'1px solid var(--faint)', borderBottom:'1px solid var(--faint)',
          }}>
            <div style={{ fontSize:13, color:'var(--copper)', fontFamily:"'Crete Round',Georgia,serif", lineHeight:1.5 }}>{prompt}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
