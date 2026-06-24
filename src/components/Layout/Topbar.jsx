import { useAuth } from '../../App'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title, subtitle, children }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.logoRow} onClick={() => navigate('/')} role="button">
          <div style={styles.logoIcon}>B</div>
          <span style={styles.logoText}>Planning Brandeo</span>
        </div>
        {title && (
          <>
            <span style={styles.sep}>/</span>
            <span style={styles.pageTitle}>{title}</span>
            {subtitle && <span className="badge" style={{ marginLeft: 8 }}>{subtitle}</span>}
          </>
        )}
      </div>
      <div style={styles.right}>
        {children}
        {profile && <span style={styles.profileChip}>{profile.name || profile.role}</span>}
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Salir</button>
      </div>
    </header>
  )
}

const styles = {
  bar: { background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoIcon: { width: 34, height: 34, borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 },
  logoText: { fontWeight: 700, fontSize: 15, color: 'var(--text)' },
  sep: { color: '#bbb', fontSize: 18, marginLeft: 4 },
  pageTitle: { fontWeight: 600, fontSize: 15, color: 'var(--text)' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  profileChip: { fontSize: 13, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: 20 },
}
