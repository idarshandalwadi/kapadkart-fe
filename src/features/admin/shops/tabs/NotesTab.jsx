import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { addShopNote, getShopNotes } from '@/features/admin/shops/api'

function formatDate(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotesTab({ slug, onNotesCountChange }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getShopNotes(slug)
      const list = Array.isArray(data) ? data : []
      setNotes(list)
      if (onNotesCountChange) {
        onNotesCountChange(list.length)
      }
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to load internal notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = newContent.trim()
    if (!content) {
      toast.error('Note content cannot be empty')
      return
    }

    setSubmitting(true)
    try {
      await addShopNote(slug, content)
      toast.success('Admin note added')
      setNewContent('')
      await load()
    } catch (err) {
      if (err?.silent) return
      toast.error(err.message || 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add New Note Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
          <h4 className="m-0 inline-flex items-center gap-2 font-display text-base font-semibold text-ink">
            <i className="fa-solid fa-note-sticky text-accent" />
            Add Internal Note
          </h4>
          <span className="text-xs text-muted">Visible only to platform admins</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Record internal observations, follow-ups, contract terms, or support notes for this shop…"
            maxLength={5000}
            className="w-full rounded-xl border border-border bg-canvas/40 p-3 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] text-muted">
              {newContent.length}/5000 characters
            </span>

            <button
              type="submit"
              disabled={submitting || !newContent.trim()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-paper-plane" />
              )}
              <span>Post Note</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="m-0 font-display text-base font-semibold text-ink">
            Note History ({notes.length})
          </h4>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas transition-colors"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-surface p-12 text-sm text-muted">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            Loading notes…
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
            <i className="fa-solid fa-clipboard text-3xl text-muted/40 mb-3" />
            <p className="m-0 text-sm text-muted">
              No internal notes recorded yet for this shop.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm transition-all hover:border-border"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[0.7rem] font-bold text-accent">
                      {note.author_name ? note.author_name.charAt(0).toUpperCase() : 'A'}
                    </span>
                    <span className="text-xs font-semibold text-ink">
                      {note.author_name || 'Platform Admin'}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-muted">
                    {formatDate(note.created_at)}
                  </span>
                </div>

                <p className="m-0 whitespace-pre-wrap text-sm text-ink-soft leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
