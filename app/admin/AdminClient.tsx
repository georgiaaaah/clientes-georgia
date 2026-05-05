'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, ChecklistItem } from '@/lib/types'
import { STATUS_STEPS, CHECKLIST_DEFAULTS } from '@/lib/types'
import { DesignSystemTab, EstruturaTab } from '@/app/components/DesignSystemTab'
import { ApprovalsTab } from '@/app/components/ApprovalsTab'

interface Props {
  adminProfile: Profile
  projects: (Project & { profiles: Profile })[]
  clients: Profile[]
  initialProjectId: string | null
  initialChecklist: ChecklistItem[]
}

const iconBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
  color: 'rgba(240,241,241,0.28)', padding: '0.2rem 0.3rem',
  lineHeight: 1, flexShrink: 0,
}

const inlineInput: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '0.3rem 0.5rem',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '4px', color: 'var(--text-main)', outline: 'none', flex: 1,
}

const confirmBtn: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.6rem',
  background: 'rgba(8,236,243,0.1)', border: '1px solid rgba(8,236,243,0.25)',
  borderRadius: '4px', color: 'rgba(8,236,243,0.8)', cursor: 'pointer', flexShrink: 0,
}

const cancelBtn: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.3rem 0.6rem',
  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '4px', color: 'rgba(240,241,241,0.4)', cursor: 'pointer', flexShrink: 0,
}

