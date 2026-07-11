import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { videoThumbUrl } from '../../lib/cloudinary'
import { isVideoUrl, parseCarouselImages } from '../../lib/media'
import DayDetail from './DayDetail'
import CommentBox from './CommentBox'
import MediaCarousel from './MediaCarousel'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TYPE_LABELS = { historia: 'Historia', posteo: 'Posteo', reel: 'Reel', carrusel: 'Carrusel' }
const TYPE_BG = { historia: '#ebebff', posteo: '#e0faf3', reel: '#fff0ec', carrusel: '#f8eaff' }
const TYPE_TC = { historia: '#6c63ff', posteo: '#1a9e7a', reel: '#d84315', carrusel: '#7b1fa2' }

function CellThumb({ media }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a2e,#2d2b6e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, color: '#fff' }}>▶</span>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" onError={() => setBroken(true)} />
      {media.isVideo && (
        <div style={s.playBadge}><span style={{ fontSize: 16, color: '#fff' }}>▶</span></div>
      )}
    </div>
  )
}

function getModalSlides(post) {
  if (post.type === 'carrusel') {
    return parseCarouselImages(post.image_url).map(url => ({ url, isVideo: isVideoUrl(url) }))
  }
  if (post.type === 'reel') {
    const slides = []
    const cover = post.image_url || (post.video_url ? videoThumbUrl(post.video_url) : null)
    if (cover) slides.push({ url: cover, isVideo: false })
    if (post.video_url) slides.push({ url: post.video_url, isVideo: true })
    return slides
  }
  if (post.image_url) return [{ url: post.image_url, isVideo: false }]
  if (post.video_url) return [{ url: post.video_url, isVideo: true }]
  return []
}

function PostModal({ post, onClose, onEditDay, readOnly, commentMode = 'admin' }) {
  const slides = getModalSlides(post)

  const dateLabel = post.date
    ? new Date(post.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal.box}>
        <div style={modal.header}>
          <div>
            <span style={{ ...modal.typeBadge, background: TYPE_BG[post.type], color: TYPE_TC[post.type] }}>
              {TYPE_LABELS[post.type]}
            </span>
            {dateLabel && <span style={modal.dayLabel}> · {dateLabel}</span>}
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modal.body}>
          {slides.length > 0 ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <MediaCarousel items={slides} maxHeight={480} />
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: TYPE_BG[post.type], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_TC[post.type] }}>{TYPE_LABELS[post.type]}</span>
            </div>
          )}
          {post.title && <div style={modal.tema}><strong>Tema:</strong> {post.title}</div>}
          {post.copy && <div style={modal.copy}>{post.copy}</div>}
          {!readOnly && (
            <button style={modal.editBtn} onClick={() => { onEditDay(post.date); onClose() }}>
              ✎ Editar este día
            </button>
          )}
          <CommentBox postId={post.id} commentMode={commentMode} />
        </div>
      </div>
    </div>
  )
}

