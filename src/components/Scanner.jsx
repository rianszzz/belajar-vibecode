import React, { useEffect, useRef, useState } from 'react'

// Scan barcode: BarcodeDetector (Chrome Android) → fallback jsqr (iOS Safari).
// Graceful: kamera ditolak / tak tersedia → pesan inline, bukan crash.
export default function Scanner({ products, onPick, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let raf = 0
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Kamera tidak didukung browser ini.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'code_128'] })
          const tick = async () => {
            if (cancelled) return
            try {
              const codes = await detector.detect(videoRef.current)
              if (codes.length > 0) {
                handle(codes[0].rawValue)
                return
              }
            } catch { /* frame tidak siap — lanjut */ }
            raf = requestAnimationFrame(tick)
          }
          tick()
        } else {
          // fallback jsqr
          const { default: jsQR } = await import('jsqr')
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          const tick = () => {
            if (cancelled) return
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              canvas.width = videoRef.current.videoWidth
              canvas.height = videoRef.current.videoHeight
              ctx.drawImage(videoRef.current, 0, 0)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const code = jsQR(img.data, img.width, img.height)
              if (code) { handle(code.data); return }
            }
            raf = requestAnimationFrame(tick)
          }
          tick()
        }
      } catch (e) {
        // race: video belum mount saat play() — pastikan stream tidak bocor
        stream?.getTracks().forEach((t) => t.stop())
        setError(e.name === 'NotAllowedError' ? 'Akses kamera ditolak. Izinkan kamera di pengaturan browser.' : 'Kamera tidak dapat dibuka.')
      }
    }

    function handle(text) {
      const product = products.find((p) => p.barcode === text)
      if (product) {
        onPick(product)
        cleanup()
      }
      // barcode tidak dikenal: lanjut scan — jangan matikan loop
    }

    function cleanup() {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }

    start()
    return cleanup
  }, [products, onPick])

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Pindai barcode"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 12, width: '100%', maxWidth: 420 }}>
        {error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : (
          <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000' }} />
        )}
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: 10 }}>Tutup</button>
      </div>
    </div>
  )
}
