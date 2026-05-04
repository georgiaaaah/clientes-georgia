'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  initialUrl: string | null
  isAdmin: boolean
  storageKey: string
  dbField: string
  emptyLabel: string
  commentDbField: string
  initialComment?: string | null
  onUrlSaved?: (url: string) => void
}

export function HtmlTab({ projectId, initialUrl, isAdmin, storageKey, dbField, emptyLabel, commentDbField, initialComment, onUrlSaved }: Props) {
  const [url, setUrl]                   = useState<string | null>(initialUrl)
  const [htmlContent, setHtmlContent]   = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [error, setError]               = useState('')
  const [currentComment, setCurrentComment] = useState<string | null>(initialComment ?? null)
  const [commentOpen, setCommentOpen]   = useState(false)
  const [commentText, setCommentText]   = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)
  const supabase                        = createClient()

  useEffect(() => {
    if (!url) return
    fetch(url)
      .then(r => r.text())
      .then(html => setHtmlContent(html))
      .catch(() => setError('erro ao carregar o arquivo.'))
  }, [url])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('apenas arquivos .html são aceitos.')
      return
    }
    setUploading(true)
    setError('')

    const path = `${projectId}/${storageKey}`
    const { error: upErr } = await supabase.storage
      .from('materiais')
      .upload(path, file, { upsert: true, contentType: 'text/html' })

    if (upErr) { setError('erro no upload. tente novamente.'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: dbErr } = await supabase
      .from('projects')
      .update({ [dbField]: publicUrl })
      .eq('id', projectId)

    if (dbErr) { setError('erro ao salvar. tente novamente.'); setUploading(false); return }

    setUrl(publicUrl)
    onUrlSaved?.(publicUrl)
    setUploading(false)
  }

  async function saveComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setCommentSaving(true)
    const { error: err } = await supabase
      .from('projects')
      .update({ [commentDbField]: commentText.trim() })
      .eq('id', projectId)
    if (!err) {
      setCurrentComment(commentText.trim())
      setCommentOpen(false)
    }
    setCommentSaving(false)
  }

  const commentBtn = (
    <button
      className="btn-chassis"
      onClick={() => { setCommentText(currentComment ?? ''); setCommentOpen(true) }}
      style={{ fontSize: '0.6rem', padding: '0.4rem 0.9rem' }}
    >
      {currentComment ? 'editar observação' : 'comentar'}
    </button>
  )

  const commentDisplay = currentComment ? (
    <div style={{
      background: 'rgba(8,236,243,0.05)', border: '1px solid rgba(8,236,243,0.15)',
      borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(8,236,243,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0, paddingTop: '0.1rem' }}>
        sua observação
      </span>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(240,241,241,0.6)', flex: 1, lineHeight: 1.6 }}>
        {currentComment}
      </p>
    </div>
  ) : null

  const commentModal = commentOpen ? (
    <div className="modal-overlay" onClick={() => setCommentOpen(false)}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">observação sobre o {emptyLabel}</span>
          <button className="modal-close" onClick={() => setCommentOpen(false)}>✕</button>
        </div>
        <form onSubmit={saveComment} className="modal-body">
          <div className="field-group">
            <label className="field-label" style={{ color: 'rgba(8,236,243,0.6)', letterSpacing: '0.2em' }}>
              sua observação
            </label>
            <textarea
              className="modal-textarea"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="descreva sua observação, preferência ou ajuste desejado..."
              rows={5}
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-chassis" onClick={() => setCommentOpen(false)} style={{ fontSize: '0.62rem', padding: '0.5rem 1rem' }}>
              cancelar
            </button>
            <button type="submit" className="cta-btn" disabled={commentSaving || !commentText.trim()}>
              <span className="cta-led" />
              <span className="cta-label">{commentSaving ? 'enviando...' : 'enviar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null

  /* ── CLIENT ── */
  if (!isAdmin) {
    return (
      <>
        {!url ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div className="empty-state">{emptyLabel} será publicado aqui em breve.</div>
            {commentBtn}
            {commentDisplay}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              {commentBtn}
            </div>
            {currentComment && <div style={{ marginBottom: '0.75rem' }}>{commentDisplay}</div>}
            <div className="html-preview-wrap" style={{ marginTop: 0 }}>
              <iframe
                srcDoc={htmlContent ?? ''}
                style={{ flex: 1, border: 'none', width: '100%', minHeight: '600px', display: 'block' }}
                title={emptyLabel}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </>
        )}
        {commentModal}
      </>
    )
  }

  /* ── ADMIN ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="cta-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <span className="cta-led" />
          <span className="cta-label">{uploading ? 'enviando...' : url ? 'substituir html' : 'enviar html'}</span>
        </button>
        {url && !uploading && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(8,236,243,0.5)', letterSpacing: '0.06em' }}>
            ✓ {storageKey} publicado
          </span>
        )}
        {error && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#DE0538' }}>{error}</span>
        )}
        <input ref={fileInputRef} type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {currentComment && (
        <div style={{
          background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)',
          borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ color: '#FFAA00', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', flexShrink: 0, paddingTop: '0.1rem' }}>
            observação do cliente
          </span>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(240,241,241,0.65)', flex: 1, lineHeight: 1.6 }}>
            {currentComment}
          </p>
        </div>
      )}

      {url && (
        <div style={{ border: '1px solid rgba(8,236,243,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(8,236,243,0.04)', borderBottom: '1px solid rgba(8,236,243,0.1)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(8,236,243,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            preview
          </div>
          <iframe
            srcDoc={htmlContent ?? ''}
            style={{ width: '100%', minHeight: '500px', border: 'none', display: 'block' }}
            title={`${emptyLabel} preview`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )}

    </div>
  )
}

export function DesignSystemTab(props: Omit<Props, 'storageKey' | 'dbField' | 'emptyLabel' | 'commentDbField'>) {
  return <HtmlTab {...props} storageKey="design-system.html" dbField="design_system_url" emptyLabel="design system" commentDbField="design_system_comment" />
}

export function EstruturaTab(props: Omit<Props, 'storageKey' | 'dbField' | 'emptyLabel' | 'commentDbField'>) {
  return <HtmlTab {...props} storageKey="estrutura.html" dbField="estrutura_url" emptyLabel="estrutura do site" commentDbField="estrutura_comment" />
}
