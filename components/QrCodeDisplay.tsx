"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"

interface Props {
  panelId: string
  panelIdentifier: string
}

export default function QrCodeDisplay({ panelId, panelIdentifier }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, panelId, {
      width: 160,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(() => setReady(true))
  }, [panelId])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `qr-panel-${panelIdentifier}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="flex items-center gap-5">
      <div className="shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-white p-1">
        <canvas ref={canvasRef} className="block" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-700 font-medium">Panel {panelIdentifier}</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Scan this code with the in-app scanner to navigate directly to this panel.
        </p>
        <button
          onClick={handleDownload}
          disabled={!ready}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PNG
        </button>
      </div>
    </div>
  )
}
