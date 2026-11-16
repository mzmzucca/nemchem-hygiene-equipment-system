/**
 * Converts an array of objects into a CSV string.
 * Handles escaping of commas, quotes, and newlines.
 */
export function toCSV(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0 && !columns) return ""

  // Determine columns
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }))

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ""
    const s = typeof val === "object" ? JSON.stringify(val) : String(val)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = cols.map((c) => escape(c.label)).join(",")
  const body = rows
    .map((row) => cols.map((c) => escape(row[c.key])).join(","))
    .join("\n")

  return `${header}\n${body}`
}

/**
 * Sets the appropriate headers for a CSV download response.
 */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
