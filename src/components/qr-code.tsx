"use client"

import { useEffect, useState, useRef } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { QrCode, Download } from "lucide-react"
import { toast } from "sonner"

/**
 * Renders a QR code that encodes the equipment's identifier/URL.
 * The QR code links to the app route with the equipment ID, so
 * scanning it on a phone opens the equipment record.
 */
export function QRCodeDisplay({
  value,
  label,
  size = 160,
}: {
  value: string
  label?: string
  size?: number
}) {
  const [dataUrl, setDataUrl] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Encode the full URL so scanning opens the equipment page
    const target = typeof window !== "undefined"
      ? `${window.location.origin}/?equip=${value}`
      : value
    QRCode.toDataURL(target, {
      width: size,
      margin: 2,
      color: { dark: "#1B2A6B", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""))
  }, [value, size])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `qr-${label || value}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success("QR code downloaded — ready to print as a label")
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border-2 border-border bg-white p-3">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code for ${label || value}`} width={size} height={size} />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground" style={{ width: size, height: size }}>
            <QrCode className="h-8 w-8 animate-pulse" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Scan to open this asset</p>
        {label && <p className="text-xs font-mono font-medium mt-0.5">{label}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={!dataUrl}>
        <Download className="h-4 w-4 mr-2" />
        Download QR Label
      </Button>
    </div>
  )
}
