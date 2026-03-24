export interface ProductSearchFields {
  name: string
  genericName?: string
  aliases: string[]
}

function norm(s: string): string {
  return s.toLocaleLowerCase('sq-AL').trim()
}

function tokenize(v: string): string[] {
  return v.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Uint16Array(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return row[n]
}

function considerScore(current: number | null, candidate: number): number | null {
  return current === null ? candidate : Math.min(current, candidate)
}

export function workerProductSearchScore(p: ProductSearchFields, rawQuery: string): number | null {
  const q = norm(rawQuery)
  if (!q) return null

  const fields: { value: string; base: number }[] = [
    { value: norm(p.name), base: 0 },
    { value: norm(p.genericName ?? ''), base: 4 },
  ]
  for (const al of p.aliases) {
    fields.push({ value: norm(al), base: 7 })
  }

  let best: number | null = null

  for (const { value: v, base } of fields) {
    if (!v) continue

    const idx = v.indexOf(q)
    if (idx !== -1) {
      best = considerScore(best, base + idx * 0.01)
    }

    if (q.length >= 2) {
      const dWhole = levenshtein(q, v)
      if (dWhole <= 1) {
        best = considerScore(best, 15 + base + dWhole)
      }
      for (const tok of tokenize(v)) {
        if (tok.includes(q)) {
          best = considerScore(best, base + 2 + tok.indexOf(q) * 0.01)
        }
        if (tok.length >= 2 && q.length >= 2) {
          const d = levenshtein(q, tok)
          if (d <= 1) {
            best = considerScore(best, 18 + base + d)
          }
        }
      }
    }
  }

  return best
}

export function rankProductsForWorkerSearch<T extends ProductSearchFields>(
  products: T[],
  rawQuery: string,
  limit = 8
): T[] {
  const q = norm(rawQuery)
  if (!q) return []

  const scored = products
    .map((p) => ({ p, s: workerProductSearchScore(p, q) }))
    .filter((x): x is { p: T; s: number } => x.s !== null)
    .sort((a, b) => a.s - b.s)

  const out: T[] = []
  const seen = new Set<string>()
  for (const { p } of scored) {
    const id = (p as { id?: string }).id
    const key = id ?? `${p.name}:${p.genericName ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
    if (out.length >= limit) break
  }
  return out
}
