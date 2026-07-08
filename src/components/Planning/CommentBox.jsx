import { useState, useEffect, useRef } from 'react'
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

export default function CommentBox({ postId, commentMode = 'admin', onChange }) {
  const [comments, setComments] = useState([])
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [myCommentIds, setMyCommentIds] = useState([])
  const [showResolved, setShowResolved] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const menuRef = useRef()

  useEffect(() => { if (postId) fetchComments() }, [postId])
  useEffect(() => { if (commentMode === 'client') setMyCommentIds(getMyCommentIds()) }, [commentMode])

  useEffect(() => {
    if (!menuOpenId) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpenId])

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
    if (onChange) onChange()
  }

  async function handleDelete(id) {
    setMenuOpenId(null)
    await supabase.from('comments').delete().eq('id', id)
    setComments(c => c.filter(x => x.id !== id))
    if (onChange) onChange()
  }

  async function handleSetResolved(id, resolved) {
    setMenuOpenId(null)
    await supabase.from('comments').update({ resolved }).eq('id', id)
    setComments(c => c.map(x => x.id === id ? { ...x, resolved } : x))
    if (onChange) onChange()
  }

  function startEdit(c) {
    setMenuOpenId(null)
    setEditingId(c.id)
    setEditContent(c.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function saveEdit(id) {
    if (!editContent.trim()) return
    setSavingEdit(true)
    await supabase.from('comments').update({ content: editContent }).eq('id', id)
    setComments(c => c.map(x => x.id === id ? { ...x, content: editContent } : x))
    setSavingEdit(false)
    setEditingId(null)
    setEditContent('')
  }

  function isOwn(id) { return myCommentIds.includes(id) }

  function canResolve(c) {
    if (commentMode === 'admin') return true
    if (commentMode === 'cm') return true
    if (commentMode === 'client') return isOwn(c.id)
    return false
  }

  function canReopen(c) { return canResolve(c) }

  function canEditDelete(c) {
    if (commentMode === 'admin') return true
    if (commentMode === 'client') return isOwn(c.id)
    return false
  }

  function renderComment(c, { resolved }) {
    const editing = editingId === c.id
    const showMenu = canEditDelete(c) || (resolved && canReopen(c))

    return (
      <div key={c.id} style={styles.comment}>
        <div style={styles.cRow}>
          <span style={styles.cAuthor}>{c.author_name}</span>
          {!editing && (
            <div style={styles.cActions}>
              {!resolved && canResolve(c) && (
                <button style={styles.cResolve} onClick={() => handleSetResolved(c.id, true)} title="Marcar como resuelto">✓</button>
              )}
              {showMenu && (
                <div ref={menuOpenId === c.id ? menuRef : undefined} style={{ position: 'relative' }}>
                  <button style={styles.cMenuBtn} onClick={() => setMenuOpenId(v => v === c.id ? null : c.id)} title="Más opciones">⋮</button>
                  {menuOpenId === c.id && (
                    <div style={styles.dropdown}>
                      {canEditDelete(c) && (
                        <button className="drop-item" onClick={() => startEdit(c)}>Editar</button>
                      )}
                      {canEditDelete(c) && (
                        <button className="drop-item drop-item--danger" onClick={() => handleDelete(c.id)}>Borrar</button>
                      )}
                      {resolved && canReopen(c) && (
                        <button className="drop-item" onClick={() => handleSetResolved(c.id, false)}>Reabrir</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div style={styles.editWrap}>
            <textarea
              style={styles.textarea}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              autoFocus
            />
            <div style={styles.editActions}>
              <button className="btn-cancel-secondary" onClick={cancelEdit}>Cancelar</button>
              <button className="btn-save-primary" onClick={() => saveEdit(c.id)} disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <span style={styles.cContent}>{c.content}</span>
            <span style={styles.cDate}>{new Date(c.created_at).toLocaleDateString('es-AR')}</span>
          </>
        )}
      </div>
    )
  }

  const unresolved = comments.filter(c => !c.resolved)
  const resolved = comments.filter(c => c.resolved)

  return (
    <div style={styles.wrap}>
      <h4 style={styles.title}>Comentarios</h4>
      {unresolved.length === 0 && <p style={styles.empty}>Sin comentarios aún.</p>}
      {unresolved.map(c => renderComment(c, { resolved: false }))}

      {resolved.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button style={styles.resolvedToggle} onClick={() => setShowResolved(v => !v)}>
            {showResolved ? '▲' : '▼'} Ver comentarios resueltos ({resolved.length})
          </button>
          {showResolved && (
            <div style={{ marginTop: 8 }}>
              {resolved.map(c => renderComment(c, { resolved: true }))}
            </div>
          )}
        </div>
      )}

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
  cActions: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  cResolve: { background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#3a9e5f', padding: '1px 6px', lineHeight: 1.4, fontFamily: 'inherit' },
  cMenuBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#aaa', padding: '0 4px', lineHeight: 1, fontFamily: 'inherit' },
  cContent: { fontSize: 14, color: 'var(--text)' },
  cDate: { fontSize: 11, color: '#aaa' },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 },
  input: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none' },
  textarea: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', resize: 'vertical' },
  resolvedToggle: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--primary)', padding: '4px 0', fontFamily: 'inherit' },
  dropdown: { position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1.5px solid #e4e3f7', borderRadius: 10, boxShadow: '0 6px 24px rgba(108,99,255,.16)', zIndex: 20, minWidth: 120, overflow: 'hidden' },
  editWrap: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  editActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
}
