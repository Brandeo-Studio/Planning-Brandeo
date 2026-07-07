import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const MY_COMMENT_IDS_KEY = 'pb_my_comment_ids'

function getMyCommentIds() {
  try {
    const raw = localStorage.getItem(MY_COMMENT_IDS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addMyCommentId(id) {
  try {
    const ids = getMyCommentIds()
    localStorage.setItem(MY_COMMENT_IDS_KEY, JSON.stringify([...ids, id]))
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

export default function CommentBox({ postId, commentMode = 'admin' }) {
  const [comments, setComments] = useState([])
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [myCommentIds, setMyCommentIds] = useState([])

  useEffect(() => { if (postId) fetchComments() }, [postId])
  useEffect(() => { if (commentMode === 'client') setMyCommentIds(getMyCommentIds()) }, [commentMode])

  async function fetchComments() {
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at')
    setComments(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!author.trim() || !content.trim()) return
    setSaving(true)
    const { data } = await supabase.from('comments').insert({ post_id: postId, author_name: author, content }).select().single()
    if (data && commentMode === 'client') {
      addMyCommentId(data.id)
      setMyCommentIds(getMyCommentIds())
    }
    setContent('')
    setSaving(false)
    fetchComments()
  }

  async function handleDelete(id) {
    await supabase.from('comments').delete().eq('id', id)
    setComments(c => c.filter(x => x.id !== id))
  }

  function canDeleteComment(id) {
    if (commentMode === 'admin') return true
    if (commentMode === 'client') return myCommentIds.includes(id)
    return false
  }

  return (
    <div style={styles.wrap}>
      <h4 style={styles.title}>Comentarios</h4>
      {comments.length === 0 && <p style={styles.empty}>Sin comentarios aún.</p>}
      {comments.map(c => (
        <div key={c.id} style={styles.comment}>
          <div style={styles.cRow}>
            <span style={styles.cAuthor}>{c.author_name}</span>
            {canDeleteComment(c.id) && (
              <button style={styles.cDelete} onClick={() => handleDelete(c.id)} title="Borrar comentario">✕</button>
            )}
          </div>
          <span style={styles.cContent}>{c.content}</span>
          <span style={styles.cDate}>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
        </div>
      ))}
      {commentMode !== 'cm' && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} placeholder="Tu nombre" value={author} onChange={e => setAuthor(e.target.value)} required />
          <textarea style={styles.textarea} placeholder="Escribí tu comentario..." value={content} onChange={e => setContent(e.target.value)} rows={3} required />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving ? 'Enviando...' : 'Enviar comentario'}</button>
        </form>
      )}
    </div>
  )
}

const styles = {
  wrap: { marginTop: 16, padding: '14px 0 0', borderTop: '1px solid var(--border)' },
  title: { fontSize: 13, fontWeight: 700, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 },
  empty: { fontSize: 13, color: '#bbb', marginBottom: 10 },
  comment: { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 },
  cRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cAuthor: { fontSize: 12, fontWeight: 700, color: 'var(--primary)' },
  cDelete: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#aaa', padding: 0, lineHeight: 1, fontFamily: 'inherit' },
  cContent: { fontSize: 14, color: 'var(--text)' },
  cDate: { fontSize: 11, color: '#aaa' },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 },
  input: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none' },
  textarea: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', resize: 'vertical' },
}
