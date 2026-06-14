import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft, Send, Sparkles, User, Trash2,
  History, BarChart2, ChevronDown, ChevronUp, Copy,
  Check, Database, Lightbulb, MessageSquare, Eye,
  Bot, Zap,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { datasetsAPI, queryAPI } from '../services/api'

/* ─── constants ─── */
const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#6366f1','#ec4899']
const COL_PALETTE  = [
  { bg:'#eff6ff', border:'#bfdbfe', text:'#1d4ed8' },
  { bg:'#f5f3ff', border:'#ddd6fe', text:'#5b21b6' },
  { bg:'#ecfdf5', border:'#a7f3d0', text:'#047857' },
  { bg:'#fffbeb', border:'#fde68a', text:'#92400e' },
  { bg:'#fff1f2', border:'#fecdd3', text:'#be123c' },
  { bg:'#f0f9ff', border:'#bae6fd', text:'#0369a1' },
]
const SUGGESTIONS = [
  { icon:'📊', text:'Show the first 10 rows' },
  { icon:'🔢', text:'Count total number of records' },
  { icon:'📈', text:'Show top 10 rows by the numeric column' },
  { icon:'🔍', text:'Find duplicate records' },
  { icon:'❓', text:'Show records with missing values' },
  { icon:'📉', text:'Min and max of each numeric column' },
  { icon:'🗂️', text:'Group by the first column and count' },
  { icon:'💡', text:'Give me a summary of this dataset' },
]

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit',
  })
}

/* ═══════ COPY BUTTON ═══════ */
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      title="Copy"
      style={{ background:'none', border:'none', cursor:'pointer', padding:'3px 5px', borderRadius:5,
        color: ok ? '#059669' : '#94a3b8', transition:'color .15s', display:'flex', alignItems:'center' }}>
      {ok ? <Check size={13}/> : <Copy size={13}/>}
    </button>
  )
}

