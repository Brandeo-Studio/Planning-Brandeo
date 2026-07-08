import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import CommentBox from './CommentBox'

const TYPE_LABELS = { historia: '● Historia', posteo: '■ Posteo', reel: '▶ Reel', carrusel: '⊞ Carrusel' }
const TYPE_BG = { historia: '#ebebff', posteo: '#e0faf3', reel: '#fff0ec', carrusel: '#f8eaff' }
const TYPE_TC = { historia: '#6c63ff', posteo: '#1a9e7a', reel: '#d84315', carrusel: '#7b1fa2' }

export default function CommentsView({ planningId, commentMode = 'admin', year, month, onPrev, onNext }) {
  const [postsWithComments, setPostsWithComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [planningId])

  async function fetchAll() {
    setLoading(true)
    const { data: posts } = await supabase
      .from('posts').select('id,type,title,date')
      .eq('planning_id', planningId).order('date')
    const ids = (posts || []).map(p => p.id)
    if (ids.length === 0) { setPostsWithComments([]); setLoading(false); return }
    const { data: comments } = await supabase.from('comments').select('post_id').in('post_id', ids)
    const withComments = new Set((comments || []).map(c => c.post_id))
    const filtered = (posts || [])
      .filter(p => withComments.has(p.id))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    setPostsWithComments(filtered)
    setLoading(false)
  }

  const monthLabel = year && month
    ? new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Comentarios del mes</div>
          <div style={s.sub}>{postsWithComments.length} publicaciones con comentarios</div>
        </div>
        {onPrev && onNext && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="cal-nav-btn" onClick={onPrev}>←</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8a', minWidth: 90, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</span>
            <button className="cal-nav-btn" onClick={onNext}>→</button>
          </div>
        )}
      </div>

      {loading && <p style={s.msg}>Cargando...</p>}
      {!loading && postsWithComments.length === 0 && (
        <div style={s.empty}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }}>💬</span>
          No hay comentarios este mes.
        </div>
      )}

      {postsWithComments.map(post => {
        const d = post.date ? new Date(post.date + 'T00:00:00') : null
        const dateLabel = d ? d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin fecha'
        return (
          <div key={post.id} style={s.card}>
            <div style={s.cardHead}>
              <span style={{ ...s.badge, background: TYPE_BG[post.type], color: TYPE_TC[post.type] }}>
                {TYPE_LABELS[post.type]}
              </span>
              {post.title && post.title !== 'Sin título' && <span style={s.postTitle}>{post.title}</span>}
              <span style={s.dateLabel}>{dateLabel}</span>
            </div>
            <CommentBox postId={post.id} commentMode={commentMode} onChange={fetchAll} />
          </div>
        )
      })}
    </div>
  )
}

const s = {
  wrap: { maxWidth: 640, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  title: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#a0a0b8' },
  msg: { color: '#a0a0b8', fontSize: 13, textAlign: 'center', marginTop: 20 },
  empty: { textAlign: 'center', padding: '2rem 1rem', color: '#a0a0b8', fontSize: 13, lineHeight: 1.6 },
  card: { border: '1.5px solid #e4e3f7', borderRadius: 14, padding: '1rem', marginBottom: 14, background: '#fff' },
  cardHead: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  postTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a2e' },
  dateLabel: { fontSize: 12, color: '#a0a0b8', marginLeft: 'auto', textTransform: 'capitalize' },
}
