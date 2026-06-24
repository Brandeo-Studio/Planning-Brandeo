import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'
import ClientCard from './ClientCard'

export default function ClientList() {
  const { profile } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchClients() }, [profile])

  async function fetchClients() {
    setLoading(true)
    if (!profile) return
    if (profile.role === 'admin') {
      const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
      setClients(data || [])
    } else {
      const { data } = await supabase
        .from('client_cms')
        .select('clients(*)')
        .eq('cm_id', profile.id)
      setClients((data || []).map(r => r.clients).filter(Boolean))
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const slug = newSlug || newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    await supabase.from('clients').insert({ name: newName, slug })
    setNewName(''); setNewSlug(''); setShowForm(false); setSaving(false)
    fetchClients()
  }

  async function handleDeleteClient(clientId) {
    if (!confirm('¿Eliminar este cliente y todo su contenido? Esta acción no se puede deshacer.')) return
    setDeleting(clientId)

    const { data: plannings } = await supabase.from('plannings').select('id').eq('client_id', clientId)
    const planningIds = (plannings || []).map(p => p.id)

    if (planningIds.length > 0) {
      const { data: postsData } = await supabase.from('posts').select('id').in('planning_id', planningIds)
      const postIds = (postsData || []).map(p => p.id)

      if (postIds.length > 0) {
        await supabase.from('comments').delete().in('post_id', postIds)
        await supabase.from('posts').delete().in('planning_id', planningIds)
      }

      await supabase.from('special_dates').delete().in('planning_id', planningIds)
      await supabase.from('plannings').delete().eq('client_id', clientId)
    }

    await supabase.from('clients').delete().eq('id', clientId)
    setClients(prev => prev.filter(c => c.id !== clientId))
    setDeleting(null)
  }

  if (loading) return <div style={styles.center}>Cargando clientes...</div>

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Clientes</h1>
          <p style={styles.sub}>{clients.length} cliente{clients.length !== 1 ? 's' : ''} activo{clients.length !== 1 ? 's' : ''}</p>
        </div>
        {profile?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            + Nuevo cliente
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              placeholder="Nombre del cliente"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
            <input
              style={styles.input}
              placeholder="Slug (opcional)"
              value={newSlug}
              onChange={e => setNewSlug(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {deleting && (
        <div style={styles.deletingBanner}>Eliminando cliente y todo su contenido...</div>
      )}

      {clients.length === 0
        ? <div style={styles.empty}>No hay clientes asignados todavía.</div>
        : (
          <div style={styles.grid}>
            {clients.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                onDelete={profile?.role === 'admin' ? handleDeleteClient : null}
              />
            ))}
          </div>
        )
      }
    </div>
  )
}

const styles = {
  wrapper: { maxWidth: 900, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 700 },
  sub: { color: '#888', fontSize: 14, marginTop: 4 },
  form: { background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 20, marginBottom: 20 },
  formRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 160, padding: '10px 14px', borderRadius: 'var(--radius)', border: '1.5px solid var(--border)', fontSize: 14, outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#888' },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 16 },
  deletingBanner: { background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#f57f17', marginBottom: 16 },
}
