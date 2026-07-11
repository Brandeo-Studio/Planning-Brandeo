import { useState, useRef } from 'react'

// items: [{ url, isVideo, alt? }]
export default function MediaCarousel({ items = [], maxHeight = 420, rounded = 10 }) {
  const [idx, setIdx] = useState(0)
  const touchX = useRef(null)

  if (!items.length) return null
  const i = Math.min(idx, items.length - 1)
  const current = items[i]
  const multi = items.length > 1

  function go(delta) {
    setIdx(v => (Math.min(v, items.length - 1) + delta + items.length) % items.length)
  }

  function onTouchStart(e) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  return (
    <div
      style={{ position: 'relative', marginTop: 8, borderRadius: rounded, overflow: 'hidden', background: current.isVideo ? '#1a1a2e' : '#f4f3ff' }}
      onTouchStart={multi ? onTouchStart : undefined}
      onTouchEnd={multi ? onTouchEnd : undefined}
    >
      {current.isVideo
        ? <video key={current.url} src={current.url} controls style={{ width: '100%', maxHeight, objectFit: 'contain', display: 'block', background: '#1a1a2e' }} />
        : <img key={current.url} src={current.url} alt={current.alt || ''} style={{ width: '100%', maxHeight, objectFit: 'contain', display: 'block' }} />
      }
      {multi && (
        <>
          <button type="button" onClick={() => go(-1)} style={arrowStyle('left')} aria-label="Anterior">←</button>
          <button type="button" onClick={() => go(1)} style={arrowStyle('right')} aria-label="Siguiente">→</button>
          <div style={counterStyle}>{i + 1}/{items.length}</div>
        </>
      )}
    </div>
  )
}

function arrowStyle(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    ...(side === 'left' ? { left: 6 } : { right: 6 }),
    width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.5)',
    border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
  }
}

const counterStyle = {
  position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.5)', color: '#fff',
  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
}