export default function FeedView({ planningId, readOnly = false, commentMode = 'admin', year, month, onPrev, onNext }) {
  const [posts, setPosts] = useState([])
  const [modalPost, setModalPost] = useState(null)
  const [editDate, setEditDate] = useState(null)

  useEffect(() => { fetchPosts() }, [planningId])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts').select('*')
      .eq('planning_id', planningId)
      .in('type', ['posteo', 'carrusel', 'reel'])
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    setPosts(data || [])
  }

  function getCellMedia(p) {
    if (p.type === 'carrusel') {
      const first = parseCarouselImages(p.image_url)[0]
      if (!first) return null
      return isVideoUrl(first)
        ? { url: videoThumbUrl(first), isVideo: true }
        : { url: first, isVideo: false }
    }
    if (p.image_url) return { url: p.image_url, isVideo: false }
    if (p.video_url) return { url: videoThumbUrl(p.video_url), isVideo: true }
    return null
  }

  const monthLabel = year && month ? `${MONTH_NAMES[month - 1]} ${year}` : ''

  const padded = [...posts]
  while (padded.length % 3 !== 0) padded.push(null)
  if (!padded.length) padded.push(null, null, null)

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Preview del feed</div>
          <div style={s.sub}>{posts.length} publicaciones este mes</div>
        </div>
        {onPrev && onNext && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="cal-nav-btn" onClick={onPrev}>←</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8a', minWidth: 70, textAlign: 'center' }}>{monthLabel}</span>
            <button className="cal-nav-btn" onClick={onNext}>→</button>
          </div>
        )}
      </div>

      <div style={s.grid}>
        {padded.map((p, i) => {
          if (!p) return (
            <div key={`empty-${i}`} className="f-cell">
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a0a0b8', fontWeight: 500 }}>vacío</div>
            </div>
          )
          const media = getCellMedia(p)
          const dayNum = p.date ? new Date(p.date + 'T00:00:00').getDate() : ''
          return (
            <div key={p.id} className="f-cell" onClick={() => setModalPost(p)}>
              {media
                ? <CellThumb media={media} />
                : (
                    <div style={{ width: '100%', height: '100%', background: TYPE_BG[p.type], display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <span style={{ fontSize: 20 }}>
                        {p.type === 'reel' ? '▶' : p.type === 'carrusel' ? '⊞' : '■'}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_TC[p.type] }}>{TYPE_LABELS[p.type]}</span>
                      <span style={{ fontSize: 9, color: TYPE_TC[p.type], opacity: .7 }}>Día {dayNum}</span>
                    </div>
                  )
              }
              {p.type === 'carrusel' && parseCarouselImages(p.image_url).length > 1 && (
                <div style={s.badge}>⊞ {parseCarouselImages(p.image_url).length}</div>
              )}
              <div className="f-ov">
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.3)', padding: '2px 7px', borderRadius: 20, marginBottom: 3 }}>
                  {TYPE_LABELS[p.type]}
                </span>
                {p.title && p.title !== 'Sin título' && (
                  <span style={s.ovTitle}>{p.title}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>Día {dayNum}</span>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#a0a0b8', marginTop: '1rem' }}>
        Tocá una celda para ver o editar ese día
      </p>

      {modalPost && (
        <PostModal
          post={modalPost}
          onClose={() => setModalPost(null)}
          onEditDay={date => setEditDate(date)}
          readOnly={readOnly}
          commentMode={commentMode}
        />
      )}
      {editDate && (
        <DayDetail date={editDate} planningId={planningId} onClose={() => setEditDate(null)} readOnly={readOnly} commentMode={commentMode} />
      )}
    </div>
  )
}

const s = {
  wrap: { maxWidth: 500, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#a0a0b8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, borderRadius: 12, overflow: 'hidden' },
  badge: { position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,.5)', borderRadius: 5, padding: '2px 5px', fontSize: 8, fontWeight: 700, color: '#fff' },
  playBadge: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ovTitle: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#fff', padding: '0 10px', marginBottom: 3, lineHeight: 1.3 },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem' },
  box: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1.5px solid #e4e3f7', flexShrink: 0 },
  typeBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  dayLabel: { fontSize: 12, color: '#6b6b8a' },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f4f3ff', cursor: 'pointer', fontSize: 16, color: '#6b6b8a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { padding: '1rem 1.25rem', overflowY: 'auto' },
  tema: { fontSize: 12, color: '#6b6b8a', marginBottom: '0.5rem' },
  copy: { fontSize: 13, color: '#1a1a2e', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.75rem' },
  editBtn: { width: '100%', padding: 9, borderRadius: 10, border: '1.5px solid #6c63ff', background: 'none', fontSize: 13, fontWeight: 600, color: '#6c63ff', cursor: 'pointer', fontFamily: 'inherit', marginTop: '0.5rem' },
}
