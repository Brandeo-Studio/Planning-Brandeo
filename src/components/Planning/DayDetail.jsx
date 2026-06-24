import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PostBlock from './PostBlock'

const TYPES = ['historia', 'posteo', 'reel', 'carrusel']
const TYPE_LABELS = { historia: '● Historia', posteo: '■ Posteo', reel: '▶ Reel', carrusel: '⊞ Carrusel' }

export default function DayDetail({ date, planningId, onClose, readOnly = false, onPostsChanged }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [addError, setAddError] = useState('')

  useEffect(() => { fetchPosts() }, [date, planningId])

  async function fetchPosts() {
    if (!planningId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('posts').select('*')
      .eq('planning_id', planningId).eq('date', date)
      .order('created_at')
    if (error) console.error('fetchPosts error:', error)
    setPosts(data || [])
    setLoading(false)
  }

  async function addPost(type) {
    if (!planningId) { setAddError('planningId no definido'); return }
    setAdding(type)
    setAddError('')
    const { error } = await supabase.from('posts').insert({
      planning_id: planningId,
      type,
      title: 'Sin título',
      date,
      status: 'borrador',
    })
    if (error) {
      console.error('addPost error:', error)
      setAddError(error.message)
    } else {
      await fetchPosts()
      if (onPostsChanged) onPostsChanged()
    }
    setAdding(null)
  }

  function handleUpdate(updated) {
    setPosts(p => p.map(x => x.id === updated.id ? updated : x))
  }

  function handleDelete(id) {
    setPosts(p => p.filter(x => x.id !== id))
    if (onPostsChanged) onPostsChanged()
  }

  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>{label}</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!readOnly && (
          <div style={styles.addRow} className="add-type-row">
            <span style={styles.addLabel} className="add-type-label">Agregar</span>
            {TYPES.map(t => (
              <button key={t} className="add-type-btn" onClick={() => addPost(t)} disabled={adding !== null}>
                {adding === t ? 'Agregando...' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}

        <div style={styles.postsList} className="posts-list">
          {addError && <div style={styles.errBox}>⚠ {addError}</div>}
          {loading && <p style={styles.msg}>Cargando...</p>}
          {!loading && posts.length === 0 && <p style={styles.msg}>No hay contenido en este día.</p>}
          {posts.map(p => (
            <PostBlock key={p.id} post={p} onUpdate={handleUpdate} onDelete={handleDelete} readOnly={readOnly} />
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,26,46,.3)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' },
  panel: { background: '#fff', width: '100%', maxWidth: 520, height: '100vh', overflowY: 'auto', boxShadow: '-4px 0 32px rgba(108,99,255,.14)', display: 'flex', flexDirection: 'column' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.25rem 1rem', borderBottom: '1.5px solid #e4e3f7', position: 'sticky', top: 0, background: '#fff', zIndex: 1 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', textTransform: 'capitalize' },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f4f3ff', cursor: 'pointer', fontSize: 16, color: '#6b6b8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  addRow: { padding: '12px 1.25rem', background: '#fafafa', borderBottom: '1.5px solid #e4e3f7', display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  addLabel: { fontSize: 11, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em' },
  postsList: { padding: '1rem 1.25rem', flex: 1 },
  msg: { color: '#a0a0b8', fontSize: 13, textAlign: 'center', marginTop: 20 },
  errBox: { background: '#ffeaea', color: '#c62828', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 10 },
}
