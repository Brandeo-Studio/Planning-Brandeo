const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'ogg']

export function isVideoUrl(url) {
  if (!url) return false
  const ext = url.split('.').pop().split('?')[0].toLowerCase()
  return VIDEO_EXTENSIONS.includes(ext)
}

export function parseCarouselImages(imageUrl) {
  if (!imageUrl) return []
  try {
    const parsed = JSON.parse(imageUrl)
    return Array.isArray(parsed) ? parsed : [imageUrl]
  } catch {
    return [imageUrl]
  }
}
