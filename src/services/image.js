// 在瀏覽器端把照片縮小並轉成 JPEG，減少上傳量

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`無法讀取圖片：${file.name}`))
    }
    img.src = url
  })
}

// 最長邊縮到 maxSize，回傳 { dataUrl, base64 }
export async function compressImage(file, maxSize = 1600, quality = 0.8) {
  const img = await loadImage(file)
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'          // 透明背景的 PNG 轉 JPEG 時補白底
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { dataUrl, base64: dataUrl.split(',')[1] }
}
