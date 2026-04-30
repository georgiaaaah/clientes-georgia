'use client'

import { useState, useTransition } from 'react'
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

export function AdminClient({ adminProfile, projects: initialProjects, clients, initialProjectId, initialChecklist }: Props) {
  const [projects, setProjects]     = useState(initialProjects)
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId)
  const [checklist, setChecklist]   = useState<ChecklistItem[]>(initialChecklist)
  const [activeTab, setActiveTab]   = useState<'checklist' | 'design system' | 'estrutura' | 'aprovações'>('checklist')
  const [loading, setLoading]       = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newClientId, setNewClientId] = useState(clients[0]?.id ?? '')
  const [saving, setSaving]         = useState(false)
  const [, startTransition]         = useTransition()
  const router   = useRouter()
  const supabase = createClient()

  const selectedProject = projects.find(p => p.id === selectedId) ?? null
  const statusIndex = selectedProject
    ? STATUS_STEPS.findIndex(s => s.key === selectedProject.status)
    : -1
  const categories = Array.from(new Set(checklist.map(i => i.category)))

  async function selectProject(id: string) {
    setLoading(true)
    setSelectedId(id)
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="page-wrap">
      <div className="device" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 5rem)' }}>

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
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'var(--text-soft)', textTransform: 'uppercase', marginRight: '0.25rem' }}>
            projeto:
          </span>

          {projects.map(p => (
            <button
              key={p.id}
              className={`tab-btn ${selectedId === p.id ? 'is-active' : ''}`}
              onClick={() => selectProject(p.id)}
              style={{ bottom: 0, borderRadius: '4px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            >
              {p.name} — {p.profiles?.name ?? '—'}
            </button>
          ))}

          <button
            className="btn-chassis"
            onClick={() => setShowForm(v => !v)}
            style={{ padding: '0.35rem 0.8rem', fontSize: '0.6rem', marginLeft: 'auto' }}
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

        {/* ── SCREEN ── */}
        <div className="screen-interior" style={{ flex: 1 }}>
          <div className="screen-content">
            {loading && <div className="empty-state">carregando...</div>}

            {!loading && !selectedProject && projects.length === 0 && (
              <div className="empty-state">
                nenhum projeto ainda — crie um acima.
              </div>
            )}

            {!loading && !selectedProject && projects.length > 0 && (
              <div className="empty-state">selecione um projeto acima.</div>
            )}

            {!loading && selectedProject && activeTab === 'design system' && (
              <DesignSystemTab
                projectId={selectedProject.id}
                initialUrl={(selectedProject as any).design_system_url ?? null}
                isAdmin={true}
              />
            )}

            {!loading && selectedProject && activeTab === 'estrutura' && (
              <EstruturaTab
                projectId={selectedProject.id}
                initialUrl={(selectedProject as any).estrutura_url ?? null}
                isAdmin={true}
              />
            )}

            {!loading && selectedProject && activeTab === 'aprovações' && (
              <ApprovalsTab projectId={selectedProject.id} isAdmin={true} />
            )}

            {!loading && selectedProject && activeTab === 'checklist' && checklist.length === 0 && (
              <div className="empty-state">checklist vazio.</div>
            )}

            {!loading && selectedProject && activeTab === 'checklist' && checklist.length > 0 && (
              <>
                {(() => {
                  const done = checklist.filter(i => i.checked_by_client || i.checked_by_admin).length
                  const pct  = Math.round((done / checklist.length) * 100)
                  return (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(8,236,243,0.4)', textTransform: 'uppercase' }}>
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

                {categories.map(cat => (
                  <div key={cat} className="checklist-category">
                    <div className="category-label">{cat}</div>
                    {checklist.filter(i => i.category === cat).map(item => {
                      const isComplete = item.checked_by_client && item.checked_by_admin
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
                            <div className="check-label">{item.label}</div>
                            <div className="check-owners">
                              {item.checked_by_client ? 'cliente ✓' : 'cliente pendente'}
                              {' · '}
                              {item.checked_by_admin ? 'geōrgia ✓' : 'geōrgia pendente'}
                            </div>
                            {/* conteúdo enviado pelo cliente */}
                            {(item.note || item.file_url) && (
                              <div className="admin-submission">
                                {item.note && (
                                  <p className="admin-submission-note">{item.note}</p>
                                )}
                                {item.file_url && (
                                  <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="admin-submission-file">
                                    ↗ arquivo enviado
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
