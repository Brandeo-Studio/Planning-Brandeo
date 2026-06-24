import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import CommentBox from './CommentBox'

const TYPE_LABELS = { historia: 'Historia', posteo: 'Posteo', reel: 'Reel', carrusel: 'Carrusel' }
const TYPE_BG = { historia: '#ebebff', posteo: '#e0faf3', reel: '#fff0ec', carrusel: '#f8eaff' }
const TYPE_TC = { historia: '#6c63ff', posteo: '#1a9e7a', reel: '#d84315', carrusel: '#7b1fa2' }


function CarouselNav({ images }) {
  const [idx, setIdx] = useState(0)
  if (!images || !images.length) return null
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginTop: 8, background: '#e4e3f7' }}>
      <div style={{ display: 'flex', transition: 'transform .3s', transform: `translateX(-${idx * 100}%)` }}>
        {images.map((src, i) => (
          <div key={i} style={{ flexShrink: 0, width: '100%' }}>
            <img src={src} style={{ width: '100%', objectFit: 'contain', display: 'block', maxHeight: 400, background: '#1a1a2e' }} alt={`Imagen ${i + 1}`} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
            style={navBtn('left')}>‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
            style={navBtn('right')}>›</button>
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
            {idx + 1}/{images.length}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '6px 0', background: '#f4f3ff' }}>
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#6c63ff' : '#e4e3f7', border: 'none', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function navBtn(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side === 'left' ? 'left' : 'right']: 6,
    width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.5)',
    border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
  }
}

