'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Approval {
  id: string
  project_id: string
  title: string
  description: string | null
  link: string | null
  status: 'pendente' | 'aprovado' | 'ajuste'
  client_comment: string | null
  order_index: number
  created_at: string
}

interface Props {
  projectId: string
  isAdmin: boolean
}

const STATUS_LABEL: Record<Approval['status'], string> = {
  pendente: 'aguardando aprovação',
  aprovado: 'aprovado',
  ajuste:   'ajuste solicitado',
}

const STATUS_COLOR: Record<Approval['status'], string> = {
  pendente: 'rgba(240,241,241,0.3)',
  aprovado: '#25D366',
  ajuste:   '#DE0538',
}

export function ApprovalsTab({ projectId, isAdmin }: Props) {
  const [items, setItems]           = useState<Approval[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [comment, setComment]       = useState('')
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [newLink, setNewLink]       = useState('')
  const [adding, setAdding]         = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const supabase = createClient()

  async function fetchItems() {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index')
    if (error) console.error('[approvals] fetch failed:', error)
    setItems(data ?? [])
  }

  useEffect(() => {
    fetchItems().then(() => setLoading(false))
  }, [projectId])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchItems()
    setRefreshing(false)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('approvals')
      .insert({ project_id: projectId, title: newTitle.trim(), description: newDesc.trim() || null, link: newLink.trim() || null, order_index: items.length })
      .select()
      .single()
    if (!error && data) {
      setItems(prev => [...prev, data as Approval])
      setNewTitle(''); setNewDesc(''); setNewLink('')
      setShowForm(false)
    }
    setAdding(false)
  }

  async function deleteItem(id: string) {
    await supabase.from('approvals').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function respond(id: string, status: 'aprovado' | 'ajuste', clientComment?: string) {
    const update = { status, client_comment: clientComment ?? null }
    const { error } = await supabase.from('approvals').update(update).eq('id', id)
    if (error) { console.error('[approvals] update failed:', error); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...update } : i))
    setCommenting(null)
    setComment('')
    setFeedbackId(id)
    setTimeout(() => setFeedbackId(null), 2500)
  }

  if (loading) return <div className="empty-state">carregando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* barra de ações — topo */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button className="btn-chassis" onClick={handleRefresh} disabled={refreshing} style={{ fontSize: '0.6rem', padding: '0.4rem 0.75rem' }} title="atualizar">
          {refreshing ? '...' : '↻'}
        </button>
        {isAdmin && (
          <button className="btn-chassis" onClick={() => setShowForm(v => !v)} style={{ fontSize: '0.6rem', padding: '0.4rem 0.9rem' }}>
            {showForm ? '✕ cancelar' : '+ novo item'}
          </button>
        )}
      </div>

      {/* formulário admin */}
      {isAdmin && showForm && (
        <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
          <div className="field-group">
            <label className="field-label" style={{ color: 'rgba(8,236,243,0.5)', letterSpacing: '0.2em' }}>título</label>
            <input className="ds-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="ex: aprovação do wireframe" required />
          </div>
          <div className="field-group">
            <label className="field-label" style={{ color: 'rgba(8,236,243,0.5)', letterSpacing: '0.2em' }}>descrição (opcional)</label>
            <textarea className="ds-textarea" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="instruções ou contexto para o cliente..." rows={2} />
          </div>
          <div className="field-group">
            <label className="field-label" style={{ color: 'rgba(8,236,243,0.5)', letterSpacing: '0.2em' }}>link (opcional)</label>
            <input className="ds-input" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://figma.com/... ou https://staging..." type="url" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="cta-btn" disabled={adding}>
              <span className="cta-led" />
              <span className="cta-label">{adding ? 'adicionando...' : 'adicionar'}</span>
            </button>
          </div>
        </form>
      )}

      {/* lista */}
      {items.length === 0 && (
        <div className="empty-state">
          {isAdmin ? 'nenhum item ainda — adicione acima.' : 'nenhuma aprovação pendente ainda.'}
        </div>
      )}

      {items.map(item => (
        <div key={item.id} className="approval-card">
          <div className="approval-card-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <span className="approval-title">{item.title}</span>
              <div className="approval-status">
                <span className="approval-led" style={{ background: STATUS_COLOR[item.status] }} />
                {STATUS_LABEL[item.status]}
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => deleteItem(item.id)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(240,241,241,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.25rem', flexShrink: 0 }} title="remover">✕</button>
            )}
          </div>

          {item.description && <p className="approval-desc">{item.description}</p>}

          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="approval-link">↗ ver entregável</a>
          )}

          {item.client_comment && (
            <div className="approval-comment">
              <span className="approval-comment-label">comentário do cliente</span>
              <p className="approval-comment-text">{item.client_comment}</p>
            </div>
          )}

          {feedbackId === item.id && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(240,241,241,0.4)', marginTop: '0.5rem' }}>resposta enviada ✓</p>
          )}

          {/* ações do cliente */}
          {!isAdmin && item.status === 'pendente' && (
            commenting === item.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
                <textarea className="modal-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="descreva o que precisa ser ajustado..." rows={3} autoFocus />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn-chassis" onClick={() => { setCommenting(null); setComment('') }} style={{ fontSize: '0.6rem', padding: '0.4rem 0.8rem' }}>cancelar</button>
                  <button className="cta-btn" onClick={() => respond(item.id, 'ajuste', comment)} disabled={!comment.trim()}>
                    <span className="cta-led" style={{ background: '#DE0538', boxShadow: '0 0 5px 2px rgba(222,5,56,0.5)', animation: 'none' }} />
                    <span className="cta-label">enviar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button className="cta-btn" onClick={() => respond(item.id, 'aprovado')} style={{ flex: 1 }}>
                  <span className="cta-led" />
                  <span className="cta-label">aprovar</span>
                </button>
                <button className="btn-chassis" onClick={() => { setCommenting(item.id); setComment('') }} style={{ flex: 1, fontSize: '0.68rem' }}>
                  solicitar ajuste
                </button>
              </div>
            )
          )}
        </div>
      ))}

    </div>
  )
}
