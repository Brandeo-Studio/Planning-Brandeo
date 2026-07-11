import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadToCloudinary, videoThumbUrl, frameOffsetOf } from '../../lib/cloudinary'
import { isVideoUrl, parseCarouselImages } from '../../lib/media'
import CommentBox from './CommentBox'
import MediaCarousel from './MediaCarousel'

const TYPE_LABELS = { historia: 'Historia', posteo: 'Posteo', reel: 'Reel', carrusel: 'Carrusel' }
const TYPE_BG = { historia: '#ebebff', posteo: '#e0faf3', reel: '#fff0ec', carrusel: '#f8eaff' }
const TYPE_TC = { historia: '#6c63ff', posteo: '#1a9e7a', reel: '#d84315', carrusel: '#7b1fa2' }

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PostBlock({ post, onUpdate, onDelete, readOnly = false, commentMode = 'admin', hasComments = false, onCommentsChange }) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    ...post,
    ref_images: post.ref_images || [],
    ref_links: post.ref_links || [],
    notes: post.notes || '',
    delivery_link: post.delivery_link || '',
    main_images: post.type === 'carrusel' ? parseCarouselImages(post.image_url) : [],
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [moveDate, setMoveDate] = useState('')

  const initialFrameOffset = frameOffsetOf(post.image_url)
  const [coverMode, setCoverMode] = useState(
    !post.image_url ? 'auto' : (initialFrameOffset !== null ? 'frame' : 'upload')
  )
  const [sliderValue, setSliderValue] = useState(initialFrameOffset ?? 0)
  const [videoDuration, setVideoDuration] = useState(0)

  const mainImgRef = useRef()
  const mainImagesRef = useRef()
  const refImgRef = useRef()
  const videoRef = useRef()
  const menuRef = useRef()
  const frameVideoRef = useRef()
  const frameCanvasRef = useRef()

  function drawFrameToCanvas() {
    const video = frameVideoRef.current
    const canvas = frameCanvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  }

  function seekFramePicker(seconds) {
    if (frameVideoRef.current) frameVideoRef.current.currentTime = seconds
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  const isReel = post.type === 'reel'
  const isHistoria = post.type === 'historia'
  const mainImageLabel = isReel ? 'Portada para el feed' : 'Diseño final'

  async function uploadFile(file, path) {
    await supabase.storage.from('planning-media').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('planning-media').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleMainImage(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading('main')
    setUploadError('')
    try {
      const ext = file.name.split('.').pop()
      const url = await uploadFile(file, `posts/${post.id}/main.${ext}`)
      setForm(f => ({ ...f, image_url: url }))
    } catch (err) {
      setUploadError('No se pudo subir la imagen. Probá de nuevo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRefImages(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading('ref')
    setUploadError('')
    try {
      const urls = await Promise.all(files.map((f, i) => {
        const ext = f.name.split('.').pop()
        return uploadFile(f, `posts/${post.id}/ref/${Date.now()}-${i}.${ext}`)
      }))
      setForm(f => ({ ...f, ref_images: [...(f.ref_images || []), ...urls] }))
    } catch (err) {
      setUploadError('No se pudieron subir las imágenes de referencia. Probá de nuevo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleCarouselMainImages(e) {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading('main')
    setUploadError('')
    try {
      const urls = await Promise.all(files.map(f => uploadToCloudinary(f)))
      setForm(f => ({ ...f, main_images: [...(f.main_images || []), ...urls] }))
    } catch (err) {
      setUploadError('No se pudieron subir los slides. Probá de nuevo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading('video')
    setUploadError('')
    try {
      const url = await uploadToCloudinary(file)
      setForm(f => ({ ...f, video_url: url }))
      setVideoDuration(0)
      setSliderValue(0)
    } catch (err) {
      setUploadError('No se pudo subir el video. Probá de nuevo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    const { data } = await supabase.from('posts').update({
      title: form.title,
      copy: form.copy,
      image_url: post.type === 'carrusel'
        ? (form.main_images.length ? JSON.stringify(form.main_images) : null)
        : form.image_url || null,
      video_url: form.video_url || null,
      notes: form.notes || null,
      ref_images: form.ref_images,
      ref_links: form.ref_links,
      delivery_link: form.delivery_link || null,
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

  async function handleMove() {
    if (!moveDate) return
    await supabase.from('posts').update({ date: moveDate }).eq('id', post.id)
    setMenuOpen(false)
    setShowDatePicker(false)
    if (onDelete) onDelete(post.id)
  }

  function addRefLink() { setForm(f => ({ ...f, ref_links: [...f.ref_links, ''] })) }
  function updateRefLink(i, val) { setForm(f => ({ ...f, ref_links: f.ref_links.map((l, j) => j === i ? val : l) })) }
  function removeRefLink(i) { setForm(f => ({ ...f, ref_links: f.ref_links.filter((_, j) => j !== i) })) }

  return (
    <div style={hasComments ? { ...bs.card, background: '#fffde7', border: '1.5px solid #f0c040' } : bs.card}>
      {/* Header */}
      <div style={bs.head} onClick={() => setExpanded(v => !v)}>
        <span style={{ ...bs.badge, background: TYPE_BG[post.type], color: TYPE_TC[post.type] }}>
          {TYPE_LABELS[post.type]}
        </span>
        {hasComments && <span style={bs.commentDot} title="Comentarios sin resolver" />}
        {post.title && post.title !== 'Sin título' && (
          <span style={bs.headTitle}>{post.title}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#c0c0d8' }}>{expanded ? '▲' : '▼'}</span>
          {!readOnly && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="block-menu-btn"
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); setShowDatePicker(false) }}
              >⋯</button>
              {menuOpen && (
                <div style={bs.dropdown}>
                  {!showDatePicker ? (
                    <>
                      <button className="drop-item" onClick={e => { e.stopPropagation(); setShowDatePicker(true) }}>Mover a...</button>
                      <button className="drop-item drop-item--danger" onClick={e => { e.stopPropagation(); setMenuOpen(false); handleDelete() }}>Eliminar</button>
                    </>
                  ) : (
                    <div style={bs.datePicker} onClick={e => e.stopPropagation()}>
                      <div style={bs.dateLabel}>Mover a</div>
                      <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={bs.dateInput} />
                      <div style={bs.dateActions}>
                        <button style={bs.cancelBtn} onClick={() => setShowDatePicker(false)}>Cancelar</button>
                        <button style={bs.confirmBtn} onClick={handleMove} disabled={!moveDate}>Mover</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div>
          {readOnly ? (
            /* Read-only */
            <div style={{ paddingTop: 4 }}>
              <MediaCarousel items={
                post.type === 'carrusel'
                  ? parseCarouselImages(post.image_url).map(url => ({ url, isVideo: isVideoUrl(url) }))
                  : (post.image_url ? [{ url: post.image_url, isVideo: false }] : [])
              } />
              {(isReel || isHistoria) && post.video_url && (
                <video src={post.video_url} controls style={{ ...bs.videoPrev, marginTop: 8 }} />
              )}
              {post.delivery_link && (
                <>
                  <div style={bs.fieldLbl}>Link de entrega</div>
                  <a href={post.delivery_link} target="_blank" rel="noopener noreferrer" style={bs.linkItem}>{post.delivery_link}</a>
                </>
              )}
              {(post.ref_images || []).length > 0 && (
                <>
                  <div style={bs.fieldLbl}>Imágenes de referencia</div>
                  <MediaCarousel items={post.ref_images.map(url => ({ url, isVideo: false }))} />
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
              {post.copy && (
                <>
                  <div style={bs.fieldLbl}>Copy</div>
                  <p style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 4 }}>{post.copy}</p>
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

              {/* 1. Tema */}
              <label style={bs.fieldLbl}>Tema / descripción</label>
              <input
                className="field-input"
                value={form.title || ''}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Lanzamiento producto nuevo"
              />

              {/* 2. Diseño final / Portada para el feed */}
              <label style={bs.fieldLbl}>
                {post.type === 'carrusel' ? 'Diseño final (slides)' : mainImageLabel}
                {uploading === 'main' && <span style={bs.upTag}> Subiendo...</span>}
              </label>
              {post.type === 'carrusel' ? (
                <>
                  {form.main_images.length > 0 && (
                    <div style={bs.refGrid}>
                      {form.main_images.map((url, i) => (
                        <div key={i} style={bs.refThumbWrap}>
                          {isVideoUrl(url)
                            ? <video src={url} style={bs.refThumb} muted />
                            : <img src={url} style={bs.refThumb} alt={`slide ${i + 1}`} />
                          }
                          {isVideoUrl(url) && <span style={bs.videoBadge}>▶</span>}
                          <button style={bs.refRm} onClick={() => setForm(f => ({ ...f, main_images: f.main_images.filter((_, j) => j !== i) }))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="car-add" onClick={() => mainImagesRef.current?.click()}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🖼</div>
                    <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>
                      {form.main_images.length ? 'Agregar más slides (imagen o video)' : 'Agregar imágenes o videos del carrusel'}
                    </div>
                    <input ref={mainImagesRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleCarouselMainImages} disabled={!!uploading} />
                  </div>
                </>
              ) : isReel ? (
                <>
                  <div style={bs.coverTabs}>
                    <button
                      type="button"
                      style={coverMode === 'auto' ? bs.coverTabActive : bs.coverTab}
                      onClick={() => { setCoverMode('auto'); setForm(f => ({ ...f, image_url: '' })) }}
                    >Automática</button>
                    <button
                      type="button"
                      style={coverMode === 'frame' ? bs.coverTabActive : bs.coverTab}
                      onClick={() => setCoverMode('frame')}
                      disabled={!form.video_url}
                    >Elegir frame</button>
                    <button
                      type="button"
                      style={coverMode === 'upload' ? bs.coverTabActive : bs.coverTab}
                      onClick={() => setCoverMode('upload')}
                    >Subir imagen</button>
                  </div>

                  {coverMode === 'auto' && (
                    form.video_url ? (
                      <div className="img-area" style={{ cursor: 'default' }}>
                        <img src={videoThumbUrl(form.video_url)} style={bs.imgPrev} alt="portada automática" />
                        <div style={{ fontSize: 11, color: '#a0a0b8', marginTop: 6 }}>Se usará el primer frame del video</div>
                      </div>
                    ) : (
                      <div style={bs.coverHint}>Subí un video para ver la portada automática</div>
                    )
                  )}

                  {coverMode === 'frame' && (
                    form.video_url ? (
                      <>
                        <video
                          ref={frameVideoRef}
                          src={form.video_url}
                          crossOrigin="anonymous"
                          preload="auto"
                          muted
                          playsInline
                          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                          onLoadedMetadata={e => { setVideoDuration(e.currentTarget.duration); seekFramePicker(sliderValue) }}
                          onLoadedData={drawFrameToCanvas}
                          onSeeked={drawFrameToCanvas}
                        />
                        <canvas ref={frameCanvasRef} style={bs.imgPrev} />
                        <input
                          type="range"
                          min={0}
                          max={videoDuration || 0}
                          step={0.1}
                          value={Math.min(sliderValue, videoDuration || 0)}
                          onChange={e => {
                            const t = parseFloat(e.target.value)
                            setSliderValue(t)
                            seekFramePicker(t)
                          }}
                          disabled={!videoDuration}
                          style={{ width: '100%', marginTop: 8 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: '#a0a0b8' }}>
                            {videoDuration ? `${formatTime(sliderValue)} / ${formatTime(videoDuration)}` : 'Cargando video...'}
                          </span>
                          <button
                            type="button"
                            style={bs.confirmFrameBtn}
                            disabled={!videoDuration}
                            onClick={() => setForm(f => ({ ...f, image_url: videoThumbUrl(form.video_url, sliderValue) }))}
                          >Usar este frame</button>
                        </div>
                        {form.image_url === videoThumbUrl(form.video_url, sliderValue) && (
                          <div style={{ fontSize: 11, color: '#1a9e7a', fontWeight: 600, marginTop: 4 }}>✓ Portada confirmada</div>
                        )}
                      </>
                    ) : (
                      <div style={bs.coverHint}>Subí un video primero para poder elegir un frame</div>
                    )
                  )}

                  {coverMode === 'upload' && (
                    <>
                      <div className="img-area" onClick={() => mainImgRef.current?.click()}>
                        {form.image_url && frameOffsetOf(form.image_url) === null ? (
                          <>
                            <img src={form.image_url} style={bs.imgPrev} alt="preview" />
                            <div style={{ fontSize: 11, color: '#a0a0b8', marginTop: 6 }}>Tocá para cambiar</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>
                            <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>Tocá para subir una portada</div>
                          </>
                        )}
                        <input ref={mainImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMainImage} disabled={!!uploading} />
                      </div>
                      {form.image_url && frameOffsetOf(form.image_url) === null && (
                        <button style={bs.removeImgBtn} onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                          ✕ Quitar portada
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
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
                    <input ref={mainImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMainImage} disabled={!!uploading} />
                  </div>
                  {form.image_url && (
                    <button style={bs.removeImgBtn} onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                      ✕ Quitar imagen
                    </button>
                  )}
                </>
              )}

              {/* 2b. Video (Reel / Historia) */}
              {(isReel || isHistoria) && (
                <>
                  <label style={bs.fieldLbl}>
                    Video
                    {uploading === 'video' && <span style={bs.upTag}> Subiendo...</span>}
                  </label>
                  {form.video_url && (
                    <video src={form.video_url} controls style={bs.videoPrev} />
                  )}
                  <div className="car-add" onClick={() => videoRef.current?.click()}>
                    <div style={{ fontSize: 16, marginBottom: 3 }}>🎬</div>
                    <div style={{ fontSize: 12, color: '#a0a0b8', fontWeight: 500 }}>
                      {form.video_url ? 'Reemplazar video' : 'Subir video'}
                    </div>
                    <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} disabled={!!uploading} />
                  </div>
                  {form.video_url && (
                    <button
                      style={bs.removeImgBtn}
                      onClick={() => {
                        const wasFrame = frameOffsetOf(form.image_url) !== null
                        setForm(f => ({ ...f, video_url: '', image_url: wasFrame ? '' : f.image_url }))
                        if (wasFrame) setCoverMode('auto')
                        setVideoDuration(0)
                        setSliderValue(0)
                      }}
                    >
                      ✕ Quitar video
                    </button>
                  )}
                </>
              )}

              {/* 3. Link de entrega */}
              <label style={bs.fieldLbl}>Link de entrega</label>
              <input
                className="field-input"
                type="url"
                value={form.delivery_link || ''}
                onChange={e => setForm(f => ({ ...f, delivery_link: e.target.value }))}
                placeholder="https://drive.google.com/..."
              />

              {/* 4. Imágenes de referencia */}
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
                <input ref={refImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleRefImages} disabled={!!uploading} />
              </div>

              {/* 5. Links de referencia */}
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

              {/* 6. Copy */}
              <label style={bs.fieldLbl}>Copy</label>
              <textarea
                className="field-textarea"
                value={form.copy || ''}
                onChange={e => setForm(f => ({ ...f, copy: e.target.value }))}
                placeholder="Texto del posteo..."
              />

              {/* 7. Notas internas */}
              <label style={bs.fieldLbl}>Notas internas</label>
              <input
                className="field-input"
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Solo para el equipo..."
              />

              {/* 8. Save row */}
              {uploadError && <div style={bs.uploadErr}>{uploadError}</div>}
              <div style={bs.saveRow}>
                <button className="btn-cancel-secondary" onClick={() => setExpanded(false)}>Cerrar</button>
                <button className="btn-save-primary" onClick={handleSave} disabled={saving || !!uploading}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* 9. Comments */}
          <CommentBox postId={post.id} commentMode={commentMode} onChange={onCommentsChange} />
        </div>
      )}
    </div>
  )
}

const bs = {
  card: { border: '1.5px solid #e4e3f7', borderRadius: 14, padding: '1rem', marginBottom: 10, background: '#fff' },
  head: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' },
  badge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 },
  commentDot: { width: 8, height: 8, borderRadius: '50%', background: '#f0c040', flexShrink: 0 },
  headTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 },
  fieldLbl: { fontSize: 11, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4, marginTop: 10, display: 'block' },
  upTag: { color: '#6c63ff', fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
  imgPrev: { width: '100%', borderRadius: 8, display: 'block', objectFit: 'contain', background: '#f4f3ff', marginTop: 8 },
  coverTabs: { display: 'flex', gap: 6, marginTop: 6 },
  coverTab: { flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e4e3f7', background: '#fff', fontSize: 11, fontWeight: 600, color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit' },
  coverTabActive: { flex: 1, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #6c63ff', background: '#6c63ff', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  coverHint: { fontSize: 12, color: '#a0a0b8', padding: '10px 0' },
  confirmFrameBtn: { padding: '5px 11px', borderRadius: 7, border: 'none', background: '#6c63ff', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  videoPrev: { width: '100%', maxHeight: 320, borderRadius: 8, display: 'block', objectFit: 'contain', background: '#1a1a2e', marginTop: 8 },
  videoBadge: { position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 9, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, paddingLeft: 1 },
  removeImgBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#a0a0b8', marginTop: 4, padding: 0, fontFamily: 'inherit' },
  refGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  refThumbWrap: { position: 'relative', width: 64, height: 80, borderRadius: 8, overflow: 'hidden' },
  refThumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  refRm: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 },
  saveRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1.5px solid #e4e3f7' },
  uploadErr: { fontSize: 12, color: '#d84315', fontWeight: 600, marginTop: '1rem' },
  linkRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  linkRm: { flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f4f3ff', color: '#a0a0b8', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' },
  addLinkBtn: { marginTop: 8, padding: '6px 14px', borderRadius: 8, border: '1.5px dashed #c0c0d8', background: 'none', fontSize: 12, fontWeight: 600, color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit' },
  linkItem: { display: 'block', fontSize: 12, color: '#6c63ff', marginTop: 4, wordBreak: 'break-all', textDecoration: 'none' },
  dropdown: { position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1.5px solid #e4e3f7', borderRadius: 10, boxShadow: '0 6px 24px rgba(108,99,255,.16)', zIndex: 20, minWidth: 148, overflow: 'hidden' },
  datePicker: { padding: '10px 12px' },
  dateLabel: { fontSize: 11, fontWeight: 600, color: '#a0a0b8', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 },
  dateInput: { width: '100%', padding: '6px 8px', borderRadius: 7, border: '1.5px solid #e4e3f7', fontSize: 13, fontFamily: 'inherit', color: '#1a1a2e', boxSizing: 'border-box' },
  dateActions: { display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  cancelBtn: { padding: '5px 11px', borderRadius: 7, border: '1.5px solid #e4e3f7', background: 'none', fontSize: 12, color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit' },
  confirmBtn: { padding: '5px 11px', borderRadius: 7, border: 'none', background: '#6c63ff', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}
