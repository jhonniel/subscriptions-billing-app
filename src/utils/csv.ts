import type { TransactionRecord } from '@/types'

export function transactionsToCsv(rows: TransactionRecord[]): string {
  const headers = [
    'id',
    'type',
    'amount',
    'userId',
    'relatedUserId',
    'date',
    'categoryName',
    'description',
  ]
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.type,
        r.amount,
        r.userId,
        r.relatedUserId ?? '',
        r.date,
        r.categoryName ?? '',
        r.description ?? '',
      ]
        .map(escape)
        .join(','),
    ),
  ]
  return lines.join('\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
