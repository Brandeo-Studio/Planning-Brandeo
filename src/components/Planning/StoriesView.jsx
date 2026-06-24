import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import DayDetail from './DayDetail'
import CommentBox from './CommentBox'

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

function StoryModal({ story, onClose, onEditDay, readOnly }) {
  const date = story.date ? new Date(story.date + 'T00:00:00') : null
  const dateLabel = date
    ? date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <div style={sm.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={sm.box}>
        <div style={sm.header}>
          <div>
            <span style={sm.typeBadge}>Historia</span>
            {dateLabel && <span style={sm.dayLabel}> · {dateLabel}</span>}
          </div>
          <button style={sm.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={sm.body}>
          {story.image_url ? (
            <img src={story.image_url} style={{ width: '100%', borderRadius: 10, objectFit: 'contain', display: 'block', maxHeight: 480, background: '#f4f3ff', marginBottom: '0.75rem' }} alt="" />
          ) : story.video_url ? (
            <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: 360, borderRadius: 10, background: 'linear-gradient(135deg,#1a1a2e,#2d2b6e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 36, color: '#fff' }}>▶</span>
              <button style={sm.videoBtn} onClick={() => window.open(story.video_url, '_blank', 'noopener')}>Ver video</button>
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: 360, borderRadius: 10, background: '#ebebff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6c63ff' }}>Sin imagen</span>
            </div>
          )}
          {story.title && <div style={sm.tema}><strong>Tema:</strong> {story.title}</div>}
          {story.copy && <div style={sm.copy}>{story.copy}</div>}
          {!readOnly && (
            <button style={sm.editBtn} onClick={() => { onEditDay(story.date); onClose() }}>
              ✎ Editar este día
            </button>
          )}
          <CommentBox postId={story.id} readOnly={false} />
        </div>
      </div>
    </div>
  )
}

export default function StoriesView({ planningId, readOnly = false, year, month, onPrev, onNext }) {
  const [stories, setStories] = useState([])
  const [selected, setSelected] = useState(null)
  const [modalStory, setModalStory] = useState(null)

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
                onClick={() => setModalStory(story)}
              />
            ))}
          </div>
        </div>
      ))}

      {modalStory && (
        <StoryModal
          story={modalStory}
          onClose={() => setModalStory(null)}
          onEditDay={date => { setSelected(date); setModalStory(null) }}
          readOnly={readOnly}
        />
      )}
      {selected && (
        <DayDetail date={selected} planningId={planningId} onClose={() => setSelected(null)} readOnly={readOnly} />
      )}
    </div>
  )
}

const sm = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' },
  box: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1.5px solid #e4e3f7', flexShrink: 0 },
  typeBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#ebebff', color: '#6c63ff' },
  dayLabel: { fontSize: 12, color: '#6b6b8a' },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f4f3ff', cursor: 'pointer', fontSize: 16, color: '#6b6b8a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { padding: '1rem 1.25rem', overflowY: 'auto' },
  tema: { fontSize: 12, color: '#6b6b8a', marginBottom: '0.5rem' },
  copy: { fontSize: 13, color: '#1a1a2e', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.75rem' },
  editBtn: { width: '100%', padding: 9, borderRadius: 10, border: '1.5px solid #6c63ff', background: 'none', fontSize: 13, fontWeight: 600, color: '#6c63ff', cursor: 'pointer', fontFamily: 'inherit', marginTop: '0.5rem', marginBottom: '0.5rem' },
  videoBtn: { padding: '8px 20px', borderRadius: 20, border: 'none', background: '#6c63ff', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
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
