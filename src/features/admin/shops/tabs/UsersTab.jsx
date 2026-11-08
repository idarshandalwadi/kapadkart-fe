import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getShopUsers } from '@/features/admin/shops/api'

function formatDate(isoStr) {
  if (!isoStr) return 'Never'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return 'Never'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UsersTab({ slug }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getShopUsers(slug)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load shop users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-5">
      {/* Search & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <i
            className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3.5 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas transition-colors"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            Loading shop accounts…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <i className="fa-solid fa-users-slash text-3xl text-muted/40 mb-3" />
            <p className="m-0 text-sm text-muted">
              {search ? 'No users matching your search.' : 'No users found for this shop.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-canvas text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">User / Full Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 font-bold text-xs text-accent">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{user.full_name || '—'}</div>
                          <div className="text-xs text-muted font-mono sm:hidden">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-ink-soft">
                      {user.email}
                    </td>
                    <td className="px-4 py-3.5">
                      {user.is_owner ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                          <i className="fa-solid fa-crown text-[0.65rem]" />
                          Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                          <i className="fa-solid fa-user text-[0.65rem]" />
                          Staff User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-soft">
                      {user.last_login_at ? (
                        <span className="font-medium text-ok">{formatDate(user.last_login_at)}</span>
                      ) : (
                        <span className="text-muted">Never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
