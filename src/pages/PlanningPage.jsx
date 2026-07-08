import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import Topbar from '../components/Layout/Topbar'
import CalendarView from '../components/Planning/CalendarView'
import FeedView from '../components/Planning/FeedView'
import StoriesView from '../components/Planning/StoriesView'
import CommentsView from '../components/Planning/CommentsView'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TABS = ['Calendario', 'Preview feed', 'Preview historias', 'Comentarios']

const TIPO_SUMMARY = [
  { key: 'historia',  label: 'Historias', bg: '#ebebff', color: '#6c63ff' },
  { key: 'posteo',   label: 'Posteos',   bg: '#e0faf3', color: '#1a9e7a' },
  { key: 'reel',     label: 'Reels',     bg: '#fff0ec', color: '#d84315' },
  { key: 'carrusel', label: 'Carrusels', bg: '#f8eaff', color: '#7b1fa2' },
]

const LEGEND = [
  { label: 'Historia', color: '#6c63ff' },
  { label: 'Posteo',   color: '#43c59e' },
  { label: 'Reel',     color: '#ff7043' },
  { label: 'Carrusel', color: '#ab47bc' },
]

export default function PlanningPage() {
  const { clientId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [tab, setTab] = useState('Calendario')
  const [summary, setSummary] = useState({})
  const [specialDates, setSpecialDates] = useState([])
  const [showSdForm, setShowSdForm] = useState(false)
  const [newSdName, setNewSdName] = useState('')
  const [newSdDate, setNewSdDate] = useState('')
  const [savingSd, setSavingSd] = useState(false)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => { fetchClient() }, [clientId])
  useEffect(() => { if (client) fetchOrCreatePlanning() }, [client, year, month])
  useEffect(() => { if (planning) { fetchSummary(); fetchSpecialDates() } }, [planning])

  async function fetchClient() {
    const { data } = await supabase.from('clients').select('*').eq('id', clientId).single()
    setClient(data)
  }

  async function fetchOrCreatePlanning() {
    const { data: existing } = await supabase
      .from('plannings').select('*')
      .eq('client_id', clientId).eq('year', year).eq('month', month)
      .maybeSingle()
    if (existing) { setPlanning(existing); return }
    const { data: created, error } = await supabase
      .from('plannings').insert({ client_id: clientId, year, month }).select().single()
    if (error) console.error('Error creando planning:', error)
    setPlanning(created)
  }

  async function fetchSummary() {
    const { data } = await supabase.from('posts').select('type').eq('planning_id', planning.id)
    const counts = {}
    ;(data || []).forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    setSummary(counts)
  }

  async function fetchSpecialDates() {
    const { data } = await supabase
      .from('special_dates').select('*')
      .eq('planning_id', planning.id).order('date')
    setSpecialDates(data || [])
  }

  async function addSpecialDate(e) {
    e.preventDefault()
    if (!newSdName || !newSdDate) return
    setSavingSd(true)
    await supabase.from('special_dates').insert({ planning_id: planning.id, name: newSdName, date: newSdDate })
    setNewSdName(''); setNewSdDate(''); setShowSdForm(false); setSavingSd(false)
    fetchSpecialDates()
  }

  async function deleteSpecialDate(id) {
    await supabase.from('special_dates').delete().eq('id', id)
    setSpecialDates(prev => prev.filter(sd => sd.id !== id))
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  if (!client || !planning) return <div style={s.center}>Cargando...</div>

  const clientUrl = `${window.location.origin}/cliente/${client.slug}`
  const commentMode = profile?.role === 'admin' ? 'admin' : 'cm'

  return (
    <div style={{ minHeight: '100vh' }}>
      <Topbar title={client.name}>
        {profile?.role === 'admin' && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(clientUrl)} title="Copiar link">
            🔗 Link cliente
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Clientes</button>
      </Topbar>

      {/* Tab bar — underline style, full width */}
      <div style={s.tabsBar} className="cm-tabs-bar">
        {TABS.map(t => (
          <button key={t} className={`tab-ul${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'Comentarios' ? (
              <>
                <span className="tab-label-full">Comentarios</span>
                <span className="tab-label-icon">💬</span>
              </>
            ) : t}
          </button>
        ))}
      </div>

      {/* View content */}
      <div style={s.viewPad} className="cm-view-pad">

        {/* CALENDAR VIEW */}
        {tab === 'Calendario' && (
          <div className="cm-cal-layout">
            {/* Calendar card */}
            <div style={s.calCard} className="cm-cal-main">
              <CalendarView
                planningId={planning.id}
                year={year}
                month={month}
                commentMode={commentMode}
                onPrev={prevMonth}
                onNext={nextMonth}
              />
            </div>

            {/* Sidebar */}
            <div className="cm-cal-sidebar">
              {/* Card 1: Fechas especiales */}
              <div style={s.sideCard} className="cm-sd-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={s.sideTitle}>Fechas especiales</div>
                  {profile?.role === 'admin' && (
                    <button className="sd-add-btn" onClick={() => setShowSdForm(v => !v)}>
                      {showSdForm ? '✕' : '+ Agregar'}
                    </button>
                  )}
                </div>

                {showSdForm && (
                  <form onSubmit={addSpecialDate} style={{ marginBottom: 10 }}>
                    <input
                      style={s.sdInput}
                      value={newSdName}
                      onChange={e => setNewSdName(e.target.value)}
                      placeholder="Ej: Día del Padre"
                      required
                    />
                    <input
                      style={{ ...s.sdInput, marginTop: 6 }}
                      type="date"
                      value={newSdDate}
                      onChange={e => setNewSdDate(e.target.value)}
                      required
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        type="submit"
                        disabled={savingSd}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', background: '#6c63ff', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                      >
                        {savingSd ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSdForm(false); setNewSdName(''); setNewSdDate('') }}
                        style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid #e4e3f7', background: 'none', fontSize: 13, fontWeight: 600, color: '#6b6b8a', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                )}

                {specialDates.length === 0 && !showSdForm && (
                  <div style={{ fontSize: 12, color: '#a0a0b8', textAlign: 'center', padding: '4px 0' }}>Sin fechas cargadas</div>
                )}
                {specialDates.map(sd => {
                  const dayNum = new Date(sd.date + 'T00:00:00').getDate()
                  return (
                    <div key={sd.id} style={s.sdItem}>
                      <div style={s.sdDay}>{dayNum}</div>
                      <span style={s.sdName}>{sd.name}</span>
                      {profile?.role === 'admin' && (
                        <button style={s.sdDelete} onClick={() => deleteSpecialDate(sd.id)}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Card 2: Resumen del mes */}
              <div style={s.sideCard} className="cm-summary-card">
                <div style={{ ...s.sideTitle, marginBottom: '0.75rem' }}>Resumen del mes</div>
                <div style={s.resGrid}>
                  {TIPO_SUMMARY.map(t => (
                    <div key={t.key} style={{ ...s.resItem, background: t.bg }}>
                      <span style={{ ...s.resCount, color: t.color }}>{summary[t.key] || 0}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: t.color, opacity: .85 }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Leyenda */}
              <div style={s.sideCard} className="cm-legend-card">
                <div style={s.legRow}>
                  {LEGEND.map(l => (
                    <div key={l.label} style={s.legItem}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Preview feed' && (
          <FeedView
            planningId={planning.id}
            year={year}
            month={month}
            commentMode={commentMode}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        )}

        {tab === 'Preview historias' && (
          <StoriesView
            planningId={planning.id}
            year={year}
            month={month}
            commentMode={commentMode}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        )}

        {tab === 'Comentarios' && (
          <CommentsView
            planningId={planning.id}
            year={year}
            month={month}
            commentMode={commentMode}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        )}
      </div>
    </div>
  )
}

const s = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: '#aaa' },
  tabsBar: { background: '#fff', borderBottom: '1.5px solid #e4e3f7', display: 'flex', padding: '0 1.25rem', overflowX: 'auto' },
  viewPad: { padding: '1.25rem' },
  calLayout: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', maxWidth: 1000, margin: '0 auto' },
  calCard: { background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 2px 16px rgba(108,99,255,.08)' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  sideCard: { background: '#fff', borderRadius: 20, padding: '1.25rem', boxShadow: '0 2px 16px rgba(108,99,255,.08)' },
  sideTitle: { fontSize: 12, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.06em' },
  resGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },
  resItem: { borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 },
  resCount: { fontSize: 18, fontWeight: 700, lineHeight: 1 },
  legRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  legItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#6b6b8a' },
  sdInput: { width: '100%', border: '1.5px solid #e4e3f7', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: '#1a1a2e', background: '#f4f3ff', outline: 'none', fontFamily: 'inherit' },
  sdItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0efff' },
  sdDay: { minWidth: 28, height: 28, borderRadius: 8, background: '#f0efff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6c63ff', flexShrink: 0 },
  sdName: { fontSize: 12, fontWeight: 600, color: '#1a1a2e', flex: 1 },
  sdDelete: { background: 'none', border: 'none', cursor: 'pointer', color: '#a0a0b8', fontSize: 14, padding: 0, lineHeight: 1 },
}