export function AdminClient({ adminProfile, projects: initialProjects, clients, initialProjectId, initialChecklist }: Props) {
  const [projects, setProjects]       = useState(initialProjects)
  const [selectedId, setSelectedId]   = useState<string | null>(initialProjectId)
  const [checklist, setChecklist]     = useState<ChecklistItem[]>(initialChecklist)
  const [activeTab, setActiveTab]     = useState<'checklist' | 'design system' | 'estrutura' | 'aprovações'>('checklist')
  const [loading, setLoading]         = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newClientId, setNewClientId] = useState(clients[0]?.id ?? '')
  const [saving, setSaving]           = useState(false)
  const [noteItem, setNoteItem]       = useState<ChecklistItem | null>(null)
  const [noteText, setNoteText]       = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [, startTransition]           = useTransition()
  // checklist editing
  const [addingTo, setAddingTo]       = useState<string | null>(null)
  const [addLabel, setAddLabel]       = useState('')
  const [addNewCat, setAddNewCat]     = useState(false)
  const [newCatName, setNewCatName]   = useState('')
  const [newCatLabel, setNewCatLabel] = useState('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editLabel, setEditLabel]     = useState('')
  const [replyingTo, setReplyingTo]       = useState<string | null>(null)
  const [replyText, setReplyText]         = useState('')
  const [replySaving, setReplySaving]     = useState(false)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)
  const adminFileInputRef                 = useRef<HTMLInputElement>(null)
  const pendingUploadItem                 = useRef<ChecklistItem | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<ChecklistItem | null>(null)
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})

  const router   = useRouter()
  const supabase = createClient()

  const selectedProject = projects.find(p => p.id === selectedId) ?? null
  const statusIndex = selectedProject
    ? STATUS_STEPS.findIndex(s => s.key === selectedProject.status)
    : -1
  const categories = Array.from(new Set(checklist.map(i => i.category)))

  useEffect(() => {
    const saved = localStorage.getItem('admin-selected-project')
    if (saved && saved !== selectedId && projects.find(p => p.id === saved)) {
      selectProject(saved)
    }
  }, [])

  useEffect(() => {
    async function fetchQuestionCounts() {
      const { data } = await supabase
        .from('checklist_items')
        .select('project_id')
        .not('client_question', 'is', null)
        .is('admin_question_reply', null)
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((row: { project_id: string }) => {
          counts[row.project_id] = (counts[row.project_id] || 0) + 1
        })
        setQuestionCounts(counts)
      }
    }
    fetchQuestionCounts()
  }, [])

  async function selectProject(id: string) {
    localStorage.setItem('admin-selected-project', id)
    setLoading(true)
    setSelectedId(id)
    setAddingTo(null)
    setEditingId(null)
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', id)
      .order('order_index')
    setChecklist(data ?? [])
    setLoading(false)
  }

  async function toggleAdmin(item: ChecklistItem) {
    const next = !item.checked_by_admin
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, checked_by_admin: next } : i))
    startTransition(async () => {
      await supabase.from('checklist_items').update({ checked_by_admin: next }).eq('id', item.id)
    })
  }

  async function updateStatus(status: string) {
    if (!selectedProject) return
    await supabase.from('projects').update({ status }).eq('id', selectedProject.id)
    router.refresh()
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newClientId) return
    setSaving(true)

    const { data: project, error } = await supabase
      .from('projects')
      .insert({ name: newName.trim(), client_id: newClientId, status: 'briefing' })
      .select('*, profiles(id, name, role, created_at)')
      .single()

    if (error || !project) { setSaving(false); return }

    const items = CHECKLIST_DEFAULTS.map(d => ({
      ...d,
      project_id: project.id,
      checked_by_client: false,
      checked_by_admin: false,
      note: null,
      file_url: null,
    }))
    await supabase.from('checklist_items').insert(items)

    const { data: newChecklist } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', project.id)
      .order('order_index')

    setProjects(prev => [project as (Project & { profiles: Profile }), ...prev])
    setSelectedId(project.id)
    setChecklist(newChecklist ?? [])
    setNewName('')
    setShowForm(false)
    setSaving(false)
  }

  async function refreshChecklist() {
    if (!selectedId) return
    setRefreshing(true)
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', selectedId)
      .order('order_index')
    setChecklist(data ?? [])
    setRefreshing(false)
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteItem || !noteText.trim()) return
    setNoteSending(true)
    const update = { admin_note: noteText.trim(), checked_by_client: false, checked_by_admin: false }
    const { error } = await supabase.from('checklist_items').update(update).eq('id', noteItem.id)
    if (!error) {
      setChecklist(prev => prev.map(i => i.id === noteItem.id ? { ...i, ...update } : i))
      setNoteItem(null)
      setNoteText('')
    }
    setNoteSending(false)
  }

  async function addItem(category: string, label: string) {
    if (!selectedId || !label.trim() || !category.trim()) return
    const maxOrder = checklist.length > 0 ? Math.max(...checklist.map(i => i.order_index)) : -1
    const { data } = await supabase
      .from('checklist_items')
      .insert({ project_id: selectedId, label: label.trim(), category: category.trim(), order_index: maxOrder + 1 })
      .select()
      .single()
    if (data) setChecklist(prev => [...prev, data])
  }

  async function saveEdit() {
    if (!editingId || !editLabel.trim()) return
    await supabase.from('checklist_items').update({ label: editLabel.trim() }).eq('id', editingId)
    setChecklist(prev => prev.map(i => i.id === editingId ? { ...i, label: editLabel.trim() } : i))
    setEditingId(null)
    setEditLabel('')
  }

  async function deleteItem(item: ChecklistItem) {
    if (item.file_url || item.note) {
      setDeleteTarget(item)
      return
    }
    await performDelete(item.id)
  }

  async function performDelete(itemId: string) {
    await supabase.from('checklist_items').delete().eq('id', itemId)
    setChecklist(prev => prev.filter(i => i.id !== itemId))
    setDeleteTarget(null)
  }

  async function uploadAdminFile(file: File, item: ChecklistItem) {
    if (!selectedProject) return
    setUploadingItemId(item.id)
    const ext  = file.name.split('.').pop()
    const path = `${selectedProject.id}/${item.id}/admin.${ext}`
    const { error: upErr } = await supabase.storage
      .from('materiais')
      .upload(path, file, { upsert: true })
    if (upErr) { setUploadingItemId(null); return }
    const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('checklist_items').update({ admin_file_url: url }).eq('id', item.id)
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, admin_file_url: url } : i))
    setUploadingItemId(null)
  }

  async function removeAdminFile(item: ChecklistItem) {
    await supabase.from('checklist_items').update({ admin_file_url: null }).eq('id', item.id)
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, admin_file_url: null } : i))
  }

  async function sendReply(itemId: string) {
    if (!replyText.trim()) return
    setReplySaving(true)
    const { error } = await supabase
      .from('checklist_items')
      .update({ admin_question_reply: replyText.trim() })
      .eq('id', itemId)
    if (!error) {
      const wasUnanswered = checklist.find(i => i.id === itemId)?.admin_question_reply == null
      setChecklist(prev => prev.map(i => i.id === itemId ? { ...i, admin_question_reply: replyText.trim() } : i))
      if (wasUnanswered && selectedId) {
        setQuestionCounts(prev => ({ ...prev, [selectedId]: Math.max(0, (prev[selectedId] ?? 1) - 1) }))
      }
      setReplyingTo(null)
      setReplyText('')
    }
    setReplySaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="page-wrap">
      <div className="device" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 5rem)' }}>

        {/* ── CHASSIS PANELS (com madeira) ── */}
        <div className="chassis-body">

        {/* ── PANEL HEADER ── */}
        <div className="panel-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Image src="/logo-light.svg" alt="geōrgia." width={160} height={42} priority style={{ display: 'block' }} />
            <span className="tagline-sub">painel admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <button className="btn-chassis" onClick={handleLogout} style={{ padding: '0.4rem 0.9rem', fontSize: '0.6rem' }}>
              sair
            </button>
          </div>
        </div>

        {/* ── PROJECT SELECTOR ── */}
        <div style={{
          padding: '0.875rem 3.5rem',
          background: 'var(--chassis-2)',
          borderBottom: '1px solid var(--divider)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'nowrap',
          alignItems: 'center',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none' as const,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--text-soft)', textTransform: 'uppercase', flexShrink: 0 }}>
            projeto:
          </span>

          {projects.map(p => (
            <button
              key={p.id}
              className={`tab-btn ${selectedId === p.id ? 'is-active' : ''}`}
              onClick={() => selectProject(p.id)}
              style={{ bottom: 0, borderRadius: '4px', borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {p.name} — {p.profiles?.name ?? '—'}
              {(questionCounts[p.id] ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FFAA00', color: '#000', borderRadius: '999px', fontSize: '0.48rem', fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: '14px', height: '14px', padding: '0 3px' }}>
                  {questionCounts[p.id]}
                </span>
              )}
            </button>
          ))}

          <button
            className="btn-chassis"
            onClick={() => setShowForm(v => !v)}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.6rem', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {showForm ? '✕ cancelar' : '+ novo projeto'}
          </button>
        </div>

        {/* ── NEW PROJECT FORM ── */}
        {showForm && (
          <form onSubmit={createProject} style={{
            padding: '1.25rem 3.5rem',
            background: 'var(--chassis-3)',
            borderBottom: '1px solid var(--divider)',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}>
            <div className="field-group" style={{ flex: 1, minWidth: '160px' }}>
              <label className="field-label login-label" style={{ color: 'var(--text-soft)' }}>nome do projeto</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="field-input"
                placeholder="ex: site institucional"
                required
                style={{ background: '#fff', color: 'var(--text-main)', borderColor: 'rgba(0,0,0,0.15)' }}
              />
            </div>

            <div className="field-group" style={{ flex: 1, minWidth: '160px' }}>
              <label className="field-label login-label" style={{ color: 'var(--text-soft)' }}>cliente</label>
              {clients.length === 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-soft)' }}>
                  nenhum cliente cadastrado
                </span>
              ) : (
                <select
                  value={newClientId}
                  onChange={e => setNewClientId(e.target.value)}
                  required
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    background: '#fff',
                    color: 'var(--text-main)',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '4px',
                    padding: '0.6rem 0.75rem',
                    width: '100%',
                    outline: 'none',
                  }}
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              className="cta-btn"
              disabled={saving || clients.length === 0}
              style={{ marginBottom: '0' }}
            >
              <span className="cta-led" />
              <span className="cta-label">{saving ? 'criando...' : 'criar projeto'}</span>
            </button>
          </form>
        )}

        {/* ── STATUS BAR ── */}
        {selectedProject && (
          <div className="status-bar" style={{ flexWrap: 'wrap' }}>
            {STATUS_STEPS.map((step, i) => (
              <button
                key={step.key}
                className={`status-step ${i < statusIndex ? 'is-done' : ''} ${i === statusIndex ? 'is-active' : ''}`}
                onClick={() => updateStatus(step.key)}
                style={{ cursor: 'pointer', background: 'none', border: 'none', flex: 'none' }}
                title={`definir como "${step.label}"`}
              >
                <span className="status-dot" />
                {step.label}
              </button>
            ))}
          </div>
        )}

        {/* ── TABS ── */}
        {selectedProject && (
          <div className="dash-tabs">
            {(['checklist', 'design system', 'estrutura', 'aprovações'] as const).map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'is-active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
        )}

        </div>{/* fim .chassis-body */}

        {/* ── SCREEN (sem madeira) ── */}
        <div className="screen-interior" style={{ flex: 1 }}>
          <div className="screen-content">
            {loading && <div className="empty-state">carregando...</div>}

            {!loading && !selectedProject && projects.length === 0 && (
              <div className="empty-state">nenhum projeto ainda — crie um acima.</div>
            )}

            {!loading && !selectedProject && projects.length > 0 && (
              <div className="empty-state">selecione um projeto acima.</div>
            )}

            {!loading && selectedProject && activeTab === 'design system' && (
              <DesignSystemTab
                projectId={selectedProject.id}
                initialUrl={selectedProject.design_system_url ?? null}
                isAdmin={true}
                initialComment={selectedProject.design_system_comment ?? null}
                onUrlSaved={url => setProjects(prev => prev.map(p => p.id === selectedId ? { ...p, design_system_url: url } : p))}
              />
            )}

            {!loading && selectedProject && activeTab === 'estrutura' && (
              <EstruturaTab
                projectId={selectedProject.id}
                initialUrl={selectedProject.estrutura_url ?? null}
                isAdmin={true}
                initialComment={selectedProject.estrutura_comment ?? null}
                onUrlSaved={url => setProjects(prev => prev.map(p => p.id === selectedId ? { ...p, estrutura_url: url } : p))}
              />
            )}

            {!loading && selectedProject && activeTab === 'aprovações' && (
              <ApprovalsTab projectId={selectedProject.id} isAdmin={true} />
            )}

            {!loading && selectedProject && activeTab === 'checklist' && (
              <>
                {checklist.length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                      <button className="btn-chassis" onClick={refreshChecklist} disabled={refreshing} style={{ fontSize: '0.6rem', padding: '0.4rem 0.75rem' }} title="atualizar">
                        {refreshing ? '...' : '↻'}
                      </button>
                    </div>
                    {(() => {
                      const done = checklist.filter(i => i.checked_by_client || i.checked_by_admin).length
                      const pct  = Math.round((done / checklist.length) * 100)
                      return (
                        <div style={{ marginBottom: '1.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(8,236,243,0.85)', textTransform: 'uppercase' }}>
                              materiais recebidos
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(240,241,241,0.35)' }}>
                              {done}/{checklist.length}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gradient)', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}

                {checklist.length === 0 && (
                  <div className="empty-state" style={{ marginBottom: '1.5rem' }}>checklist vazio.</div>
                )}

                {categories.map(cat => (
                  <div key={cat} className="checklist-category">
                    <div className="category-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{cat}</span>
                      <button
                        onClick={() => { setAddingTo(addingTo === cat ? null : cat); setAddLabel('') }}
                        style={{ ...iconBtn, color: 'rgba(8,236,243,0.45)', fontSize: '0.85rem' }}
                        title="adicionar item"
                      >
                        +
                      </button>
                    </div>

                    {checklist.filter(i => i.category === cat).map(item => {
                      const isComplete = item.checked_by_client && item.checked_by_admin
                      const isEditing  = editingId === item.id
                      return (
                        <div key={item.id} className={`checklist-item ${isComplete ? 'is-complete' : ''}`}>
                          <div className="check-wrap">
                            <div
                              className={`led-check ${item.checked_by_client ? 'is-checked' : ''}`}
                              title="enviado pelo cliente"
                              style={{ cursor: 'default' }}
                            >
                              {item.checked_by_client && (
                                <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
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
                          </div>

                          <div className="check-label-wrap">
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <input
                                  autoFocus
                                  value={editLabel}
                                  onChange={e => setEditLabel(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                                  style={inlineInput}
                                />
                                <button onClick={saveEdit} style={confirmBtn}>✓</button>
                                <button onClick={() => setEditingId(null)} style={cancelBtn}>✕</button>
                              </div>
                            ) : (
                              <>
                                <div className="check-label">{item.label}</div>
                                <div className="check-owners">
                                  {item.checked_by_client ? 'cliente ✓' : 'cliente pendente'}
                                  {' · '}
                                  {item.checked_by_admin ? 'geōrgia ✓' : 'geōrgia pendente'}
                                </div>
                                {(item.note || item.file_url) && (
                                  <div className="admin-submission">
                                    {item.note && <p className="admin-submission-note">{item.note}</p>}
                                    {item.file_url && (
                                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="admin-submission-file">↗ arquivo do cliente</a>
                                    )}
                                  </div>
                                )}
                                {item.admin_file_url && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                                    <a href={item.admin_file_url} target="_blank" rel="noopener noreferrer" className="admin-submission-file" style={{ color: 'rgba(255,170,0,0.65)' }}>↗ arquivo seu</a>
                                    <button onClick={() => removeAdminFile(item)} style={{ ...iconBtn, fontSize: '0.55rem', padding: '0.1rem 0.2rem' }} title="remover arquivo">×</button>
                                  </div>
                                )}
                                {item.admin_note && (
                                  <div className="admin-sent-note">
                                    <span className="admin-sent-note-label">notificação enviada</span>
                                    <p className="admin-sent-note-text">{item.admin_note}</p>
                                  </div>
                                )}
                                {item.client_question && (
                                  <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: '4px', padding: '0.4rem 0.6rem', marginTop: '0.4rem' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#FFAA00', letterSpacing: '0.15em', textTransform: 'uppercase' }}>dúvida do cliente</span>
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'rgba(240,241,241,0.65)', lineHeight: 1.5, marginTop: '0.2rem' }}>{item.client_question}</p>

                                    {/* resposta */}
                                    {item.admin_question_reply && replyingTo !== item.id ? (
                                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,170,0,0.15)' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,170,0,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>sua resposta</span>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'rgba(240,241,241,0.55)', lineHeight: 1.5, marginTop: '0.2rem' }}>{item.admin_question_reply}</p>
                                        <button onClick={() => { setReplyingTo(item.id); setReplyText(item.admin_question_reply ?? '') }} style={{ ...iconBtn, fontSize: '0.55rem', marginTop: '0.25rem', color: 'rgba(255,170,0,0.4)' }}>editar resposta</button>
                                      </div>
                                    ) : replyingTo === item.id ? (
                                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <input
                                          autoFocus
                                          value={replyText}
                                          onChange={e => setReplyText(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') sendReply(item.id); if (e.key === 'Escape') setReplyingTo(null) }}
                                          placeholder="sua resposta..."
                                          style={{ ...inlineInput, fontSize: '0.68rem', color: 'rgba(240,241,241,0.9)' }}
                                        />
                                        <button onClick={() => sendReply(item.id)} disabled={replySaving || !replyText.trim()} style={confirmBtn}>{replySaving ? '...' : '✓'}</button>
                                        <button onClick={() => setReplyingTo(null)} style={cancelBtn}>✕</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => { setReplyingTo(item.id); setReplyText('') }} style={{ ...iconBtn, fontSize: '0.55rem', marginTop: '0.35rem', color: 'rgba(255,170,0,0.5)' }}>
                                        responder
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.1rem', flexShrink: 0 }}>
                            {item.checked_by_client && !isEditing && (
                              <button className="resubmit-btn" onClick={() => { setNoteItem(item); setNoteText('') }} title="pedir reenvio">↵</button>
                            )}
                            {!isEditing && (
                              <>
                                <button
                                  onClick={() => { pendingUploadItem.current = item; adminFileInputRef.current?.click() }}
                                  disabled={uploadingItemId === item.id}
                                  style={{ ...iconBtn, fontSize: '0.75rem' }}
                                  title="enviar arquivo para o cliente"
                                >
                                  {uploadingItemId === item.id ? '…' : '↓'}
                                </button>
                                <button onClick={() => { setEditingId(item.id); setEditLabel(item.label) }} style={iconBtn} title="editar">✎</button>
                                <button onClick={() => deleteItem(item)} style={iconBtn} title="remover">×</button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {addingTo === cat && (
                      <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 0 0.25rem', alignItems: 'center' }}>
                        <input
                          autoFocus
                          value={addLabel}
                          onChange={e => setAddLabel(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === 'Enter') { await addItem(cat, addLabel); setAddingTo(null); setAddLabel('') }
                            if (e.key === 'Escape') { setAddingTo(null); setAddLabel('') }
                          }}
                          placeholder="label do novo item..."
                          style={inlineInput}
                        />
                        <button onClick={async () => { await addItem(cat, addLabel); setAddingTo(null); setAddLabel('') }} style={confirmBtn}>✓</button>
                        <button onClick={() => { setAddingTo(null); setAddLabel('') }} style={cancelBtn}>✕</button>
                      </div>
                    )}
                  </div>
                ))}

                {/* nova categoria */}
                <div style={{ marginTop: '1rem' }}>
                  {addNewCat ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="categoria"
                        style={{ ...inlineInput, flex: '0 0 140px' }}
                      />
                      <input
                        value={newCatLabel}
                        onChange={e => setNewCatLabel(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter') { await addItem(newCatName, newCatLabel); setAddNewCat(false); setNewCatName(''); setNewCatLabel('') }
                          if (e.key === 'Escape') { setAddNewCat(false) }
                        }}
                        placeholder="primeiro item"
                        style={inlineInput}
                      />
                      <button onClick={async () => { await addItem(newCatName, newCatLabel); setAddNewCat(false); setNewCatName(''); setNewCatLabel('') }} style={confirmBtn}>✓</button>
                      <button onClick={() => { setAddNewCat(false); setNewCatName(''); setNewCatLabel('') }} style={cancelBtn}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddNewCat(true)} style={{ ...iconBtn, color: 'rgba(240,241,241,0.2)', fontSize: '0.58rem', letterSpacing: '0.1em' }}>
                      + nova categoria
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* input oculto para upload admin */}
      <input
        ref={adminFileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f && pendingUploadItem.current) uploadAdminFile(f, pendingUploadItem.current)
          e.target.value = ''
        }}
      />

      {/* ── MODAL CONFIRMAR DELETE ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <span className="modal-title">remover item</span>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(240,241,241,0.65)', lineHeight: 1.7 }}>
                <strong style={{ color: 'rgba(240,241,241,0.9)' }}>"{deleteTarget.label}"</strong> tem material enviado pelo cliente. Remover mesmo assim?
              </p>
              <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                <button className="btn-chassis" onClick={() => setDeleteTarget(null)} style={{ fontSize: '0.62rem', padding: '0.5rem 1rem' }}>cancelar</button>
                <button className="cta-btn" onClick={() => performDelete(deleteTarget.id)}>
                  <span className="cta-led" style={{ background: '#DE0538', boxShadow: '0 0 5px 2px rgba(222,5,56,0.5)', animation: 'none' }} />
                  <span className="cta-label">remover</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PEDIR REENVIO ── */}
      {noteItem && (
        <div className="modal-overlay" onClick={() => setNoteItem(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{noteItem.label}</span>
              <button className="modal-close" onClick={() => setNoteItem(null)}>✕</button>
            </div>
            <form onSubmit={sendNote} className="modal-body">
              <div className="field-group">
                <label className="field-label" style={{ color: 'rgba(8,236,243,0.6)', letterSpacing: '0.2em' }}>
                  mensagem para o cliente
                </label>
                <textarea
                  className="modal-textarea"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="ex: o arquivo está corrompido, por favor reenvie em PNG..."
                  rows={4}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-chassis" onClick={() => setNoteItem(null)} style={{ fontSize: '0.62rem', padding: '0.5rem 1rem' }}>
                  cancelar
                </button>
                <button type="submit" className="cta-btn" disabled={noteSending || !noteText.trim()}>
                  <span className="cta-led" style={{ background: '#DE0538', boxShadow: '0 0 5px 2px rgba(222,5,56,0.5)', animation: 'none' }} />
                  <span className="cta-label">{noteSending ? 'enviando...' : 'pedir reenvio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
