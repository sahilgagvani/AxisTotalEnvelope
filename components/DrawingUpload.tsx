"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function DrawingUpload({
  panelId,
  panelIdentifier,
}: {
  panelId: string
  panelIdentifier: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error ?? "Upload failed")
      }
      const { url } = await uploadRes.json()

      const patchRes = await fetch(`/api/panels/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawingUrl: url }),
      })
      if (!patchRes.ok) throw new Error("Failed to save drawing URL")

      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ""
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : `Upload drawing for ${panelIdentifier}`}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
