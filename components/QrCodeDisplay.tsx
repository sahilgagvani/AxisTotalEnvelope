"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

interface Props {
  panelId: string
  panelIdentifier: string
}

export default function QrCodeDisplay({ panelId, panelIdentifier }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, panelId, {
      width: 220,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(() => setReady(true))
  }, [open, panelId])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `qr-panel-${panelIdentifier}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
        </svg>
        QR Code
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-80">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-semibold text-gray-900">Panel {panelIdentifier}</p>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-100 bg-white p-2">
              <canvas ref={canvasRef} className="block" />
            </div>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Scan this code with the in-app scanner to navigate directly to this panel.
            </p>

            <button
              onClick={handleDownload}
              disabled={!ready}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </button>
          </div>
        </div>
      )}
    </>
  )
}
