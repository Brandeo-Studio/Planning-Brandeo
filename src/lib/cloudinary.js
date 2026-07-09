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
