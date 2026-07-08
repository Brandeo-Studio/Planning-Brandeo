import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DayDetail from './DayDetail'

const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TYPE_LABELS = { historia: 'Historia', posteo: 'Posteo', reel: 'Reel', carrusel: 'Carrusel' }
const TYPE_ICONS = { historia: 'H', posteo: 'P', reel: 'R', carrusel: 'C' }
const TYPE_TC = { historia: '#6c63ff', posteo: '#1a9e7a', reel: '#d84315', carrusel: '#7b1fa2' }

const CTAG = {
  historia: { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#ebebff', color: '#6c63ff' },
  posteo:   { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#e0faf3', color: '#1a9e7a' },
  reel:     { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#fff0ec', color: '#d84315' },
  carrusel: { fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4, background: '#f8eaff', color: '#7b1fa2' },
}

export default function CalendarView({ planningId, year, month, readOnly = false, commentMode = 'admin', onPrev, onNext }) {
  const [posts, setPosts] = useState([])
  const [commentedDates, setCommentedDates] = useState(new Set())
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => { fetchPosts() }, [planningId, year, month])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts').select('id,type,title,status,date')
      .eq('planning_id', planningId).not('date', 'is', null)
    const postData = data || []
    setPosts(postData)
    if (postData.length > 0) fetchCommentedDates(postData)
    else setCommentedDates(new Set())
  }

  async function fetchCommentedDates(postData) {
    const ids = postData.map(p => p.id)
    const { data } = await supabase.from('comments').select('post_id').eq('resolved', false).in('post_id', ids)
    if (!data || data.length === 0) { setCommentedDates(new Set()); return }
    const commentedIds = new Set(data.map(c => c.post_id))
    setCommentedDates(new Set(postData.filter(p => commentedIds.has(p.id)).map(p => p.date)))
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function pad(n) { return String(n).padStart(2, '0') }
  function dateStr(d) { return `${year}-${pad(month)}-${pad(d)}` }
  function postsForDay(d) { return posts.filter(p => p.date === dateStr(d)) }

  function typeCounts(dayPosts) {
    const counts = {}
    dayPosts.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    return Object.entries(counts)
  }

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
          const hasComments = commentedDates.has(dateStr(d))
          return (
            <div
              key={d}
              className={`cal-cell${tod ? ' is-today' : ''}${hasCont ? ' has-content' : ''}`}
              style={hasComments && !tod ? { background: '#fffde7', borderColor: '#f0c040' } : undefined}
              onClick={() => setSelectedDate(dateStr(d))}
            >
              <div style={{ ...s.dayNum, color: tod ? '#fff' : '#1a1a2e' }}>{d}</div>
              {hasCont && (
                <div className="cell-tags-text" style={s.cellTags}>
                  {dayPosts.slice(0, 4).map(p => (
                    <div key={p.id} style={CTAG[p.type]}>
                      {p.title ? p.title.substring(0, 12) : TYPE_LABELS[p.type]}
                    </div>
                  ))}
                </div>
              )}
              {hasCont && (
                <div className="cell-tags-icons" style={s.cellTagsIcons}>
                  {typeCounts(dayPosts).map(([type, count]) => (
                    <span key={type} style={{ ...s.iconTag, color: TYPE_TC[type] }}>
                      {TYPE_ICONS[type]}{count > 1 ? count : ''}
                    </span>
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
          commentMode={commentMode}
          onPostsChanged={fetchPosts}
        />
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  monthLabel: { fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  dayLabels: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: 6 },
  dayLbl: { textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 },
  dayNum: { fontSize: 12, fontWeight: 600, lineHeight: 1, marginBottom: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cellTags: { display: 'flex', flexDirection: 'column', gap: 2 },
  cellTagsIcons: { flexWrap: 'wrap', gap: 3 },
  iconTag: { fontSize: 10, fontWeight: 700, lineHeight: 1 },
}
