export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; keepalive?: boolean } = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method || "GET",
    credentials: "same-origin",
    keepalive: options.keepalive,
    headers: {
      "Content-Type": "application/json",
      "X-Runn-Client": "local-review",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal ?? AbortSignal.timeout(35000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`)
  return data as T
}
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  const quote = (v: unknown) => {
    let s = String(v ?? "")
    if (/^[=+@\-]/.test(s)) s = "'" + s
    return '"' + s.replaceAll('"', '""') + '"'
  }
  const csv =
    "\ufeff" +
    [
      columns.map(quote).join(","),
      ...rows.map((r) => columns.map((c) => quote(r[c])).join(",")),
    ].join("\r\n")
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  )
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
