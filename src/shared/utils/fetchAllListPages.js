/**
 * Fetch every page of a list endpoint that returns `{ data, pagination }`.
 */
export async function fetchAllListPages(fetchPage, params = {}) {
  const all = []
  let page = 1
  const limit = 100

  while (true) {
    const json = await fetchPage({ ...params, page, limit })
    const rows = json.data ?? []
    all.push(...rows)
    const pagination = json.pagination ?? {}
    const totalPages = pagination.totalPages || pagination.total_pages || 1
    if (page >= totalPages || rows.length === 0) break
    page += 1
  }

  return all
}
