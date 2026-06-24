import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CalendarView from '../components/Planning/CalendarView'
import FeedView from '../components/Planning/FeedView'
import StoriesView from '../components/Planning/StoriesView'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TABS = ['Calendario', 'Feed', 'Historias']

export default function ClientPublicPage() {
  const { slug } = useParams()
  const [client, setClient] = useState(null)
  const [planning, setPlanning] = useState(null)
  const [tab, setTab] = useState('Calendario')
  const [notFound, setNotFound] = useState(false)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => { fetchClient() }, [slug])
  useEffect(() => { if (client) fetchPlanning() }, [client, year, month])

  async function fetchClient() {
    const { data } = await supabase.from('clients').select('*').eq('slug', slug).single()
    if (!data) setNotFound(true)
    else setClient(data)
  }

  async function fetchPlanning() {
    const { data } = await supabase.from('plannings').select('*').eq('client_id', client.id).eq('year', year).eq('month', month).single()
    setPlanning(data || null)
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
      <header style={styles.header}>
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

      <div style={styles.body}>
        <div style={styles.tabs}>
          {TABS.map(t => (
            <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div style={styles.content}>
          {!planning
            ? <p style={{ textAlign: 'center', color: '#aaa', paddingTop: 40 }}>No hay planning para este mes.</p>
            : (
              <>
                {tab === 'Calendario' && <CalendarView planningId={planning.id} year={year} month={month} readOnly />}
                {tab === 'Feed' && <FeedView planningId={planning.id} readOnly />}
                {tab === 'Historias' && <StoriesView planningId={planning.id} readOnly />}
              </>
            )
          }
        </div>

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
  header: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 },
  logoText: { fontWeight: 700, fontSize: 15 },
  clientBadge: { fontWeight: 700, fontSize: 16, color: 'var(--primary)' },
  nav: { display: 'flex', alignItems: 'center', gap: 6 },
  monthLabel: { fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: 'center' },
  body: { maxWidth: 960, margin: '0 auto', padding: '24px 20px' },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' },
  tab: { background: 'none', border: 'none', padding: '7px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#888', cursor: 'pointer', transition: 'all .15s' },
  tabActive: { background: 'var(--primary)', color: '#fff' },
  content: { background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 20 },
  publicNote: { marginTop: 16, padding: '10px 16px', background: 'rgba(108,99,255,.07)', borderRadius: 10, fontSize: 13, color: '#888', textAlign: 'center' },
}
