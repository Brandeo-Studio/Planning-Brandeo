import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DayDetail from './DayDetail'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function weekOfMonth(dateStr, year, month) {
  if (!dateStr) return 99
  const [, , d] = dateStr.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1).getDay()
  return Math.ceil((d + firstDay) / 7)
}

function StoryPhone({ story, onClick }) {
  const date = story.date ? new Date(story.date + 'T00:00:00') : null
  const dayShort = date ? DAYS_SHORT[date.getDay()] : ''
  const dayNum = date ? date.getDate() : ''
  const label = story.title ? story.title.substring(0, 18) : `${dayShort} ${dayNum}`
  const hasVideo = story.video_url && !story.image_url

  return (
    <div style={st.frame} onClick={onClick}>
      {/* Phone frame — 9:16 */}
      <div style={st.phone}>
        {story.image_url ? (
          <img src={story.image_url} style={st.img} alt="" />
        ) : hasVideo ? (
          <div style={st.videoPlaceholder}>
            <span style={{ fontSize: 32, color: '#fff' }}>▶</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>Video</span>
          </div>
        ) : (
          <div style={st.empty}>
            <span style={{ fontSize: 28 }}>📷</span>
            <span style={{ fontSize: 11, color: '#6b6b8a', fontWeight: 600 }}>Sin imagen</span>
          </div>
        )}

        {/* Progress bar at top (decorative, like Instagram) */}
        <div style={st.prog}>
          <div style={st.progFill} />
        </div>

        {/* Play button — opens video in new tab, doesn't open DayDetail */}
        {story.video_url && (
          <button
            style={st.playBtn}
            onClick={e => { e.stopPropagation(); window.open(story.video_url, '_blank', 'noopener') }}
          >
            ▶
          </button>
        )}

        {/* Gradient overlay at bottom with day label */}
        <div style={st.overlay}>
          <div style={st.dayLabel}>{dayShort} {dayNum}</div>
        </div>
      </div>

      {/* Label below phone */}
      <div style={st.storyLabel}>{label}</div>
    </div>
  )
}

export default function StoriesView({ planningId, readOnly = false, year, month, onPrev, onNext }) {
  const [stories, setStories] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchStories() }, [planningId])

  async function fetchStories() {
    const { data } = await supabase
      .from('posts').select('*')
      .eq('planning_id', planningId).eq('type', 'historia')
      .order('date').order('created_at')
    setStories(data || [])
  }

  const monthLabel = year && month ? `${MONTH_NAMES[month - 1]} ${year}` : ''

  // Group by week
  const grouped = {}
  stories.forEach(s => {
    const w = weekOfMonth(s.date, year, month)
    if (!grouped[w]) grouped[w] = []
    grouped[w].push(s)
  })
  const weeks = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <div style={st.wrap}>
      {/* Header */}
      <div style={st.header}>
        <div>
          <div style={st.title}>Preview de historias</div>
          <div style={st.sub}>{stories.length} historias este mes</div>
        </div>
        {onPrev && onNext && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="cal-nav-btn" onClick={onPrev}>←</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8a', minWidth: 70, textAlign: 'center' }}>{monthLabel}</span>
            <button className="cal-nav-btn" onClick={onNext}>→</button>
          </div>
        )}
      </div>

      {stories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#a0a0b8', fontSize: 13, lineHeight: 1.6 }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }}>📷</span>
          No hay historias cargadas este mes.
        </div>
      )}

      {/* Weeks */}
      {weeks.map(w => (
        <div key={w} style={{ marginBottom: '1.75rem' }}>
          <div style={st.weekLabel}>{w === 99 ? 'Sin fecha' : `Semana ${w}`}</div>
          <div style={st.row}>
            {grouped[w].map(story => (
              <StoryPhone
                key={story.id}
                story={story}
                onClick={() => setSelected(story.date)}
              />
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <DayDetail date={selected} planningId={planningId} onClose={() => setSelected(null)} readOnly={readOnly} />
      )}
    </div>
  )
}

const PHONE_WIDTH = 140

const st = {
  wrap: { maxWidth: 640, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#a0a0b8' },
  weekLabel: { fontSize: 12, fontWeight: 700, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.75rem' },
  row: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' },
  frame: { flexShrink: 0, width: PHONE_WIDTH, cursor: 'pointer', position: 'relative' },
  phone: {
    width: PHONE_WIDTH,
    aspectRatio: '9/16',
    borderRadius: 18,
    overflow: 'hidden',
    background: '#1a1a2e',
    position: 'relative',
    border: '2px solid #e4e3f7',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  empty: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: 'linear-gradient(135deg, #ebebff, #f0efff)',
  },
  videoPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'linear-gradient(135deg, #1a1a2e, #2d2b6e)',
  },
  prog: {
    position: 'absolute', top: 7, left: 7, right: 7,
    height: 2, background: 'rgba(255,255,255,.3)', borderRadius: 2,
  },
  progFill: { height: '100%', width: '100%', background: '#fff', borderRadius: 2 },
  playBtn: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.55)', border: '2px solid rgba(255,255,255,.8)', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, paddingLeft: 2 },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '10px 8px',
    background: 'linear-gradient(transparent, rgba(0,0,0,.6))',
  },
  dayLabel: { fontSize: 11, fontWeight: 700, color: '#fff' },
  storyLabel: { textAlign: 'center', marginTop: 6, fontSize: 10, fontWeight: 600, color: '#6b6b8a' },
}
