'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, ChecklistItem } from '@/lib/types'
import { STATUS_STEPS } from '@/lib/types'
import { DesignSystemTab, EstruturaTab } from '@/app/components/DesignSystemTab'
import { ApprovalsTab } from '@/app/components/ApprovalsTab'

type Tab = 'materiais' | 'design system' | 'estrutura' | 'aprovacoes'

interface Props {
  profile: Profile
  project: Project | null
  checklist: ChecklistItem[]
}

interface ModalState {
  item: ChecklistItem
  note: string
  file: File | null
  saving: boolean
  error: string
}

export function DashboardClient({ profile, project, checklist: initial }: Props) {
  const [activeTab, setActiveTab]         = useState<Tab>('materiais')
  const [items, setItems]                 = useState<ChecklistItem[]>(initial)
  const [refreshing, setRefreshing]       = useState(false)
  const [modal, setModal]                 = useState<ModalState | null>(null)
  const [questionItem, setQuestionItem]   = useState<ChecklistItem | null>(null)
  const [questionText, setQuestionText]   = useState('')
  const [questionSaving, setQuestionSaving] = useState(false)
  const [helpOpen, setHelpOpen]           = useState(false)
  const [, startTransition]               = useTransition()
  const fileInputRef                      = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const supabase = createClient()
  const isAdmin  = profile.role === 'admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function toggleClient(item: ChecklistItem) {
    const next = !item.checked_by_client
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked_by_client: next } : i))
    startTransition(async () => {
      await supabase.from('checklist_items').update({ checked_by_client: next }).eq('id', item.id)
    })
  }

  async function toggleAdmin(item: ChecklistItem) {
    const next = !item.checked_by_admin
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked_by_admin: next } : i))
    startTransition(async () => {
      await supabase.from('checklist_items').update({ checked_by_admin: next }).eq('id', item.id)
    })
  }

  async function refreshChecklist() {
    if (!project) return
    setRefreshing(true)
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', project.id)
      .order('order_index')
    setItems(data ?? [])
    setRefreshing(false)
  }

  function openModal(item: ChecklistItem) {
    setModal({ item, note: item.note ?? '', file: null, saving: false, error: '' })
  }
  function closeModal() { setModal(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return
    setModal(m => m ? { ...m, saving: true, error: '' } : m)

    let fileUrl = modal.item.file_url
    if (modal.file) {
      const ext  = modal.file.name.split('.').pop()
      const path = `${project?.id}/${modal.item.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('materiais')
        .upload(path, modal.file, { upsert: true })
      if (upErr) {
        setModal(m => m ? { ...m, saving: false, error: 'erro no upload. tente novamente.' } : m)
        return
      }
      const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
      fileUrl = urlData.publicUrl
    }

    const update: Partial<ChecklistItem> = {
      note: modal.note || null,
      file_url: fileUrl,
      checked_by_client: true,
      admin_note: null,
    }
    const { error: dbErr } = await supabase
      .from('checklist_items')
      .update(update)
      .eq('id', modal.item.id)
    if (dbErr) {
      setModal(m => m ? { ...m, saving: false, error: 'erro ao salvar. tente novamente.' } : m)
      return
    }
    setItems(prev => prev.map(i =>
      i.id === modal.item.id ? { ...i, ...update, file_url: fileUrl ?? null } : i
    ))
    closeModal()
  }

  function openQuestion(item: ChecklistItem) {
    setQuestionItem(item)
    setQuestionText(item.client_question ?? '')
  }

  async function sendQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!questionItem || !questionText.trim()) return
    setQuestionSaving(true)
    const { error } = await supabase
      .from('checklist_items')
      .update({ client_question: questionText.trim() })
      .eq('id', questionItem.id)
    if (!error) {
      setItems(prev => prev.map(i =>
        i.id === questionItem.id ? { ...i, client_question: questionText.trim() } : i
      ))
      setQuestionItem(null)
    }
    setQuestionSaving(false)
  }

  const statusIndex = project ? STATUS_STEPS.findIndex(s => s.key === project.status) : -1
  const categories  = Array.from(new Set(items.map(i => i.category)))
  const totalItems  = items.length
  const doneItems   = items.filter(i => i.checked_by_client || i.checked_by_admin).length
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <main className="page-wrap">
      <div className="device" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 5rem)' }}>

        {/* ── CHASSIS PANELS ── */}
        <div className="chassis-body">
          <div className="panel-header" style={{ flexWrap: 'nowrap' }}>
            <Image src="/logo-light.svg" alt="geōrgia." width={160} height={42} priority style={{ display: 'block', flexShrink: 0 }} />
            {project && (
              <div className="badge-desktop-only">
                <div className="sticker">
                  <div className="sticker-body">
                    <span className="sticker-title">{project.name}</span>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 }}>
              {!isAdmin && (
                <button
                  className="btn-chassis"
                  onClick={() => setHelpOpen(true)}
                  style={{ padding: '0.4rem 0.7rem', fontSize: '0.7rem', fontWeight: 600 }}
                  title="como usar o painel"
                >
                  ?
                </button>
              )}
              <button className="btn-chassis" onClick={handleLogout} style={{ padding: '0.4rem 0.9rem', fontSize: '0.6rem' }}>
                sair
              </button>
            </div>
          </div>

          {project && (
            <div className="badge-mobile-only">
              <div className="sticker">
                <div className="sticker-body">
                  <span className="sticker-title">{project.name}</span>
                </div>
              </div>
            </div>
          )}

          {project && (
            <div className="status-bar">
              {STATUS_STEPS.map((step, i) => (
                <div key={step.key} className={`status-step ${i < statusIndex ? 'is-done' : ''} ${i === statusIndex ? 'is-active' : ''}`}>
                  <span className="status-dot" />
                  {step.label}
                </div>
              ))}
            </div>
          )}

          <div className="dash-tabs">
            {(['materiais', 'design system', 'estrutura', 'aprovacoes'] as Tab[]).map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'is-active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'aprovacoes' ? 'aprovações' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── SCREEN ── */}
        <div className="screen-interior" style={{ flex: 1 }}>
          <div className="screen-content">

            {/* ── ABA MATERIAIS ── */}
            {activeTab === 'materiais' && (
              <>
                {!project ? (
                  <div className="empty-state">nenhum projeto ativo ainda.</div>
                ) : items.length === 0 ? (
                  <div className="empty-state">checklist vazio — aguarde geōrgia configurar os itens.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                      <button className="btn-chassis" onClick={refreshChecklist} disabled={refreshing} style={{ fontSize: '0.6rem', padding: '0.4rem 0.75rem' }} title="atualizar">
                        {refreshing ? '...' : '↻'}
                      </button>
                    </div>

                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(8,236,243,0.85)', textTransform: 'uppercase' }}>progresso</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(240,241,241,0.35)' }}>{doneItems}/{totalItems}</span>
                      </div>
                      <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--gradient)', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {categories.map(cat => (
                      <div key={cat} className="checklist-category">
                        <div className="category-label">{cat}</div>
                        {items.filter(i => i.category === cat).map(item => {
                          const isComplete = item.checked_by_client && item.checked_by_admin
                          return (
                            <div key={item.id} className={`checklist-item ${isComplete ? 'is-complete' : ''}`}>
                              <div className="check-wrap">
                                <button
                                  className={`led-check ${item.checked_by_client ? 'is-checked' : ''}`}
                                  onClick={() => toggleClient(item)}
                                  title="marcar como enviado"
                                >
                                  {item.checked_by_client && (
                                    <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                      <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>
                                {isAdmin ? (
                                  <button
                                    className={`led-check is-admin ${item.checked_by_admin ? 'is-checked' : ''}`}
                                    onClick={() => toggleAdmin(item)}
                                    title="confirmar recebimento"
                                  >
                                    {item.checked_by_admin && (
                                      <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </button>
                                ) : (
                                  <div
                                    className={`led-check is-admin ${item.checked_by_admin ? 'is-checked' : ''}`}
                                    style={{ cursor: 'default' }}
                                    title={item.checked_by_admin ? 'confirmado por geōrgia' : 'aguardando confirmação de geōrgia'}
                                  >
                                    {item.checked_by_admin && (
                                      <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="check-label-wrap">
                                <div className="check-label">{item.label}</div>
                                <div className="check-owners">
                                  {item.checked_by_client ? 'enviado por você' : ''}
                                  {item.checked_by_client && item.checked_by_admin ? ' · ' : ''}
                                  {item.checked_by_admin ? 'confirmado por geōrgia' : ''}
                                </div>
                                {item.file_url && (
                                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="item-file-link">
                                    ↗ arquivo enviado
                                  </a>
                                )}
                                {item.admin_file_url && (
                                  <a href={item.admin_file_url} target="_blank" rel="noopener noreferrer" className="item-file-link" style={{ color: 'rgba(255,170,0,0.7)' }}>
                                    ↗ arquivo de geōrgia
                                  </a>
                                )}
                                {item.admin_note && !item.checked_by_client && (
                                  <div className="client-admin-note">
                                    <span className="client-admin-note-label">⚠ geōrgia solicitou ajuste</span>
                                    <p className="client-admin-note-text">{item.admin_note}</p>
                                  </div>
                                )}
                                {item.client_question && (
                                  <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.22)', borderRadius: '4px', padding: '0.45rem 0.65rem', marginTop: '0.35rem' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#FFAA00', letterSpacing: '0.15em', textTransform: 'uppercase' }}>sua dúvida</span>
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'rgba(240,241,241,0.65)', lineHeight: 1.5, marginTop: '0.2rem' }}>{item.client_question}</p>
                                    {item.admin_question_reply && (
                                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,170,0,0.15)' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,170,0,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>resposta de geōrgia</span>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'rgba(240,241,241,0.75)', lineHeight: 1.6, marginTop: '0.2rem' }}>{item.admin_question_reply}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {!isComplete && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                  <button
                                    onClick={() => openQuestion(item)}
                                    title="tirar dúvida sobre este item"
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '0.3rem 0.5rem',
                                      background: 'none',
                                      border: `1px solid ${item.client_question ? 'rgba(8,236,243,0.4)' : 'rgba(240,241,241,0.15)'}`,
                                      borderRadius: '4px',
                                      color: item.client_question ? 'rgba(8,236,243,0.7)' : 'rgba(240,241,241,0.3)',
                                      cursor: 'pointer',
                                      lineHeight: 1,
                                    }}
                                  >
                                    ?
                                  </button>
                                  <button className="item-send-btn" onClick={() => openModal(item)} title="enviar material">
                                    <span>↑</span>
                                    <span className="item-send-label">enviar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {activeTab === 'design system' && project && (
              <DesignSystemTab projectId={project.id} initialUrl={project.design_system_url ?? null} isAdmin={isAdmin} initialComment={project.design_system_comment ?? null} />
            )}
            {activeTab === 'design system' && !project && <div className="empty-state">nenhum projeto ativo ainda.</div>}

            {activeTab === 'estrutura' && project && (
              <EstruturaTab projectId={project.id} initialUrl={project.estrutura_url ?? null} isAdmin={isAdmin} initialComment={project.estrutura_comment ?? null} />
            )}
            {activeTab === 'estrutura' && !project && <div className="empty-state">nenhum projeto ativo ainda.</div>}

            {activeTab === 'aprovacoes' && project && <ApprovalsTab projectId={project.id} isAdmin={isAdmin} />}
            {activeTab === 'aprovacoes' && !project && <div className="empty-state">nenhum projeto ativo ainda.</div>}

          </div>
        </div>
      </div>

      {/* ── MODAL AJUDA ── */}
      {helpOpen && (
        <div className="modal-overlay" onClick={() => setHelpOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <span className="modal-title">como usar o painel</span>
              <button className="modal-close" onClick={() => setHelpOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ gap: '1.25rem' }}>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(8,236,243,0.7)', marginBottom: '0.5rem' }}>abas e etapas</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.7)', lineHeight: 1.7 }}>
                  Na parte superior há duas faixas deslizantes — deslize para os lados para ver todas as abas e todas as etapas do projeto.
                </p>
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(8,236,243,0.7)', marginBottom: '0.5rem' }}>aba materiais</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.7)', lineHeight: 1.7 }}>
                  Lista de tudo que precisa ser enviado. Para cada item, clique em <strong style={{ color: 'rgba(240,241,241,0.9)' }}>↑ enviar</strong> para fazer upload de um arquivo ou colar um texto. Após o envio, o LED do lado esquerdo acende. Quando geōrgia confirmar o recebimento, o LED amarelo também acende.
                </p>
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(8,236,243,0.7)', marginBottom: '0.5rem' }}>dúvidas por item</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.7)', lineHeight: 1.7 }}>
                  Cada item tem um botão <strong style={{ color: 'rgba(240,241,241,0.9)' }}>?</strong> — use para tirar dúvidas específicas sobre aquele material. A resposta de geōrgia aparecerá no mesmo item.
                </p>
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(8,236,243,0.7)', marginBottom: '0.5rem' }}>design system e estrutura</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.7)', lineHeight: 1.7 }}>
                  Quando geōrgia subir uma entrega nessas abas, você poderá visualizar e deixar observações usando o botão <strong style={{ color: 'rgba(240,241,241,0.9)' }}>comentar</strong>.
                </p>
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(8,236,243,0.7)', marginBottom: '0.5rem' }}>aprovações</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.7)', lineHeight: 1.7 }}>
                  Nesta aba você aprova ou solicita ajustes nas entregas finais. Cada entregável tem um status próprio.
                </p>
              </div>

            </div>
            <div className="modal-footer">
              <button className="cta-btn" onClick={() => setHelpOpen(false)}>
                <span className="cta-led" />
                <span className="cta-label">entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ENVIAR MATERIAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal.item.label}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="field-group">
                <label className="field-label" style={{ color: 'rgba(8,236,243,0.6)', letterSpacing: '0.2em' }}>colar texto</label>
                <textarea
                  value={modal.note}
                  onChange={e => setModal(m => m ? { ...m, note: e.target.value } : m)}
                  className="modal-textarea"
                  placeholder="cole aqui o conteúdo, link, ou qualquer informação relevante..."
                  rows={5}
                />
              </div>
              <div className="modal-divider"><span>ou</span></div>
              <div className="field-group">
                <label className="field-label" style={{ color: 'rgba(8,236,243,0.6)', letterSpacing: '0.2em' }}>fazer upload</label>
                <div className="modal-dropzone" onClick={() => fileInputRef.current?.click()}>
                  {modal.file
                    ? <span className="modal-file-name">📎 {modal.file.name}</span>
                    : <span className="modal-drop-hint">clique para selecionar arquivo</span>
                  }
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0] ?? null; setModal(m => m ? { ...m, file: f } : m) }}
                  />
                </div>
              </div>
              {modal.error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#DE0538' }}>{modal.error}</p>}
              <div className="modal-footer">
                <button type="button" className="btn-chassis" onClick={closeModal} style={{ fontSize: '0.62rem', padding: '0.5rem 1rem' }}>cancelar</button>
                <button type="submit" className="cta-btn" disabled={modal.saving || (!modal.note.trim() && !modal.file)}>
                  <span className="cta-led" />
                  <span className="cta-label">{modal.saving ? 'enviando...' : 'enviar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DÚVIDA ── */}
      {questionItem && (
        <div className="modal-overlay" onClick={() => setQuestionItem(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">qual sua dúvida?</span>
              <button className="modal-close" onClick={() => setQuestionItem(null)}>✕</button>
            </div>
            <form onSubmit={sendQuestion} className="modal-body">
              <div className="field-group">
                <label className="field-label" style={{ color: 'rgba(8,236,243,0.6)', letterSpacing: '0.2em' }}>
                  {questionItem.label}
                </label>
                <textarea
                  className="modal-textarea"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  placeholder="descreva sua dúvida ou dificuldade..."
                  rows={5}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-chassis" onClick={() => setQuestionItem(null)} style={{ fontSize: '0.62rem', padding: '0.5rem 1rem' }}>cancelar</button>
                <button type="submit" className="cta-btn" disabled={questionSaving || !questionText.trim()}>
                  <span className="cta-led" />
                  <span className="cta-label">{questionSaving ? 'enviando...' : 'enviar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