export default function PostBlock({ post, onUpdate, onDelete, readOnly = false }) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    ...post,
    ref_images: post.ref_images || [],
    carousel_images: post.carousel_images || [],
    notes: post.notes || '',
    video_url: post.video_url || '',
    video_urls: post.video_urls || (post.video_url ? [post.video_url] : []),
    ref_links: post.ref_links || [],
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  const mainImgRef = useRef()
  const carImgRef = useRef()
  const refImgRef = useRef()
  const carRefImgRef = useRef()

  const isCarrusel = post.type === 'carrusel'
  const isHistoria = post.type === 'historia'
  const isReel = post.type === 'reel'

  async function uploadFile(file, path) {
    await supabase.storage.from('planning-media').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('planning-media').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleMainImage(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading('main')
    const ext = file.name.split('.').pop()
    const url = await uploadFile(file, `posts/${post.id}/main.${ext}`)
    setForm(f => ({ ...f, image_url: url }))
    setUploading('')
    e.target.value = ''
  }

  async function handleCarouselImages(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading('carousel')
    const urls = await Promise.all(files.map((f, i) => {
      const ext = f.name.split('.').pop()
      return uploadFile(f, `posts/${post.id}/carousel/${Date.now()}-${i}.${ext}`)
    }))
    setForm(f => ({ ...f, carousel_images: [...(f.carousel_images || []), ...urls] }))
    setUploading('')
    e.target.value = ''
  }

  async function handleRefImages(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading('ref')
    const urls = await Promise.all(files.map((f, i) => {
      const ext = f.name.split('.').pop()
      return uploadFile(f, `posts/${post.id}/ref/${Date.now()}-${i}.${ext}`)
    }))
    setForm(f => ({ ...f, ref_images: [...(f.ref_images || []), ...urls] }))
    setUploading('')
    e.target.value = ''
  }

  async function handleCarRefImages(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading('carref')
    const urls = await Promise.all(files.map((f, i) => {
      const ext = f.name.split('.').pop()
      return uploadFile(f, `posts/${post.id}/ref/${Date.now()}-${i}.${ext}`)
    }))
    setForm(f => ({ ...f, ref_images: [...(f.ref_images || []), ...urls] }))
    setUploading('')
    e.target.value = ''
  }

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase.from('posts').update({
      title: form.title,
      copy: form.copy,
      image_url: form.image_url || null,
      video_url: isHistoria ? (form.video_urls[0] || null) : (form.video_url || null),
      notes: form.notes || null,
      ref_images: form.ref_images,
      carousel_images: form.carousel_images,
      video_urls: form.video_urls,
      ref_links: form.ref_links,
    }).eq('id', post.id).select().single()
    setSaving(false)
    if (onUpdate && data) onUpdate(data)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este contenido?')) return
    await supabase.from('comments').delete().eq('post_id', post.id)
    await supabase.from('posts').delete().eq('id', post.id)
    if (onDelete) onDelete(post.id)
  }

  function addRefLink() { setForm(f => ({ ...f, ref_links: [...f.ref_links, ''] })) }
  function updateRefLink(i, val) { setForm(f => ({ ...f, ref_links: f.ref_links.map((l, j) => j === i ? val : l) })) }
  function removeRefLink(i) { setForm(f => ({ ...f, ref_links: f.ref_links.filter((_, j) => j !== i) })) }

  function addVideoUrl() { setForm(f => ({ ...f, video_urls: [...f.video_urls, ''] })) }
  function updateVideoUrl(i, val) { setForm(f => ({ ...f, video_urls: f.video_urls.map((v, j) => j === i ? val : v) })) }
  function removeVideoUrl(i) { setForm(f => ({ ...f, video_urls: f.video_urls.filter((_, j) => j !== i) })) }

  return (
    <div style={bs.card}>
      {/* Header */}
      <div style={bs.head} onClick={() => setExpanded(v => !v)}>
        <span style={{ ...bs.badge, background: TYPE_BG[post.type], color: TYPE_TC[post.type] }}>
          {TYPE_LABELS[post.type]}
        </span>
        {post.title && post.title !== 'Sin título' && (
          <span style={bs.headTitle}>{post.title}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#c0c0d8' }}>{expanded ? '▲' : '▼'}</span>
          {!readOnly && (
            <button className="block-del-btn" onClick={e => { e.stopPropagation(); handleDelete() }}>✕</button>
          )}
        </div>
      </div>

      {expanded && (
        <div>
          {readOnly ? (
            /* Read-only */
            <div style={{ paddingTop: 4 }}>
              {post.image_url && (
                <img src={post.image_url} style={{ ...bs.imgPrev, marginTop: 8 }} alt="" />
              )}
              {(post.carousel_images || []).length > 0 && (
                <CarouselNav images={post.carousel_images} />
              )}
              {post.copy && (
                <>
                  <div style={bs.fieldLbl}>Copy</div>
                  <p style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 4 }}>{post.copy}</p>
                </>
              )}
              {(post.video_urls || []).filter(Boolean).length > 0 && (
                <>
                  <div style={bs.fieldLbl}>Videos</div>
                  {(post.video_urls || []).filter(Boolean).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={bs.linkItem}>{url}</a>
                  ))}
                </>
              )}
              {(post.ref_links || []).filter(Boolean).length > 0 && (
                <>
                  <div style={bs.fieldLbl}>Links de referencia</div>
                  {(post.ref_links || []).filter(Boolean).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={bs.linkItem}>{url}</a>
                  ))}
                </>
              )}
              {post.notes && (
                <>
                  <div style={bs.fieldLbl}>Notas internas</div>
                  <p style={{ fontSize: 12, color: '#6b6b8a', lineHeight: 1.5, marginTop: 4 }}>{post.notes}</p>
                </>
              )}
            </div>
          ) : (
            /* Edit form */
            <div style={{ borderTop: '1.5px solid #f0efff', paddingTop: 4 }}>

              {/* Tema */}
              <label style={bs.fieldLbl}>Tema / descripción</label>
              <input
                className="field-input"
                value={form.title || ''}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Lanzamiento producto nuevo"
              />

              {/* Carrusel: slides + ref images */}
              {isCarrusel && (
                <>
                  <label style={bs.fieldLbl}>
                    Imágenes del carrusel
                    {uploading === 'carousel' && <span style={bs.upTag}> Subiendo...</span>}
                  </label>
                  {form.carousel_images.length > 0 && (
                    <div style={bs.carList}>
                      {form.carousel_images.map((url, i) => (
                        <div key={i} style={bs.carItem}>
                          <img src={url} style={bs.carThumb} alt={`slide ${i + 1}`} />
                          <span style={bs.carLbl}>Imagen {i + 1}</span>
                          <button style={bs.carRm} onClick={() => setForm(f => ({ ...f, carousel_images: f.carousel_images.filter((_, j) => j !== i) }))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {form.carousel_images.length > 0 && (
                    <CarouselNav images={form.carousel_images} />
                  )}
                  <div className="car-add" onClick={() => carImgRef.current?.click()}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>🖼</div>
                    <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>
                      {form.carousel_images.length ? 'Agregar más imágenes' : 'Agregar imágenes al carrusel'}
                    </div>
                    <input ref={carImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleCarouselImages} disabled={uploading !== ''} />
                  </div>

                  {/* Ref images for Carrusel */}
                  <label style={bs.fieldLbl}>
                    Imágenes de referencia
                    {uploading === 'carref' && <span style={bs.upTag}> Subiendo...</span>}
                  </label>
                  {form.ref_images.length > 0 && (
                    <div style={bs.refGrid}>
                      {form.ref_images.map((url, i) => (
                        <div key={i} style={bs.refThumbWrap}>
                          <img src={url} style={bs.refThumb} alt={`ref ${i + 1}`} />
                          <button style={bs.refRm} onClick={() => setForm(f => ({ ...f, ref_images: f.ref_images.filter((_, j) => j !== i) }))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="car-add" onClick={() => carRefImgRef.current?.click()}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🖼</div>
                    <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>
                      {form.ref_images.length ? 'Agregar más referencias' : 'Agregar imágenes de referencia'}
                    </div>
                    <input ref={carRefImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleCarRefImages} disabled={uploading !== ''} />
                  </div>
                </>
              )}

              {/* Main image (Posteo / Historia / Reel) */}
              {!isCarrusel && (
                <>
                  <label style={bs.fieldLbl}>
                    {isHistoria ? 'Imagen de la historia' : isReel ? 'Portada' : 'Diseño final'}
                    {uploading === 'main' && <span style={bs.upTag}> Subiendo...</span>}
                  </label>
                  <div className="img-area" onClick={() => mainImgRef.current?.click()}>
                    {form.image_url ? (
                      <>
                        <img src={form.image_url} style={bs.imgPrev} alt="preview" />
                        <div style={{ fontSize: 11, color: '#a0a0b8', marginTop: 6 }}>Tocá para cambiar</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
                        <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>Tocá para subir imagen</div>
                      </>
                    )}
                    <input ref={mainImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMainImage} disabled={uploading !== ''} />
                  </div>
                  {form.image_url && (
                    <button style={bs.removeImgBtn} onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                      ✕ Quitar imagen
                    </button>
                  )}

                  {/* Reference images (Posteo / Historia / Reel) */}
                  <label style={bs.fieldLbl}>
                    Imágenes de referencia
                    {uploading === 'ref' && <span style={bs.upTag}> Subiendo...</span>}
                  </label>
                  {form.ref_images.length > 0 && (
                    <div style={bs.refGrid}>
                      {form.ref_images.map((url, i) => (
                        <div key={i} style={bs.refThumbWrap}>
                          <img src={url} style={bs.refThumb} alt={`ref ${i + 1}`} />
                          <button style={bs.refRm} onClick={() => setForm(f => ({ ...f, ref_images: f.ref_images.filter((_, j) => j !== i) }))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="car-add" onClick={() => refImgRef.current?.click()}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🖼</div>
                    <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>
                      {form.ref_images.length ? 'Agregar más referencias' : 'Agregar imágenes de referencia'}
                    </div>
                    <input ref={refImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleRefImages} disabled={uploading !== ''} />
                  </div>
                </>
              )}

              {/* Video — Reel: single URL */}
              {isReel && (
                <>
                  <label style={bs.fieldLbl}>Video (YouTube o Google Drive)</label>
                  <input
                    className="field-input"
                    type="url"
                    value={form.video_url || ''}
                    onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <div style={bs.vidHint}>Pegá el link de YouTube o Google Drive.</div>
                </>
              )}

              {/* Video — Historia: multiple URLs */}
              {isHistoria && (
                <>
                  <label style={bs.fieldLbl}>Videos (YouTube o Google Drive)</label>
                  {form.video_urls.map((url, i) => (
                    <div key={i} style={bs.linkRow}>
                      <input
                        className="field-input"
                        type="url"
                        value={url}
                        onChange={e => updateVideoUrl(i, e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        style={{ flex: 1, marginTop: 0 }}
                      />
                      <button style={bs.linkRm} onClick={() => removeVideoUrl(i)}>✕</button>
                    </div>
                  ))}
                  <button style={bs.addLinkBtn} onClick={addVideoUrl}>+ Agregar otro video</button>
                  <div style={bs.vidHint}>Pegá links de YouTube o Google Drive.</div>
                </>
              )}

              {/* Copy */}
              <label style={bs.fieldLbl}>Copy</label>
              <textarea
                className="field-textarea"
                value={form.copy || ''}
                onChange={e => setForm(f => ({ ...f, copy: e.target.value }))}
                placeholder="Texto del posteo..."
              />

              {/* Notas internas */}
              <label style={bs.fieldLbl}>Notas internas</label>
              <input
                className="field-input"
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Solo para el equipo..."
              />

              {/* Links de referencia — all types */}
              <label style={bs.fieldLbl}>Links de referencia</label>
              {form.ref_links.map((url, i) => (
                <div key={i} style={bs.linkRow}>
                  <input
                    className="field-input"
                    type="url"
                    value={url}
                    onChange={e => updateRefLink(i, e.target.value)}
                    placeholder="https://..."
                    style={{ flex: 1, marginTop: 0 }}
                  />
                  <button style={bs.linkRm} onClick={() => removeRefLink(i)}>✕</button>
                </div>
              ))}
              <button style={bs.addLinkBtn} onClick={addRefLink}>+ Agregar link</button>

              {/* Save row */}
              <div style={bs.saveRow}>
                <button className="btn-cancel-secondary" onClick={() => setExpanded(false)}>Cerrar</button>
                <button className="btn-save-primary" onClick={handleSave} disabled={saving || uploading !== ''}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          <CommentBox postId={post.id} readOnly={false} />
        </div>
      )}
    </div>
  )
}

const bs = {
  card: { border: '1.5px solid #e4e3f7', borderRadius: 14, padding: '1rem', marginBottom: 10, background: '#fff' },
  head: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
  badge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 },
  headTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 },
  fieldLbl: { fontSize: 11, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, marginTop: 10, display: 'block' },
  upTag: { color: '#6c63ff', fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
  imgPrev: { width: '100%', borderRadius: 8, display: 'block', objectFit: 'contain', background: '#f4f3ff', marginTop: 8 },
  removeImgBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#a0a0b8', marginTop: 4, padding: 0, fontFamily: 'inherit' },
  carList: { display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 },
  carItem: { display: 'flex', alignItems: 'center', gap: 8, background: '#f4f3ff', borderRadius: 8, padding: '5px 8px' },
  carThumb: { width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  carLbl: { fontSize: 11, color: '#6b6b8a', flex: 1 },
  carRm: { background: 'none', border: 'none', cursor: 'pointer', color: '#a0a0b8', fontSize: 16, flexShrink: 0, padding: 0, lineHeight: 1, fontFamily: 'inherit' },
  refGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  refThumbWrap: { position: 'relative', width: 64, height: 80, borderRadius: 8, overflow: 'hidden' },
  refThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  refRm: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 },
  vidHint: { fontSize: 11, color: '#a0a0b8', marginTop: 4, lineHeight: 1.5 },
  saveRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1.5px solid #e4e3f7' },
  linkRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  linkRm: { flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f4f3ff', color: '#a0a0b8', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  addLinkBtn: { marginTop: 8, padding: '6px 14px', borderRadius: 8, border: '1.5px dashed #c0c0d8', background: 'none', fontSize: 12, fontWeight: 600, color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit' },
  linkItem: { display: 'block', fontSize: 12, color: '#6c63ff', marginTop: 4, wordBreak: 'break-all', textDecoration: 'none' },
}
