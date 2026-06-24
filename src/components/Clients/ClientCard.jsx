import { useNavigate } from 'react-router-dom'

export default function ClientCard({ client, onDelete }) {
  const navigate = useNavigate()
  const initials = client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  function handleDelete(e) {
    e.stopPropagation()
    onDelete(client.id)
  }

  return (
    <div style={styles.card} onClick={() => navigate(`/planning/${client.id}`)} role="button">
      <div style={styles.avatar}>{initials}</div>
      <div style={styles.info}>
        <span style={styles.name}>{client.name}</span>
        <span style={styles.slug}>/{client.slug}</span>
      </div>
      <div style={styles.right}>
        <span style={styles.arrow}>›</span>
        {onDelete && (
          <button
            style={styles.deleteBtn}
            onClick={handleDelete}
            title="Eliminar cliente"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  card: { background: '#fff', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' },
  avatar: { width: 50, height: 50, borderRadius: 14, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, flexShrink: 0 },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  name: { fontWeight: 700, fontSize: 16 },
  slug: { fontSize: 13, color: '#888' },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  arrow: { fontSize: 24, color: '#ccc' },
  deleteBtn: { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', opacity: 0.5, padding: '4px 6px', borderRadius: 8, transition: 'opacity .15s, background .15s' },
}
