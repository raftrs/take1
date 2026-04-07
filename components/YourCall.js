'use client'
import { useState } from 'react'
export default function YourCall() {
  const [rating, setRating] = useState(0)
  const [att, setAtt] = useState(null)
  return (
    <div style={{ padding:'16px 0' }}>
      <div className="sec-head">YOUR CALL</div>
      <div className="star-row">
        {[1,2,3,4,5].map(n => (
          <button key={n} className={`star-btn ${rating >= n ? 'on' : ''}`} onClick={() => setRating(rating === n ? 0 : n)}>
            <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </button>
        ))}
      </div>
      <div className="att-toggle">
        <button className={`att-opt${att==='there'?' on':''}`} onClick={() => setAtt(att==='there'?null:'there')}>I Was There</button>
        <button className={`att-opt${att==='watched'?' on':''}`} onClick={() => setAtt(att==='watched'?null:'watched')}>Watched It</button>
      </div>
      <textarea className="story-textarea" style={{ marginTop:12 }} placeholder="Say something..." />
      <div className="log-btn">LOG THIS GAME</div>
    </div>
  )
}
