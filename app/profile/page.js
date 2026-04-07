export default function ProfilePage() {
  return (
    <div>
      <div style={{ padding:'16px 20px', borderBottom:'2px solid var(--rule)' }}><div style={{ fontSize:20, color:'var(--ink)' }}>Profile</div></div>
      <div style={{ padding:'40px 20px', textAlign:'center', borderBottom:'1px solid var(--faint)' }}>
        <div style={{ fontSize:28, color:'var(--ink)', letterSpacing:4, marginBottom:8 }}>raftrs</div>
        <div style={{ fontSize:14, color:'var(--muted)', fontStyle:'italic', marginBottom:24 }}>Share the stories you&apos;ll never forget.</div>
        <div style={{ display:'inline-block', padding:'14px 36px', background:'var(--copper)', color:'#fff', fontSize:13, fontFamily:'Arial,sans-serif', fontWeight:600, letterSpacing:1, cursor:'pointer' }}>CREATE AN ACCOUNT</div>
        <div style={{ fontSize:12, color:'var(--dim)', marginTop:14 }}>Already have an account? <span style={{ color:'var(--copper)', cursor:'pointer' }}>Log in</span></div>
      </div>
      <div style={{ padding:20 }}>
        <div className="sec-head">WHAT YOU CAN DO</div>
        {[
          {t:'Rate and log games',d:'Build a personal catalog of every playoff game, championship, and classic you\'ve watched or attended.'},
          {t:'Tell your stories',d:'From the Stands is where your memories live. The game you took your kid to. The bar where everything changed.'},
          {t:'Follow your teams',d:'Add teams to your profile and see their full playoff history, All-Timers, and what other fans are saying.'},
          {t:'Track your venues',d:'Mark arenas, stadiums, and courses you\'ve visited. Build a bucket list of the ones you haven\'t.'},
          {t:'Share reflections',d:'Write about what a player meant to you. The stuff that doesn\'t fit in a box score.'},
          {t:'Log your encounters',d:'Ever meet your hero in an airport? Bump into a legend at dinner? Those moments deserve a place too.'},
        ].map((f,i) => <div key={i} style={{ borderBottom:'1px solid var(--faint)', padding:'14px 0' }}>
          <div style={{ fontSize:14, color:'var(--ink)', marginBottom:4 }}>{f.t}</div>
          <div className="sans" style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5 }}>{f.d}</div>
        </div>)}
      </div>
    </div>
  )
}
