"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import jsQR from "jsqr"

export default function QrScanButton() {
  const [open, setOpen]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number | null>(null)
  const router    = useRouter()

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  function close() {
    stopCamera()
    setOpen(false)
    setError(null)
    setScanned(false)
  }

  // Scan loop — reads frames and checks for a QR code
  const scanFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code?.data) {
      // The QR encodes a panel ID (cuid). Validate it looks like one.
      const panelId = code.data.trim()
      if (panelId.length > 0) {
        setScanned(true)
        stopCamera()
        router.push(`/panels/${panelId}`)
        return
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame)
  }, [router, stopCamera])

  useEffect(() => {
    if (!open) return

    let active = true

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            rafRef.current = requestAnimationFrame(scanFrame)
          }
        }
      })
      .catch(() => {
        if (active) setError("Camera access denied or unavailable.")
      })

    return () => {
      active = false
      stopCamera()
    }
  }, [open, scanFrame, stopCamera])

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setScanned(false) }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h2M3 17a2 2 0 002 2h2M17 5h2a2 2 0 012 2M19 17h2a2 2 0 01-2 2h-2M7 3v2M17 3v2M7 19v2M17 19v2M9 9h6v6H9z" />
        </svg>
        Scan QR Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-900 text-sm">Scan QR Code</span>
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Camera feed */}
            <div className="relative bg-black aspect-square">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <p className="text-gray-400 text-sm">{error}</p>
                </div>
              ) : scanned ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-gray-400 text-sm">QR code detected — navigating…</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Hidden canvas used for frame analysis */}
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Viewfinder overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 relative">
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center py-3 px-5">
              Point your camera at a panel QR code
            </p>
          </div>
        </div>
      )}
    </>
  )
}
