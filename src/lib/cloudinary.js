const CLOUD_NAME = 'cziaqmbr'
const UPLOAD_PRESET = 'planning_brandeo'

export async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Error al subir el archivo a Cloudinary')
  const data = await res.json()
  return data.secure_url
}

// Cloudinary generates a JPG frame of a video when you request the same
// delivery URL with the extension swapped to .jpg. so_<seconds> pins it to
// that exact offset — without it Cloudinary can pick an arbitrary frame.
export function videoThumbUrl(url, seconds = 0) {
  if (!url) return null
  const [base, query] = url.split('?')
  const thumb = base.replace(/\.[^./]+$/, '.jpg').replace('/upload/', `/upload/so_${seconds}/`)
  return query ? `${thumb}?${query}` : thumb
}

// A cover image_url is "frame-derived" when it's one of our own so_<seconds>
// thumbnails rather than a file the user uploaded as a custom cover.
export function frameOffsetOf(imageUrl) {
  const m = imageUrl && imageUrl.match(/\/upload\/so_([\d.]+)\//)
  return m ? parseFloat(m[1]) : null
}
