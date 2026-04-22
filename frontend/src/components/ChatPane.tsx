import { useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchChatHistory, sendChat } from '../api'
import type { ChatMessage, Project } from '../types'

interface ChatPaneProps {
  project: Project
}

export function ChatPane({ project }: ChatPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingHistory(true)
    fetchChatHistory(project.id)
      .then((m) => {
        if (!cancelled) setMessages(m)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    // Scroll to bottom on new message.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setSending(true)
    try {
      const reply = await sendChat(project.id, trimmed)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-card border rounded-xl flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {loadingHistory ? (
          <p className="text-xs text-[var(--color-muted-foreground)] italic">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Ask a question about this report.
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]/70 mt-1">
              The assistant has access to the final report and each researcher's raw findings.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-secondary)] rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="px-5 pb-2 text-xs text-[var(--color-error)]">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--color-border)] p-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
          placeholder="Ask about the report…"
          rows={1}
          disabled={sending}
          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] resize-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn-accent flex items-center justify-center w-9 h-9 rounded-lg text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
