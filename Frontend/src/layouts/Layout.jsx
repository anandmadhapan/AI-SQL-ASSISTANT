import { Outlet, Link, useLocation } from 'react-router-dom'
import { Sparkles, Database, Cpu, Zap } from 'lucide-react'

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#f5f7fa' }}>

      {/* ── Background tint ── */}
      <div style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:`
          radial-gradient(ellipse 80% 50% at 10% -10%, rgba(59,130,246,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 90% 10%,  rgba(124,58,237,0.05) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 50% 100%, rgba(16,185,129,0.04) 0%, transparent 60%)
        `,
      }}/>

      {/* ════════════════ NAVBAR ════════════════ */}
      <header style={{
        position:'sticky', top:0, zIndex:200,
        background:'rgba(255,255,255,0.88)',
        backdropFilter:'blur(20px) saturate(180%)',
        WebkitBackdropFilter:'blur(20px) saturate(180%)',
        borderBottom:'1px solid rgba(15,23,42,0.08)',
        boxShadow:'0 1px 3px rgba(15,23,42,0.06)',
      }}>
        {/* nav-inner uses CSS class for responsive padding */}
        <div className="nav-inner">

          {/* Logo */}
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
            <div style={{
              width:34, height:34, borderRadius:9, flexShrink:0,
              background:'linear-gradient(135deg,#3b82f6 0%,#7c3aed 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 8px rgba(59,130,246,0.35)',
            }}>
              <Sparkles size={15} color="#fff" strokeWidth={2.5}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{
                fontSize:15, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1.1,
                background:'linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#7c3aed 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
                whiteSpace:'nowrap',
              }}>
                AI SQL Assistant
              </div>
              {/* subtitle hidden on very small screens via inline media */}
              <div style={{ fontSize:9, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#94a3b8', marginTop:1 }}
                className="nav-subtitle">
                Natural Language → SQL
              </div>
            </div>
          </Link>

          {/* vertical rule */}
          <div style={{ width:1, height:24, background:'rgba(15,23,42,0.1)', margin:'0 8px', flexShrink:0 }}/>

          <div style={{ flex:1 }}/>

          {/* right-side nav — CSS class hides badges on mobile */}
          <nav style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>

            {/* Datasets link — always visible */}
            <Link to="/" style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 14px', borderRadius:8, textDecoration:'none',
              fontSize:13, fontWeight:600, letterSpacing:'-0.01em',
              background: isHome ? '#eff6ff' : 'transparent',
              color:       isHome ? '#2563eb' : '#64748b',
              border:      isHome ? '1px solid #bfdbfe' : '1px solid transparent',
              transition:'all 0.18s',
              whiteSpace:'nowrap',
            }}>
              <Database size={14} strokeWidth={isHome ? 2.5 : 2}/>
              <span>Datasets</span>
            </Link>

            {/* Status + model chip — hidden on mobile via CSS */}
            <div className="nav-status-group">
              <div style={{ width:1, height:20, background:'rgba(15,23,42,0.08)', margin:'0 2px' }}/>

              {/* GEMINI ONLINE */}
              <div style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'5px 12px', borderRadius:8,
                background:'#ecfdf5', border:'1px solid rgba(16,185,129,0.25)',
              }}>
                <span style={{ position:'relative', display:'flex', alignItems:'center', width:8, height:8, flexShrink:0 }}>
                  <span style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    background:'rgba(16,185,129,0.5)',
                    animation:'ping 2s cubic-bezier(0,0,.2,1) infinite',
                  }}/>
                  <span style={{
                    position:'relative', width:8, height:8, borderRadius:'50%',
                    background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,0.7)', display:'block',
                  }}/>
                </span>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.04em', color:'#059669', whiteSpace:'nowrap' }}>
                  GEMINI ONLINE
                </span>
              </div>

              {/* Model chip — hidden on tablet too */}
              <div className="nav-gemini-chip" style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'5px 12px', borderRadius:8,
                background:'#f5f3ff', border:'1px solid rgba(124,58,237,0.15)',
              }}>
                <Cpu size={12} color="#7c3aed"/>
                <span style={{ fontSize:11, fontWeight:600, color:'#6d28d9', letterSpacing:'0.01em', whiteSpace:'nowrap' }}>
                  Gemini 2.5 Flash
                </span>
              </div>
            </div>

          </nav>
        </div>
      </header>

      {/* ════════════════ CONTENT ════════════════ */}
      <main className="page-main animate-fade-up">
        <Outlet/>
      </main>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{
        position:'relative', zIndex:1,
        borderTop:'1px solid rgba(15,23,42,0.06)',
        background:'rgba(255,255,255,0.7)',
        padding:'14px 32px',
      }}>
        <div className="footer-inner">
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <Zap size={11} color="#94a3b8" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              AI SQL Assistant · Powered by Gemini 2.5 Flash · Google ADK
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#10b981', flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'#64748b', fontWeight:500, whiteSpace:'nowrap' }}>
              All systems operational
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes ping { 75%,100% { transform:scale(2.2); opacity:0; } }
        @keyframes glowPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
        /* hide subtitle text on very small screens */
        @media(max-width:400px) { .nav-subtitle { display:none; } }
        /* collapse footer to column on tiny screens */
        @media(max-width:480px) { .footer-inner { flex-direction:column; align-items:flex-start; } }
      `}</style>
    </div>
  )
}
