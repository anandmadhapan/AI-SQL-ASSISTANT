import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Trash2, Eye, FileSpreadsheet, FileText,
  CloudUpload, X, Sparkles, Database, Zap, Shield,
  Brain, Table2, CalendarDays, Plus, CheckCircle2,
} from 'lucide-react'
import { datasetsAPI } from '../services/api'

/* ─── helpers ─── */
const COL_PALETTE = [
  { bg:'#eff6ff', border:'#bfdbfe', text:'#1d4ed8' },
  { bg:'#f5f3ff', border:'#ddd6fe', text:'#5b21b6' },
  { bg:'#ecfdf5', border:'#a7f3d0', text:'#047857' },
  { bg:'#fffbeb', border:'#fde68a', text:'#92400e' },
  { bg:'#fff1f2', border:'#fecdd3', text:'#be123c' },
  { bg:'#f0f9ff', border:'#bae6fd', text:'#0369a1' },
]

function formatBytes(n) {
  if (!n) return ''
  if (n < 1024)    return `${n} B`
  if (n < 1048576) return `${(n/1024).toFixed(1)} KB`
  return `${(n/1048576).toFixed(1)} MB`
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })
}

/* ════════════════════════════════════════════════════
   UPLOAD ZONE
════════════════════════════════════════════════════ */
function UploadZone({ onSuccess }) {
  const qc                = useQueryClient()
  const [drag, setDrag]   = useState(false)
  const [file, setFile]   = useState(null)
  const [name, setName]   = useState('')
  const [error, setError] = useState('')
  const fileRef           = useRef(null)

  const mut = useMutation({
    mutationFn: ({ file, name }) => {
      const fd = new FormData()
      fd.append('file', file)
      if (name.trim()) fd.append('name', name.trim())
      return datasetsAPI.upload(fd)
    },
    onSuccess: res => {
      qc.invalidateQueries(['datasets'])
      setFile(null); setName(''); setError('')
      onSuccess?.(res.data)
    },
    onError: e => setError(e.response?.data?.detail ?? e.message ?? 'Upload failed.'),
  })

  function pick(f) {
    if (!f) return
    if (!['.csv','.xlsx','.xls'].some(x => f.name.toLowerCase().endsWith(x))) {
      setError('Only .csv, .xlsx, .xls files are supported.'); return
    }
    setFile(f); setError('')
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div style={{
      background:'#ffffff', border:'1px solid rgba(15,23,42,0.1)',
      borderRadius:18, overflow:'hidden',
      boxShadow:'0 1px 3px rgba(15,23,42,0.07), 0 4px 16px rgba(15,23,42,0.04)',
    }}>
      {/* Header */}
      <div style={{
        padding:'16px 20px', borderBottom:'1px solid rgba(15,23,42,0.07)',
        display:'flex', alignItems:'center', gap:12,
        background:'linear-gradient(135deg,#f8faff 0%,#f5f3ff 100%)',
      }}>
        <div style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          background:'linear-gradient(135deg,#3b82f6,#7c3aed)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 10px rgba(59,130,246,0.3)',
        }}>
          <CloudUpload size={18} color="#fff" strokeWidth={2}/>
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#0f172a', letterSpacing:'-0.02em' }}>
            Upload Dataset
          </p>
          <p style={{ margin:'2px 0 0', fontSize:11, color:'#64748b' }}>
            CSV · XLSX · XLS · Up to 50 MB
          </p>
        </div>
      </div>

      <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Drop zone */}
        <div
          onDragOver={e  => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
          style={{
            border:`2px dashed ${drag ? '#3b82f6' : 'rgba(15,23,42,0.12)'}`,
            borderRadius:14, padding:'28px 16px',
            display:'flex', flexDirection:'column', alignItems:'center', gap:12,
            cursor:'pointer', background: drag ? '#eff6ff' : '#fafbfc',
            transition:'all 0.18s',
          }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
            style={{ display:'none' }} onChange={e => pick(e.target.files[0])}/>

          {file ? (
            <>
              <div style={{
                width:48, height:48, borderRadius:14, background:'#eff6ff',
                border:'1px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <FileSpreadsheet size={22} color="#3b82f6"/>
              </div>
              <div style={{ textAlign:'center', minWidth:0, width:'100%' }}>
                <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#0f172a',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {file.name}
                </p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>{formatBytes(file.size)}</p>
              </div>
              <button type="button"
                onClick={e => { e.stopPropagation(); setFile(null); setName('') }}
                style={{
                  display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600,
                  color:'#e11d48', background:'#fff1f2', border:'1px solid #fecdd3',
                  borderRadius:7, padding:'4px 12px', cursor:'pointer', fontFamily:'inherit',
                }}>
                <X size={12}/> Remove
              </button>
            </>
          ) : (
            <>
              <div style={{
                width:48, height:48, borderRadius:14, background:'#f1f5f9',
                border:'1px solid rgba(15,23,42,0.1)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }} className="animate-float">
                <Upload size={20} color="#94a3b8"/>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#334155' }}>
                  Drop file here or <span style={{ color:'#3b82f6', fontWeight:700 }}>browse</span>
                </p>
                <p style={{ margin:'4px 0 0', fontSize:12, color:'#94a3b8' }}>
                  CSV, Excel (XLSX, XLS)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Name */}
        {file && (
          <div>
            <label style={{
              display:'block', fontSize:11, fontWeight:600, color:'#64748b',
              textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6,
            }}>
              Dataset Name{' '}
              <span style={{ color:'#94a3b8', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
                (optional)
              </span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Sales Q4 2024" className="inp-premium"/>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10,
            padding:'10px 14px', borderRadius:10, background:'#fff1f2', border:'1px solid #fecdd3',
          }}>
            <span style={{ color:'#e11d48', flexShrink:0 }}>⚠</span>
            <p style={{ margin:0, fontSize:13, color:'#be123c', lineHeight:1.5 }}>{error}</p>
          </div>
        )}

        {/* Button */}
        <button disabled={!file || mut.isPending} onClick={() => mut.mutate({ file, name })}
          className="btn-primary"
          style={{ width:'100%', padding:'11px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:14, borderRadius:10 }}>
          {mut.isPending ? (
            <>
              <div style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff' }}
                className="animate-spin-slow"/>
              Processing…
            </>
          ) : (
            <><Sparkles size={15}/> Upload &amp; Analyse</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   HOW IT WORKS
════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { n:1, label:'Upload file',         desc:'CSV or Excel up to 50 MB',              color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
    { n:2, label:'Schema detection',    desc:'Auto-detected, table created in PG',    color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
    { n:3, label:'Ask in English',      desc:'Plain-language question to Gemini',     color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
    { n:4, label:'Instant SQL + answer',desc:'Gemini writes, runs, and explains SQL', color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
  ]
  return (
    <div style={{
      background:'#ffffff', border:'1px solid rgba(15,23,42,0.1)',
      borderRadius:18, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.07)',
    }}>
      <div style={{
        padding:'13px 20px', borderBottom:'1px solid rgba(15,23,42,0.07)',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <CheckCircle2 size={14} color="#3b82f6"/>
        <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#334155', letterSpacing:'0.05em', textTransform:'uppercase' }}>
          How it works
        </p>
      </div>
      <div>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            display:'flex', alignItems:'flex-start', gap:14, padding:'12px 20px',
            borderBottom: i < steps.length-1 ? '1px solid rgba(15,23,42,0.05)' : 'none',
          }}>
            <div style={{
              width:28, height:28, borderRadius:99, flexShrink:0,
              background:s.bg, border:`1.5px solid ${s.border}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:800, color:s.color,
            }}>
              {s.n}
            </div>
            <div style={{ paddingTop:1 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#1e293b' }}>{s.label}</p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748b', lineHeight:1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   STAT BAR — uses CSS class for responsive columns
════════════════════════════════════════════════════ */
function StatBar({ total }) {
  const stats = [
    { label:'Datasets',   val:total ?? 0,   color:'#2563eb', bg:'#eff6ff' },
    { label:'SQL Engine', val:'PostgreSQL',  color:'#0369a1', bg:'#f0f9ff' },
    { label:'AI Model',   val:'Gemini 2.5', color:'#6d28d9', bg:'#f5f3ff' },
    { label:'Mode',       val:'Read-only',  color:'#047857', bg:'#ecfdf5' },
  ]
  return (
    <div className="stat-bar">
      {stats.map(({ label, val, color, bg }) => (
        <div key={label} className="stat-bar-cell"
          onMouseEnter={e => e.currentTarget.style.background = bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <p style={{ margin:0, fontSize:18, fontWeight:800, color, letterSpacing:'-0.04em' }}>{val}</p>
          <p style={{ margin:'4px 0 0', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════
   DATASET CARD
════════════════════════════════════════════════════ */
function DatasetCard({ dataset, onDelete }) {
  const navigate      = useNavigate()
  const ext           = (dataset.file_type ?? 'csv').toLowerCase()
  const isExcel       = ext !== 'csv'
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#ffffff',
        border:`1px solid ${hov ? '#93c5fd' : 'rgba(15,23,42,0.1)'}`,
        borderRadius:16, overflow:'hidden',
        display:'flex', flexDirection:'column',
        transition:'all 0.22s cubic-bezier(.22,1,.36,1)',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 12px 28px rgba(15,23,42,0.1), 0 0 0 3px rgba(59,130,246,0.08)'
          : '0 1px 3px rgba(15,23,42,0.07)',
      }}>

      {/* Top colour stripe */}
      <div style={{
        height:3,
        background: isExcel
          ? 'linear-gradient(90deg,#8b5cf6,#a78bfa)'
          : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
      }}/>

      <div style={{ padding:'15px 16px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{
            width:40, height:40, borderRadius:11, flexShrink:0,
            background: isExcel ? '#f5f3ff' : '#eff6ff',
            border:`1px solid ${isExcel ? '#ddd6fe' : '#bfdbfe'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {isExcel ? <FileSpreadsheet size={19} color="#7c3aed"/> : <FileText size={19} color="#3b82f6"/>}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0f172a',
              letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {dataset.name}
            </p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:'#94a3b8',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {dataset.original_filename}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
          {[
            { label:'Rows',   val:dataset.row_count?.toLocaleString() ?? '—', color:'#2563eb', bg:'#eff6ff' },
            { label:'Cols',   val:dataset.col_count ?? '—',                   color:'#6d28d9', bg:'#f5f3ff' },
            { label:'Format', val:ext.toUpperCase(),                           color:'#92400e', bg:'#fffbeb' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} style={{ background:bg, borderRadius:9, padding:'7px 4px', textAlign:'center' }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color, letterSpacing:'-0.02em' }}>{val}</p>
              <p style={{ margin:'2px 0 0', fontSize:9, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.07em', color:'rgba(0,0,0,0.28)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Column chips */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {(dataset.columns ?? []).slice(0, 5).map((c, i) => {
            const col = COL_PALETTE[i % COL_PALETTE.length]
            return (
              <span key={c.name} style={{
                padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:600,
                background:col.bg, border:`1px solid ${col.border}`, color:col.text,
              }}>
                {c.name}
              </span>
            )
          })}
          {(dataset.columns ?? []).length > 5 && (
            <span style={{ padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:600,
              background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#64748b' }}>
              +{dataset.columns.length - 5}
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:8,
          paddingTop:10, borderTop:'1px solid rgba(15,23,42,0.06)', marginTop:'auto',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <CalendarDays size={11} color="#cbd5e1"/>
            <span style={{ fontSize:11, color:'#94a3b8' }}>{formatDate(dataset.created_at)}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => navigate(`/datasets/${dataset.id}`)}
              className="btn-primary"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 13px', fontSize:12, borderRadius:8 }}>
              <Eye size={12}/> Open
            </button>
            <button onClick={() => onDelete(dataset)} className="btn-danger"
              style={{ padding:'6px 9px', borderRadius:8, display:'flex', alignItems:'center' }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════════════════ */
export default function Home() {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['datasets'],
    queryFn:  () => datasetsAPI.list().then(r => r.data),
    staleTime: 15_000,
  })

  const deleteMut = useMutation({
    mutationFn: id => datasetsAPI.delete(id),
    onSuccess:  () => qc.invalidateQueries(['datasets']),
    onError:    e  => alert(e.response?.data?.detail ?? 'Delete failed.'),
  })

  const datasets = data?.datasets ?? []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

      {/* ════ HERO ════ */}
      <section style={{
        textAlign:'center', padding:'36px 16px 24px',
        maxWidth:700, margin:'0 auto', width:'100%',
      }}>
        {/* Badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'5px 16px', borderRadius:99, marginBottom:22,
          background:'linear-gradient(135deg,#eff6ff,#f5f3ff)',
          border:'1px solid #bfdbfe', boxShadow:'0 1px 4px rgba(59,130,246,0.12)',
        }}>
          <div style={{ width:16, height:16, borderRadius:5, flexShrink:0,
            background:'linear-gradient(135deg,#3b82f6,#7c3aed)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Sparkles size={9} color="#fff" strokeWidth={2.5}/>
          </div>
          <span className="text-gradient-blue"
            style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Gemini 2.5 Flash · Google ADK
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          margin:'0 0 16px',
          fontSize:'clamp(28px,5vw,54px)',
          fontWeight:900, letterSpacing:'-0.05em', lineHeight:1.1, color:'#0f172a',
        }}>
          Talk to your data in{' '}
          <span className="text-gradient-blue">plain English</span>
        </h1>

        <p style={{
          margin:'0 auto 24px', maxWidth:460,
          fontSize:16, lineHeight:1.75, color:'#64748b', letterSpacing:'-0.01em',
        }}>
          Upload a CSV or Excel file. Ask questions naturally.
          Get instant SQL, live results, and AI-powered insights.
        </p>

        {/* Feature pills */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8 }}>
          {[
            { icon:Zap,    label:'Instant SQL',        bg:'#fffbeb', border:'#fde68a', color:'#92400e' },
            { icon:Shield, label:'Safe Read-only',     bg:'#ecfdf5', border:'#a7f3d0', color:'#047857' },
            { icon:Brain,  label:'AI Insights',        bg:'#f5f3ff', border:'#ddd6fe', color:'#5b21b6' },
            { icon:Table2, label:'Auto Schema',        bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8' },
          ].map(({ icon:Icon, label, bg, border, color }) => (
            <div key={label} style={{
              display:'flex', alignItems:'center', gap:7, padding:'6px 13px', borderRadius:99,
              background:bg, border:`1px solid ${border}`, fontSize:12, fontWeight:600, color,
            }}>
              <Icon size={12}/> {label}
            </div>
          ))}
        </div>
      </section>

      {/* ════ STAT BAR ════ */}
      <StatBar total={data?.total}/>

      {/* ════ MAIN GRID ════ — CSS class handles breakpoints */}
      <div className="home-grid">

        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <UploadZone onSuccess={ds => navigate(`/datasets/${ds.id}`)}/>
          <HowItWorks/>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Section header */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:9, flexShrink:0,
              background:'#eff6ff', border:'1px solid #bfdbfe',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Database size={15} color="#3b82f6"/>
            </div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#0f172a', letterSpacing:'-0.03em' }}>
              Your Datasets
            </h2>
            {data && (
              <span style={{ padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:700,
                background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb' }}>
                {data.total}
              </span>
            )}
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="dataset-grid">
              {[...Array(4)].map((_,i) => (
                <div key={i} style={{ height:240, borderRadius:16 }} className="animate-shimmer"/>
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'64px 20px',
              background:'#ffffff', border:'1px dashed rgba(15,23,42,0.12)',
              borderRadius:18, boxShadow:'0 1px 3px rgba(15,23,42,0.05)',
            }}>
              <div style={{ width:60, height:60, borderRadius:16, margin:'0 auto 18px',
                background:'#eff6ff', border:'1px solid #bfdbfe',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Database size={26} color="#93c5fd"/>
              </div>
              <p style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'#1e293b' }}>
                No datasets yet
              </p>
              <p style={{ margin:'0 0 20px', fontSize:13, color:'#94a3b8' }}>
                Upload a CSV or Excel file to get started
              </p>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                fontSize:13, fontWeight:600, color:'#3b82f6',
                padding:'6px 14px', background:'#eff6ff', borderRadius:8, border:'1px solid #bfdbfe',
              }}>
                <Plus size={13}/> Upload your first dataset
              </div>
            </div>
          ) : (
            <div className="dataset-grid">
              {datasets.map(ds => (
                <DatasetCard key={ds.id} dataset={ds}
                  onDelete={d => { if (confirm(`Delete "${d.name}"?`)) deleteMut.mutate(d.id) }}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
