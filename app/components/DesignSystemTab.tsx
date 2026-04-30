'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  initialUrl: string | null
  isAdmin: boolean
  storageKey: string   // ex: "design-system.html" | "estrutura.html"
  dbField: string      // ex: "design_system_url" | "estrutura_url"
  emptyLabel: string   // ex: "design system" | "estrutura do site"
}

export function HtmlTab({ projectId, initialUrl, isAdmin, storageKey, dbField, emptyLabel }: Props) {
  const [url, setUrl]             = useState<string | null>(initialUrl)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const supabase                  = createClient()

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

    if (upErr) {
      setError('erro no upload. tente novamente.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: dbErr } = await supabase
      .from('projects')
      .update({ [dbField]: publicUrl })
      .eq('id', projectId)

    if (dbErr) {
      setError('erro ao salvar. tente novamente.')
      setUploading(false)
      return
    }

    setUrl(publicUrl)
    setUploading(false)
  }

  /* ── CLIENT: iframe full ── */
  if (!isAdmin) {
    if (!url) return (
      <div className="empty-state">{emptyLabel} será publicado aqui em breve.</div>
    )
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '-2rem -3.5rem -2.5rem' }}>
        <iframe
          srcDoc={htmlContent ?? ''}
          style={{ flex: 1, border: 'none', width: '100%', minHeight: '600px' }}
          title={emptyLabel}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    )
  }

  /* ── ADMIN: upload + preview ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="cta-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <span className="cta-led" />
          <span className="cta-label">
            {uploading ? 'enviando...' : url ? 'substituir html' : 'enviar html'}
          </span>
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

// named exports para retrocompatibilidade
export function DesignSystemTab(props: Omit<Props, 'storageKey' | 'dbField' | 'emptyLabel'>) {
  return <HtmlTab {...props} storageKey="design-system.html" dbField="design_system_url" emptyLabel="design system" />
}

export function EstruturaTab(props: Omit<Props, 'storageKey' | 'dbField' | 'emptyLabel'>) {
  return <HtmlTab {...props} storageKey="estrutura.html" dbField="estrutura_url" emptyLabel="estrutura do site" />
}
