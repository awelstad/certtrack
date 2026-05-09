export type CsvColumn = { header: string; key: string }

export function buildCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const header = columns.map((c) => escape(c.header)).join(',')
  const body   = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n')
  return `${header}\n${body}`
}
