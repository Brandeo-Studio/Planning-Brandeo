import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CalendarView from '../components/Planning/CalendarView'
import FeedView from '../components/Planning/FeedView'
import StoriesView from '../components/Planning/StoriesView'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TABS = ['Calendario', 'Feed', 'Historias']

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

export default function ClientPublicPage() {
  const { slug } = useParams()
  const [client, setClient] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [tab, setTab] = useState('Calendario')
  const [notFound, setNotFound] = useState(false)
  const [summary, setSummary] = useState({})

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => { fetchClient() }, [slug])
  useEffect(() => { if (client) fetchPlanning() }, [client, year, month])
  useEffect(() => { if (planning) fetchSummary() }, [planning])

  async function fetchClient() {
    const { data } = await supabase.from('clients').select('*').eq('slug', slug).single()
    if (!data) setNotFound(true)
    else setClient(data)
  }

  async function fetchPlanning() {
    const { data } = await supabase.from('plannings').select('*').eq('client_id', client.id).eq('year', year).eq('month', month).single()
    setPlanning(data || null)
    setSummary({})
  }

  async function fetchSummary() {
    const { data } = await supabase.from('posts').select('type').eq('planning_id', planning.id)
    const counts = {}
    ;(data || []).forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    setSummary(counts)
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  if (notFound) return (
    <div style={styles.center}>
      <div style={styles.notFound}>
        <span style={{ fontSize: 48 }}>🔍</span>
        <h2>Cliente no encontrado</h2>
        <p style={{ color: '#aaa' }}>El link no corresponde a ningún cliente activo.</p>
      </div>
    </div>
  )

  if (!client) return <div style={styles.center}>Cargando...</div>

  return (
    <div style={styles.page}>
      <header style={styles.header} className="client-page-header">
        <div style={styles.logo}>
          <div style={styles.logoIcon}>B</div>
          <span style={styles.logoText}>Planning Brandeo</span>
        </div>
        <div style={styles.clientBadge}>{client.name}</div>
        <div style={styles.nav}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
          <span style={styles.monthLabel}>{MONTHS[month-1]} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
        </div>
      </header>

      <div style={styles.body} className="client-page-body">
        <div style={styles.tabs}>
          {TABS.map(t => (
            <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {!planning ? (
          <div style={styles.content}>
            <p style={{ textAlign: 'center', color: '#aaa', paddingTop: 40 }}>No hay planning para este mes.</p>
          </div>
        ) : tab === 'Calendario' ? (
          <div className="client-cal-layout">
            <div className="client-cal-main" style={styles.content}>
              <CalendarView planningId={planning.id} year={year} month={month} readOnly />
            </div>
            <div className="client-cal-sidebar">
              <div style={styles.sideCard}>
                <div style={styles.sideTitle}>Resumen del mes</div>
                <div style={styles.resGrid}>
                  {TIPO_SUMMARY.map(t => (
                    <div key={t.key} style={{ ...styles.resItem, background: t.bg }}>
                      <span style={{ ...styles.resCount, color: t.color }}>{summary[t.key] || 0}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: t.color, opacity: .85 }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.sideCard}>
                <div style={styles.legRow}>
                  {LEGEND.map(l => (
                    <div key={l.label} style={styles.legItem}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.content}>
            {tab === 'Feed' && <FeedView planningId={planning.id} readOnly />}
            {tab === 'Historias' && <StoriesView planningId={planning.id} readOnly />}
          </div>
        )}

        <div style={styles.publicNote}>
          <span>Vista de cliente — podés dejar comentarios en cada contenido haciendo click en el día.</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  notFound: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' },
  header: { background: '#fff', borderBottom: '1px solid var(--border)', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 },
  logoText: { fontWeight: 700, fontSize: 15 },
  clientBadge: { fontWeight: 700, fontSize: 16, color: 'var(--primary)' },
  nav: { display: 'flex', alignItems: 'center', gap: 6 },
  monthLabel: { fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: 'center' },
  body: { maxWidth: 1100, margin: '0 auto', paddingTop: 24, paddingBottom: 24 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' },
  tab: { background: 'none', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#888', cursor: 'pointer', transition: 'all .15s' },
  tabActive: { background: 'var(--primary)', color: '#fff' },
  content: { background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 20 },
  publicNote: { marginTop: 16, padding: '10px 16px', background: 'rgba(108,99,255,.07)', borderRadius: 10, fontSize: 13, color: '#888', textAlign: 'center' },
  sideCard: { background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: '1.25rem' },
  sideTitle: { fontSize: 12, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.75rem' },
  resGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },
  resItem: { borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 },
  resCount: { fontSize: 18, fontWeight: 700, lineHeight: 1 },
  legRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  legItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#6b6b8a' },
}
