'use client'
import { useState, useEffect } from 'react'

const DOMES = new Set([
  'Mercedes-Benz Stadium', 'Georgia Dome',
  'Caesars Superdome', 'Mercedes-Benz Superdome', 'Louisiana Superdome',
  'Lucas Oil Stadium', 'RCA Dome',
  'NRG Stadium', 'Reliant Stadium', 'Reliant Astrodome', 'Astrodome',
  'AT&T Stadium', 'Texas Stadium',
  'Allegiant Stadium',
  'U.S. Bank Stadium', 'Metrodome', 'Hubert H. Humphrey Metrodome',
  'State Farm Stadium', 'University of Phoenix Stadium',
  'Ford Field', 'Pontiac Silverdome', 'Silverdome',
  'Edward Jones Dome', 'Trans World Dome',
  'Kingdome',
])

export default function WeatherIntro({ weather, sport, venue }) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!weather) return
    if (sport === 'basketball') return
    if (sport === 'football' && DOMES.has(venue)) return

    const condition = sport === 'golf'
      ? (Array.isArray(weather) ? weather[weather.length - 1]?.condition : weather?.condition)
      : weather?.condition

    if (!condition) return
    const c = condition.toLowerCase()
    if (c === 'snow' || c === 'rain' || c === 'drizzle' || c === 'thunderstorm') {
      setVisible(true)
      setTimeout(() => setOpacity(0), 5000)
      setTimeout(() => setVisible(false), 6000)
    }
  }, [weather, sport, venue])

  if (!visible || !weather) return null

  const condition = sport === 'golf'
    ? (Array.isArray(weather) ? weather[weather.length - 1]?.condition : weather?.condition)
    : weather?.condition
  const isSnow = (condition || '').toLowerCase() === 'snow'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 100,
      opacity, transition: 'opacity 1.2s ease-out',
      overflow: 'hidden',
      background: isSnow ? 'rgba(180,195,210,0.12)' : 'rgba(100,100,110,0.08)',
    }}>
      {isSnow ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}px`,
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              background: `rgba(140,150,160,${0.5 + Math.random() * 0.3})`,
              borderRadius: '50%',
              animation: `snowfall-${i % 3} ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
            }} />
          ))}
          <style>{`
            @keyframes snowfall-0 { 0%{transform:translateY(-10px) translateX(0);opacity:0.8} 100%{transform:translateY(100vh) translateX(30px);opacity:0} }
            @keyframes snowfall-1 { 0%{transform:translateY(-10px) translateX(0);opacity:0.7} 100%{transform:translateY(100vh) translateX(-25px);opacity:0} }
            @keyframes snowfall-2 { 0%{transform:translateY(-10px) translateX(0);opacity:0.9} 100%{transform:translateY(100vh) translateX(15px);opacity:0} }
          `}</style>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `-${10 + Math.random() * 30}px`,
              width: '2px',
              height: `${18 + Math.random() * 25}px`,
              background: `rgba(80,75,68,${0.3 + Math.random() * 0.2})`,
              transform: 'rotate(12deg)',
              animation: `rainfall ${0.3 + Math.random() * 0.4}s linear ${Math.random() * 0.5}s infinite`,
            }} />
          ))}
          <style>{`
            @keyframes rainfall { 0%{transform:translateY(-30px) rotate(12deg);opacity:0.5} 100%{transform:translateY(100vh) rotate(12deg);opacity:0} }
          `}</style>
        </div>
      )}
    </div>
  )
}
