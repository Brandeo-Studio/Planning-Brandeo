import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DayDetail from './DayDetail'

const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TYPE_LABELS = { historia: 'Historia', posteo: 'Posteo', reel: 'Reel', carrusel: 'Carrusel' }

const CTAG = {
  historia: { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#ebebff', color: '#6c63ff' },
  posteo:   { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#e0faf3', color: '#1a9e7a' },
  reel:     { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#fff0ec', color: '#d84315' },
  carrusel: { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#f8eaff', color: '#7b1fa2' },
}

export default function CalendarView({ planningId, year, month, readOnly = false, onPrev, onNext }) {
  const [posts, setPosts] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => { fetchPosts() }, [planningId, year, month])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts').select('id,type,title,status,date')
      .eq('planning_id', planningId).not('date', 'is', null)
    setPosts(data || [])
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function pad(n) { return String(n).padStart(2, '0') }
  function dateStr(d) { return `${year}-${pad(month)}-${pad(d)}` }
  function postsForDay(d) { return posts.filter(p => p.date === dateStr(d)) }

  const today = new Date()
  function isToday(d) {
    return today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d
  }

  return (
    <div>
      <div style={s.header}>
        <span style={s.monthLabel}>{MONTH_NAMES[month - 1]} {year}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {onPrev && <button className="cal-nav-btn" onClick={onPrev}>←</button>}
          {onNext && <button className="cal-nav-btn" onClick={onNext}>→</button>}
        </div>
      </div>

      <div style={s.dayLabels}>
        {DAYS.map(d => <div key={d} style={s.dayLbl}>{d}</div>)}
      </div>

      <div style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cal-cell" style={{ opacity: 0, pointerEvents: 'none' }} />
          const dayPosts = postsForDay(d)
          const tod = isToday(d)
          const hasCont = dayPosts.length > 0
          return (
            <div
              key={d}
              className={`cal-cell${tod ? ' is-today' : ''}${hasCont ? ' has-content' : ''}`}
              onClick={() => setSelectedDate(dateStr(d))}
            >
              <div style={{ ...s.dayNum, color: tod ? '#fff' : '#1a1a2e' }}>{d}</div>
              {hasCont && (
                <div style={s.cellTags}>
                  {dayPosts.slice(0, 4).map(p => (
                    <div key={p.id} style={CTAG[p.type]}>
                      {p.title ? p.title.substring(0, 12) : TYPE_LABELS[p.type]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <DayDetail
          date={selectedDate}
          planningId={planningId}
          onClose={() => setSelectedDate(null)}
          readOnly={readOnly}
          onPostsChanged={fetchPosts}
        />
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  monthLabel: { fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  dayLabels: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 },
  dayLbl: { textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  dayNum: { fontSize: 12, fontWeight: 600, lineHeight: 1, marginBottom: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellTags: { display: 'flex', flexDirection: 'column', gap: 2 },
}