/* ═══════ RESULT TABLE ═══════ */
function ResultTable({ columns, rows }) {
  if (!columns?.length || !rows?.length) return null
  return (
    <div style={{ marginTop:14, borderRadius:12, overflow:'auto',
      border:'1px solid rgba(15,23,42,0.1)', maxWidth:'100%' }}>
      <table style={{ minWidth:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'#f8fafc', borderBottom:'1px solid rgba(15,23,42,0.08)' }}>
            {columns.map(c => (
              <th key={c} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.07em', color:'#64748b', whiteSpace:'nowrap' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, i) => (
            <tr key={i} className="t-row" style={{ borderBottom:'1px solid rgba(15,23,42,0.05)' }}>
              {columns.map(c => (
                <td key={c} style={{ padding:'8px 14px', color:'#334155', whiteSpace:'nowrap',
                  maxWidth:180, overflow:'hidden', textOverflow:'ellipsis',
                  fontFamily:'JetBrains Mono,monospace', fontSize:11 }}>
                  {row[c] == null
                    ? <span style={{ color:'#cbd5e1', fontStyle:'italic', fontFamily:'Inter,sans-serif' }}>null</span>
                    : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 && (
        <p style={{ textAlign:'center', fontSize:11, color:'#94a3b8', padding:'8px 0',
          borderTop:'1px solid rgba(15,23,42,0.06)' }}>
          Showing 100 of {rows.length} rows
        </p>
      )}
    </div>
  )
}

/* ═══════ AUTO CHART ═══════ */
function AutoChart({ columns, rows }) {
  if (!columns?.length || !rows?.length || rows.length < 2) return null
  const numCols = columns.filter(c => rows.slice(0,5).every(r => r[c] != null && !isNaN(Number(r[c]))))
  const strCols = columns.filter(c => !numCols.includes(c))
  if (!numCols.length || !strCols.length) return null
  const label = strCols[0], val = numCols[0]
  const chartData = rows.slice(0,20).map(r => ({ name:String(r[label] ?? ''), value:Number(r[val] ?? 0) }))
  const tip = {
    contentStyle:{ background:'#fff', border:'1px solid rgba(15,23,42,0.1)', borderRadius:10,
      color:'#0f172a', fontSize:12, boxShadow:'0 4px 16px rgba(15,23,42,0.1)', fontFamily:'Inter,sans-serif' },
  }
  return (
    <div style={{ marginTop:14, padding:'14px 12px', borderRadius:14,
      background:'#f8fafc', border:'1px solid rgba(15,23,42,0.08)' }}>
      <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.08em', color:'#64748b' }}>Auto Visualization</p>
      <div style={{ height:180 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartData.length <= 6 ? (
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="72%" paddingAngle={3}>
                {chartData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} stroke="none"/>)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:'#64748b', fontFamily:'Inter' }}/>
              <Tooltip {...tip}/>
            </PieChart>
          ) : (
            <BarChart data={chartData} margin={{ top:4, right:6, left:-22, bottom:0 }}>
              <defs>
                <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6"/>
                  <stop offset="100%" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(15,23,42,0.06)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8', fontFamily:'Inter' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:9, fill:'#94a3b8', fontFamily:'Inter' }} axisLine={false} tickLine={false} width={38}/>
              <Tooltip {...tip}/>
              <Bar dataKey="value" fill="url(#barG)" radius={[4,4,0,0]}/>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ═══════ USER CHAT BUBBLE ═══════ */
function UserBubble({ msg }) {
  return (
    <div style={{ display:'flex', gap:10, flexDirection:'row-reverse', alignItems:'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width:30, height:30, borderRadius:9, flexShrink:0, marginTop:2,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg,#3b82f6,#7c3aed)',
        boxShadow:'0 2px 8px rgba(59,130,246,0.3)',
      }}>
        <User size={13} color="#fff"/>
      </div>
      {/* Bubble */}
      <div style={{
        maxWidth:'min(75%, calc(100% - 44px))',
        borderRadius:'16px 4px 16px 16px',
        padding:'11px 15px',
        wordBreak:'break-word',
        background:'linear-gradient(135deg,#3b82f6,#7c3aed)',
        color:'#fff',
        boxShadow:'0 2px 12px rgba(59,130,246,0.3)',
      }}>
        <p style={{ margin:0, fontSize:14, lineHeight:1.6 }}>{msg.content}</p>
        <p style={{ margin:'6px 0 0', fontSize:10, color:'rgba(255,255,255,0.5)', textAlign:'right' }}>
          {fmtDate(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

/* ═══════ AI RESULT PANEL ═══════ */
function AIResultPanel({ result, isPending, question }) {
  const [sqlOpen, setSqlOpen] = useState(false)

  /* Reset SQL panel when a new result arrives */
  useEffect(() => { setSqlOpen(false) }, [result])

  /* Loading state */
  if (isPending) return (
    <div style={{
      background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
      borderRadius:16, overflow:'hidden',
      boxShadow:'0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
        borderBottom:'1px solid rgba(15,23,42,0.07)',
        background:'linear-gradient(135deg,#f8faff,#ecfdf5)',
      }}>
        <div style={{
          width:30, height:30, borderRadius:9, flexShrink:0,
          background:'linear-gradient(135deg,#0ea5e9,#10b981)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 8px rgba(14,165,233,0.25)',
        }}>
          <Sparkles size={13} color="#fff"/>
        </div>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0f172a' }}>Gemini is thinking…</p>
      </div>
      {/* Dots */}
      <div style={{ padding:'20px 18px', display:'flex', alignItems:'center', gap:5 }}>
        {[0,160,320].map(d => (
          <span key={d} style={{
            width:7, height:7, borderRadius:'50%',
            background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display:'inline-block',
            animation:'bounceDot 1s ease-in-out infinite',
            animationDelay:`${d}ms`,
          }}/>
        ))}
        <p style={{ margin:'0 0 0 10px', fontSize:12, color:'#94a3b8' }}>
          Generating SQL and fetching results…
        </p>
      </div>
      <style>{`@keyframes bounceDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}`}</style>
    </div>
  )

  /* Empty / idle state */
  if (!result) return (
    <div style={{
      background:'#ffffff', border:'1px dashed rgba(15,23,42,0.1)',
      borderRadius:16, padding:'40px 20px', textAlign:'center',
      boxShadow:'0 1px 3px rgba(15,23,42,0.04)',
    }}>
      <div style={{
        width:52, height:52, borderRadius:14, margin:'0 auto 14px',
        background:'linear-gradient(135deg,#eff6ff,#f5f3ff)',
        border:'1px solid #bfdbfe',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Bot size={22} color="#3b82f6"/>
      </div>
      <p style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:'#1e293b' }}>
        Results will appear here
      </p>
      <p style={{ margin:0, fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>
        Type a question in the chat and hit Send.<br/>
        Gemini will write SQL, run it, and explain the results.
      </p>
    </div>
  )

  /* Result state */
  return (
    <div style={{
      background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
      borderRadius:16, overflow:'hidden',
      boxShadow:'0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)',
    }}>
      {/* Accent bar */}
      <div style={{ height:3, background:'linear-gradient(90deg,#0ea5e9,#10b981,#3b82f6)' }}/>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
        borderBottom:'1px solid rgba(15,23,42,0.07)',
        background:'linear-gradient(135deg,#f8faff,#ecfdf5)',
      }}>
        <div style={{
          width:30, height:30, borderRadius:9, flexShrink:0,
          background:'linear-gradient(135deg,#0ea5e9,#10b981)',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 2px 8px rgba(14,165,233,0.25)',
        }}>
          <Sparkles size={13} color="#fff"/>
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0f172a' }}>AI Response</p>
          {question && (
            <p style={{ margin:'2px 0 0', fontSize:11, color:'#64748b',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              ↳ {question}
            </p>
          )}
        </div>
        {result.row_count != null && (
          <span style={{
            fontSize:11, fontWeight:700, color:'#059669',
            background:'#ecfdf5', border:'1px solid rgba(16,185,129,0.2)',
            padding:'2px 10px', borderRadius:6, flexShrink:0,
          }}>
            {result.row_count} rows
          </span>
        )}
      </div>

      <div style={{ padding:'16px' }}>

        {/* Error banner */}
        {result.error && (
          <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10,
            background:'#fff1f2', border:'1px solid #fecdd3' }}>
            <p style={{ margin:0, fontSize:12, color:'#be123c', fontWeight:500 }}>⚠ SQL Error: {result.error}</p>
          </div>
        )}

        {/* AI explanation */}
        {result.response && (
          <div style={{ fontSize:14, lineHeight:1.75, color:'#1e293b', marginBottom: result.generated_sql ? 14 : 0 }}>
            <ReactMarkdown components={{
              p:     ({children}) => <p style={{ margin:'0 0 10px' }}>{children}</p>,
              strong:({children}) => <strong style={{ color:'#0f172a', fontWeight:700 }}>{children}</strong>,
              em:    ({children}) => <em style={{ color:'#3b82f6' }}>{children}</em>,
              ul:    ({children}) => <ul style={{ margin:'8px 0', paddingLeft:18 }}>{children}</ul>,
              li:    ({children}) => <li style={{ margin:'4px 0', color:'#334155' }}>{children}</li>,
              pre:   ({children}) => (
                <pre style={{ background:'#f8fafc', borderRadius:8, padding:12, overflowX:'auto',
                  fontSize:12, margin:'10px 0', border:'1px solid rgba(15,23,42,0.08)',
                  fontFamily:'JetBrains Mono,monospace', color:'#334155', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                  {children}
                </pre>
              ),
              code: ({inline, children}) => inline
                ? <code style={{ background:'#eff6ff', color:'#2563eb', padding:'1px 6px',
                    borderRadius:4, fontSize:12, fontFamily:'JetBrains Mono,monospace' }}>{children}</code>
                : <code style={{ color:'#475569', fontSize:12, fontFamily:'JetBrains Mono,monospace' }}>{children}</code>,
            }}>
              {result.response}
            </ReactMarkdown>
          </div>
        )}

        {/* SQL collapsible */}
        {result.generated_sql && (
          <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid rgba(15,23,42,0.09)', marginBottom:14 }}>
            <button onClick={() => setSqlOpen(v => !v)} style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'9px 13px', background:'#f8fafc', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Zap size={11} color="#3b82f6"/>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#3b82f6' }}>
                  Generated SQL
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <CopyBtn text={result.generated_sql}/>
                {sqlOpen ? <ChevronUp size={13} color="#94a3b8"/> : <ChevronDown size={13} color="#94a3b8"/>}
              </div>
            </button>
            {sqlOpen && (
              <pre style={{ margin:0, padding:14, background:'#f1f5f9', color:'#334155', fontSize:12,
                overflowX:'auto', fontFamily:'JetBrains Mono,monospace',
                borderTop:'1px solid rgba(15,23,42,0.06)', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {result.generated_sql}
              </pre>
            )}
          </div>
        )}

        {/* Table + Chart */}
        {result.columns && result.rows && <ResultTable columns={result.columns} rows={result.rows}/>}
        {result.columns && result.rows && <AutoChart columns={result.columns} rows={result.rows}/>}
      </div>
    </div>
  )
}

/* ═══════ PREVIEW TAB ═══════ */
function PreviewTab({ datasetId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['preview', datasetId],
    queryFn:  () => datasetsAPI.preview(datasetId, { limit:100 }).then(r => r.data),
    staleTime: 60_000,
  })
  if (isLoading) return (
    <div style={{ padding:20, display:'flex', flexDirection:'column', gap:8 }}>
      {[...Array(7)].map((_,i) => <div key={i} style={{ height:34, borderRadius:7 }} className="animate-shimmer"/>)}
    </div>
  )
  if (error) return <p style={{ padding:20, color:'#e11d48', fontSize:14 }}>Failed to load preview.</p>
  return (
    <div style={{ padding:16 }}>
      <p style={{ margin:'0 0 12px', fontSize:13, color:'#64748b' }}>
        Showing <strong style={{ color:'#0f172a' }}>{data?.rows?.length}</strong> of{' '}
        <strong style={{ color:'#0f172a' }}>{data?.total_rows?.toLocaleString()}</strong> rows
      </p>
      <div style={{ overflowX:'auto', borderRadius:12, border:'1px solid rgba(15,23,42,0.09)' }}>
        <table style={{ minWidth:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid rgba(15,23,42,0.08)' }}>
              <th style={{ padding:'9px 12px', textAlign:'left', fontSize:9, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.07em', color:'#94a3b8', whiteSpace:'nowrap' }}>#</th>
              {(data?.columns ?? []).map(c => (
                <th key={c} style={{ padding:'9px 12px', textAlign:'left', fontSize:9, fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.07em', color:'#64748b', whiteSpace:'nowrap' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row, i) => (
              <tr key={i} className="t-row" style={{ borderBottom:'1px solid rgba(15,23,42,0.05)' }}>
                <td style={{ padding:'8px 12px', color:'#cbd5e1', fontSize:11, fontFamily:'JetBrains Mono,monospace' }}>{i+1}</td>
                {(data?.columns ?? []).map(c => (
                  <td key={c} style={{ padding:'8px 12px', color:'#334155', whiteSpace:'nowrap',
                    maxWidth:160, overflow:'hidden', textOverflow:'ellipsis',
                    fontFamily:'JetBrains Mono,monospace', fontSize:11 }}>
                    {row[c] == null
                      ? <span style={{ color:'#e2e8f0', fontStyle:'italic', fontFamily:'Inter,sans-serif' }}>null</span>
                      : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════ HISTORY TAB ═══════ */
function HistoryTab({ datasetId, onReplay }) {
  const qc = useQueryClient()
  const [exp, setExp] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['query-history', datasetId],
    queryFn:  () => queryAPI.history({ dataset_id:datasetId, limit:100 }).then(r => r.data),
    staleTime: 10_000,
  })
  const clrMut = useMutation({
    mutationFn: () => queryAPI.clearHistory(datasetId),
    onSuccess:  () => qc.invalidateQueries(['query-history', datasetId]),
  })
  if (isLoading) return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
      {[...Array(4)].map((_,i) => <div key={i} style={{ height:60, borderRadius:10 }} className="animate-shimmer"/>)}
    </div>
  )
  const history = data?.history ?? []
  return (
    <div style={{ padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <p style={{ margin:0, fontSize:13, color:'#64748b' }}>
          <strong style={{ color:'#0f172a' }}>{data?.total ?? 0}</strong> queries
        </p>
        {history.length > 0 && (
          <button onClick={() => { if (confirm('Clear all history?')) clrMut.mutate() }}
            className="btn-danger"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', fontSize:12 }}>
            <Trash2 size={12}/> Clear all
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <History size={36} color="#e2e8f0" style={{ margin:'0 auto 12px' }}/>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#94a3b8' }}>No queries yet</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {history.map(h => (
            <div key={h.id} style={{ borderRadius:12, overflow:'hidden',
              background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
              boxShadow:'0 1px 3px rgba(15,23,42,0.05)' }}>
              <div style={{ padding:'12px 14px', cursor:'pointer' }}
                onClick={() => setExp(exp === h.id ? null : h.id)}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <p style={{ margin:'0 0 3px', fontSize:13, fontWeight:600, color:'#1e293b',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {h.question}
                    </p>
                    <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>{fmtDate(h.created_at)}</p>
                  </div>
                  <div className="history-action-row">
                    {h.error
                      ? <span className="badge badge-rose">Error</span>
                      : <span className="badge badge-emerald">{h.row_count ?? 0} rows</span>}
                    <button onClick={e => { e.stopPropagation(); onReplay(h.question) }}
                      className="btn-secondary"
                      style={{ padding:'4px 10px', fontSize:11, fontWeight:700,
                        display:'flex', alignItems:'center', gap:4, borderRadius:7 }}>
                      ↩ Replay
                    </button>
                    <span style={{ display:'flex', alignItems:'center' }}>
                      {exp === h.id ? <ChevronUp size={13} color="#94a3b8"/> : <ChevronDown size={13} color="#94a3b8"/>}
                    </span>
                  </div>
                </div>
              </div>
              {exp === h.id && h.generated_sql && (
                <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(15,23,42,0.06)' }}>
                  <p style={{ margin:'12px 0 7px', fontSize:9, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', color:'#3b82f6' }}>SQL</p>
                  <pre style={{ margin:0, background:'#f1f5f9', color:'#334155', fontSize:12,
                    padding:12, borderRadius:10, overflowX:'auto',
                    border:'1px solid rgba(15,23,42,0.07)', fontFamily:'JetBrains Mono,monospace',
                    whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                    {h.generated_sql}
                  </pre>
                  {h.ai_response && (
                    <>
                      <p style={{ margin:'12px 0 7px', fontSize:9, fontWeight:700, textTransform:'uppercase',
                        letterSpacing:'0.08em', color:'#059669' }}>AI Answer</p>
                      <p style={{ margin:0, fontSize:13, color:'#334155', lineHeight:1.65 }}>{h.ai_response}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════ DATASET DETAIL — MAIN ═══════ */
export default function DatasetDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const [tab, setTab]         = useState('chat')
  /* userMsgs: only the user's chat bubbles */
  const [userMsgs, setUserMsgs] = useState([])
  /* latestResult: the most recent AI response object */
  const [latestResult, setLatestResult] = useState(null)
  /* lastQuestion: question that produced latestResult */
  const [lastQuestion, setLastQuestion] = useState('')
  const [input, setInput]       = useState('')
  const [showSugg, setShowSugg] = useState(true)

  /* Scroll to bottom of chat when new user messages appear */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [userMsgs])

  const { data:ds, isLoading:dsL, error:dsE } = useQuery({
    queryKey: ['dataset', id],
    queryFn:  () => datasetsAPI.get(id).then(r => r.data),
    staleTime: 60_000,
  })

  const qMut = useMutation({
    mutationFn: q => queryAPI.ask(id, { question:q }),
    onSuccess: res => {
      const d = res.data
      setLatestResult({
        response:      d.response,
        generated_sql: d.generated_sql,
        columns:       d.columns,
        rows:          d.rows,
        row_count:     d.row_count,
        error:         d.error,
      })
      qc.invalidateQueries(['query-history', Number(id)])
    },
    onError: e => {
      setLatestResult({
        response: `⚠️ Error: ${e.response?.data?.detail ?? e.message}`,
        generated_sql: null,
        columns: null,
        rows: null,
        row_count: 0,
        error: e.response?.data?.detail ?? e.message,
      })
    },
  })

  function send(text) {
    const q = (text ?? input).trim()
    if (!q || qMut.isPending) return
    /* Add user bubble to chat */
    setUserMsgs(p => [...p, { content:q, timestamp:new Date().toISOString() }])
    setLastQuestion(q)
    setLatestResult(null)   // clear previous result while loading
    setInput('')
    setShowSugg(false)
    qMut.mutate(q)
  }

  /* ── Loading ── */
  if (dsL) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:400, gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:'50%',
        border:'3px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6' }}
        className="animate-spin-slow"/>
      <p style={{ color:'#94a3b8', fontSize:14 }}>Loading dataset…</p>
    </div>
  )
  /* ── Error ── */
  if (dsE || !ds) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <Database size={48} color="#e2e8f0" style={{ margin:'0 auto 16px' }}/>
      <p style={{ fontWeight:700, fontSize:18, color:'#1e293b', margin:'0 0 8px' }}>Dataset not found</p>
      <Link to="/" style={{ color:'#3b82f6', fontSize:13, fontWeight:600 }}>← Back to datasets</Link>
    </div>
  )

  const TABS = [
    { key:'chat',    label:'AI Chat', icon:MessageSquare },
    { key:'preview', label:'Preview', icon:Eye },
    { key:'history', label:'History', icon:History },
  ]

  return (
    <div className="detail-page">

      {/* ── Breadcrumb ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => navigate('/')} className="btn-ghost"
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', fontSize:13, fontWeight:600 }}>
          <ArrowLeft size={13}/> Datasets
        </button>
        <span style={{ color:'#cbd5e1', fontSize:15 }}>›</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#1e293b', letterSpacing:'-0.01em',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'calc(100% - 140px)' }}>
          {ds.name}
        </span>
      </div>

      {/* ── Dataset info card ── */}
      <div style={{ background:'#ffffff', border:'1px solid rgba(15,23,42,0.1)',
        borderRadius:18, overflow:'hidden',
        boxShadow:'0 1px 3px rgba(15,23,42,0.07), 0 4px 16px rgba(15,23,42,0.04)' }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#3b82f6 0%,#7c3aed 50%,#10b981 100%)' }}/>
        <div style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:13, flex:'1 1 180px', minWidth:0 }}>
              <div style={{ width:48, height:48, borderRadius:14, flexShrink:0,
                background:'#eff6ff', border:'1px solid #bfdbfe',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Database size={21} color="#3b82f6"/>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a', letterSpacing:'-0.03em',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {ds.name}
                </p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:'#94a3b8' }}>{ds.original_filename}</p>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', flexShrink:0 }}>
              {[
                { label:'Rows',    val:ds.row_count?.toLocaleString() ?? '—', color:'#2563eb', bg:'#eff6ff' },
                { label:'Columns', val:ds.col_count ?? '—',                   color:'#6d28d9', bg:'#f5f3ff' },
                { label:'Format',  val:(ds.file_type ?? 'csv').toUpperCase(), color:'#92400e', bg:'#fffbeb' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={{ padding:'8px 16px', borderRadius:11, textAlign:'center', background:bg, minWidth:64 }}>
                  <p style={{ margin:0, fontSize:16, fontWeight:800, color, letterSpacing:'-0.03em' }}>{val}</p>
                  <p style={{ margin:'2px 0 0', fontSize:9, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.08em', color:'rgba(0,0,0,0.25)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          {(ds.columns ?? []).length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:14, paddingTop:14,
              borderTop:'1px solid rgba(15,23,42,0.07)' }}>
              {(ds.columns ?? []).slice(0, 10).map((c, i) => {
                const col = COL_PALETTE[i % COL_PALETTE.length]
                return (
                  <span key={c.name} style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:600,
                    background:col.bg, border:`1px solid ${col.border}`, color:col.text }}
                    title={c.pg_type}>
                    {c.name}
                  </span>
                )
              })}
              {(ds.columns ?? []).length > 10 && (
                <span style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:600,
                  background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#64748b' }}>
                  +{ds.columns.length - 10} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="tab-bar">
        {TABS.map(({ key, label, icon:Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'7px 18px', borderRadius:9,
            fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
            background: tab === key ? '#eff6ff' : 'transparent',
            color:       tab === key ? '#2563eb' : '#64748b',
            border:      tab === key ? '1px solid #bfdbfe' : '1px solid transparent',
            transition:'all 0.15s', whiteSpace:'nowrap',
          }}>
            <Icon size={14} strokeWidth={tab === key ? 2.5 : 2}/> {label}
          </button>
        ))}
      </div>

      {/* ── Preview ── */}
      {tab === 'preview' && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
          borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
          <PreviewTab datasetId={ds.id}/>
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div style={{ background:'#f8fafc', border:'1px solid rgba(15,23,42,0.09)',
          borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
          <HistoryTab datasetId={ds.id} onReplay={q => { setTab('chat'); send(q) }}/>
        </div>
      )}

      {/* ════════════════════════════════════════
          CHAT TAB — two-column layout
          Left:  user chat bubbles + input bar
          Right: AI result panel
      ════════════════════════════════════════ */}
      {tab === 'chat' && (
        <div className="chat-section">
          <div className="chat-layout" style={{ flex:1, minHeight:0 }}>

            {/* ── LEFT: Chat panel (user bubbles + input) ── */}
            <div className="chat-panel">

              {/* Panel header */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 16px', flexShrink:0,
                borderBottom:'1px solid rgba(15,23,42,0.07)',
                background:'linear-gradient(135deg,#f8faff,#f5f3ff)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
                    background:'linear-gradient(135deg,#3b82f6,#7c3aed)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 2px 8px rgba(59,130,246,0.3)' }}>
                    <MessageSquare size={15} color="#fff"/>
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0f172a',
                      letterSpacing:'-0.02em' }}>
                      Ask a Question
                    </p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:'#64748b' }}>
                      Your messages appear here
                    </p>
                  </div>
                </div>
                <button onClick={() => {
                  if (window.confirm('Clear chat?')) {
                    setUserMsgs([])
                    setLatestResult(null)
                    setLastQuestion('')
                    setShowSugg(true)
                  }
                }} className="btn-danger"
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, flexShrink:0, marginLeft:8 }}>
                  <Trash2 size={12}/> Clear
                </button>
              </div>

              {/* User messages list */}
              <div style={{ flex:1, overflowY:'auto', padding:16,
                display:'flex', flexDirection:'column', gap:12, background:'#fafbfc' }}>

                {/* Intro prompt when no messages */}
                {userMsgs.length === 0 && (
                  <div style={{ textAlign:'center', padding:'32px 16px' }}>
                    <div style={{ width:48, height:48, borderRadius:13, margin:'0 auto 14px',
                      background:'linear-gradient(135deg,#eff6ff,#f5f3ff)',
                      border:'1px solid #bfdbfe',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <MessageSquare size={20} color="#3b82f6"/>
                    </div>
                    <p style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:'#1e293b' }}>
                      Start a conversation
                    </p>
                    <p style={{ margin:0, fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>
                      Type a question below or pick a suggestion.<br/>
                      Results will appear on the right.
                    </p>
                  </div>
                )}

                {/* User chat bubbles only */}
                {userMsgs.map((m, i) => <UserBubble key={i} msg={m}/>)}

                {/* Suggestion chips (shown until first message sent) */}
                {showSugg && userMsgs.length === 0 && !qMut.isPending && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingTop:4 }}>
                    {SUGGESTIONS.slice(0, 4).map((s, i) => (
                      <button key={i} onClick={() => send(s.text)} style={{
                        display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:10,
                        fontFamily:'inherit', cursor:'pointer', background:'#ffffff',
                        border:'1px solid rgba(15,23,42,0.1)', fontSize:12, fontWeight:500, color:'#475569',
                        boxShadow:'0 1px 3px rgba(15,23,42,0.06)', transition:'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#93c5fd'; e.currentTarget.style.color='#2563eb'; e.currentTarget.style.background='#eff6ff' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(15,23,42,0.1)'; e.currentTarget.style.color='#475569'; e.currentTarget.style.background='#ffffff' }}>
                        <span>{s.icon}</span> {s.text}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={bottomRef}/>
              </div>

              {/* Input bar */}
              <div style={{ padding:'12px 14px', flexShrink:0,
                borderTop:'1px solid rgba(15,23,42,0.07)', background:'#ffffff' }}>
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <textarea ref={inputRef} rows={1} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Ask anything about this dataset…"
                    disabled={qMut.isPending}
                    className="inp-premium"
                    style={{ resize:'none', flex:1, maxHeight:110, lineHeight:1.6 }}/>
                  <button onClick={() => send()} disabled={!input.trim() || qMut.isPending}
                    className="btn-primary"
                    style={{ width:42, height:42, borderRadius:11, padding:0, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {qMut.isPending
                      ? <div style={{ width:15, height:15, borderRadius:'50%',
                          border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff' }}
                          className="animate-spin-slow"/>
                      : <Send size={16}/>}
                  </button>
                </div>
                <p style={{ margin:'6px 0 0', textAlign:'center', fontSize:11, color:'#cbd5e1' }}>
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </div>

            {/* ── RIGHT: AI Result panel ── */}
            <div style={{
              minWidth:0,
              display:'flex', flexDirection:'column',
              gap:14,
            }}>

              {/* Result area */}
              <AIResultPanel
                result={latestResult}
                isPending={qMut.isPending}
                question={lastQuestion}
              />

              {/* Schema + extra suggestions — always shown in right column */}
              <div style={{ display:'flex', flexDirection:'column', gap:14, width:'100%' }}>

                {/* Suggested questions */}
                <div style={{ background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
                  borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
                  <div style={{ padding:'11px 14px', borderBottom:'1px solid rgba(15,23,42,0.07)',
                    display:'flex', alignItems:'center', gap:8, background:'#fffbeb' }}>
                    <Lightbulb size={13} color="#f59e0b"/>
                    <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#78350f',
                      textTransform:'uppercase', letterSpacing:'0.05em' }}>Suggestions</p>
                  </div>
                  <div>
                    {SUGGESTIONS.slice(4).map((s, i) => (
                      <button key={i} onClick={() => send(s.text)} disabled={qMut.isPending}
                        style={{ width:'100%', display:'flex', alignItems:'flex-start', gap:9, padding:'9px 14px',
                          fontFamily:'inherit', cursor:'pointer', textAlign:'left', background:'transparent',
                          border:'none', fontSize:12, fontWeight:400, color:'#475569', transition:'all 0.15s',
                          lineHeight:1.5, borderBottom:'1px solid rgba(15,23,42,0.04)' }}
                        onMouseEnter={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.color='#2563eb' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#475569' }}>
                        <span style={{ flexShrink:0 }}>{s.icon}</span>
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schema */}
                <div style={{ background:'#ffffff', border:'1px solid rgba(15,23,42,0.09)',
                  borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
                  <div style={{ padding:'11px 14px', borderBottom:'1px solid rgba(15,23,42,0.07)',
                    display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f5f3ff' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <BarChart2 size={13} color="#7c3aed"/>
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#4c1d95',
                        textTransform:'uppercase', letterSpacing:'0.05em' }}>Schema</p>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:'#7c3aed', background:'#ede9fe',
                      padding:'1px 8px', borderRadius:5, border:'1px solid #ddd6fe' }}>
                      {(ds.columns ?? []).length}
                    </span>
                  </div>
                  <div>
                    {(ds.columns ?? []).map((c, i) => {
                      const col = COL_PALETTE[i % COL_PALETTE.length]
                      return (
                        <div key={c.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          gap:8, padding:'7px 14px', borderBottom:'1px solid rgba(15,23,42,0.04)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:col.text }}/>
                            <span style={{ fontSize:12, fontWeight:600, color:'#1e293b',
                              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:120 }}>
                              {c.name}
                            </span>
                          </div>
                          <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0,
                            fontFamily:'JetBrains Mono,monospace', background:'#f1f5f9',
                            padding:'1px 6px', borderRadius:4 }}>
                            {c.pg_type}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>{/* end schema+suggestions column */}

            </div>{/* end right column */}
          </div>{/* end chat-layout */}
        </div>
      )}
    </div>
  )
}
