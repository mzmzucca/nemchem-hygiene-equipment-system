"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

/**
 * Triggers a CSV download from the /api/export endpoint.
 */
export function ExportButton({
  type,
  label = "Export CSV",
  filename,
}: {
  type: "customers" | "equipment" | "visits" | "consumption" | "products"
  label?: string
  filename?: string
}) {
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?type=${type}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename || `nemchem-${type}-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`${label} downloaded`)
    } catch {
      toast.error("Export failed")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
