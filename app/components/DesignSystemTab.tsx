'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  initialUrl: string | null
  isAdmin: boolean
}

export function DesignSystemTab({ projectId, initialUrl, isAdmin }: Props) {
  const [url, setUrl]         = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')
  const fileInputRef          = useRef<HTMLInputElement>(null)
  const supabase              = createClient()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('apenas arquivos .html são aceitos.')
      return
    }

    setUploading(true)
    setError('')

    const path = `${projectId}/design-system.html`
    const { error: upErr } = await supabase.storage
      .from('materiais')
      .upload(path, file, { upsert: true, contentType: 'text/html' })

    if (upErr) {
      setError('erro no upload. tente novamente.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: dbErr } = await supabase
      .from('projects')
      .update({ design_system_url: publicUrl })
      .eq('id', projectId)

    if (dbErr) {
      setError('erro ao salvar. tente novamente.')
      setUploading(false)
      return
    }

    setUrl(publicUrl)
    setUploading(false)
  }

  /* ── CLIENT: só o iframe ── */
  if (!isAdmin) {
    if (!url) return (
      <div className="empty-state">design system será publicado aqui em breve.</div>
    )
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '-2rem -3.5rem -2.5rem' }}>
        <iframe
          src={url}
          style={{ flex: 1, border: 'none', width: '100%', minHeight: '600px' }}
          title="Design System"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    )
  }

  /* ── ADMIN: upload + preview ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          className="cta-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <span className="cta-led" />
          <span className="cta-label">
            {uploading ? 'enviando...' : url ? 'substituir html' : 'enviar html'}
          </span>
        </button>

        {url && !uploading && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'rgba(8,236,243,0.5)',
            letterSpacing: '0.06em',
          }}>
            ✓ design-system.html publicado
          </span>
        )}

        {error && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#DE0538' }}>
            {error}
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      {url && (
        <div style={{ border: '1px solid rgba(8,236,243,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(8,236,243,0.04)',
            borderBottom: '1px solid rgba(8,236,243,0.1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: 'rgba(8,236,243,0.4)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            preview
          </div>
          <iframe
            src={url}
            style={{ width: '100%', minHeight: '500px', border: 'none', display: 'block' }}
            title="Design System Preview"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      )}

    </div>
  )
}
