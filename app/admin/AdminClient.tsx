'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, ChecklistItem } from '@/lib/types'
import { STATUS_STEPS } from '@/lib/types'

interface Props {
  adminProfile: Profile
  projects: (Project & { profiles: Profile })[]
  initialProjectId: string | null
  initialChecklist: ChecklistItem[]
}

export function AdminClient({ adminProfile, projects, initialProjectId, initialChecklist }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId)
  const [checklist, setChecklist]   = useState<ChecklistItem[]>(initialChecklist)
  const [loading, setLoading]       = useState(false)
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
      await supabase
        .from('checklist_items')
        .update({ checked_by_admin: next })
        .eq('id', item.id)
    })
  }

  async function updateStatus(status: string) {
    if (!selectedProject) return
    await supabase.from('projects').update({ status }).eq('id', selectedProject.id)
    router.refresh()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="page-wrap">
      <div className="device">

        {/* ── PANEL HEADER ── */}
        <div className="panel-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span className="logo-text">geōrgia.</span>
            <span className="tagline-sub">painel admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <span className="admin-badge">admin</span>
            <button className="btn-chassis" onClick={handleLogout} style={{ padding: '0.4rem 0.9rem', fontSize: '0.6rem' }}>
              sair
            </button>
          </div>
        </div>

        {/* ── CLIENT SELECTOR ── */}
        <div style={{
          padding: '1rem 3.5rem',
          background: 'var(--chassis-2)',
          borderBottom: '1px solid var(--divider)',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.58rem',
            letterSpacing: '0.2em',
            color: 'var(--text-soft)',
            textTransform: 'uppercase',
            marginRight: '0.5rem',
          }}>
            projeto:
          </span>
          {projects.length === 0 ? (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: 'var(--text-soft)' }}>
              nenhum projeto cadastrado
            </span>
          ) : projects.map(p => (
            <button
              key={p.id}
              className={`tab-btn ${selectedId === p.id ? 'is-active' : ''}`}
              onClick={() => selectProject(p.id)}
              style={{ bottom: 0, borderRadius: '4px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
            >
              {p.name} — {p.profiles?.name ?? '—'}
            </button>
          ))}
        </div>

        {/* ── STATUS BAR ── */}
        {selectedProject && (
          <div className="status-bar" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
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

        {/* ── SCREEN ── */}
        <div className="screen-interior">
          <div className="screen-content">
            {loading && (
              <div className="empty-state">carregando...</div>
            )}

            {!loading && !selectedProject && (
              <div className="empty-state">selecione um projeto acima.</div>
            )}

            {!loading && selectedProject && checklist.length === 0 && (
              <div className="empty-state">checklist vazio.</div>
            )}

            {!loading && selectedProject && checklist.length > 0 && (
              <>
                {/* progress */}
                {(() => {
                  const done = checklist.filter(i => i.checked_by_client || i.checked_by_admin).length
                  const pct  = Math.round((done / checklist.length) * 100)
                  return (
                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(8,236,243,0.4)', textTransform: 'uppercase' }}>
                          materiais recebidos
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: 'rgba(240,241,241,0.35)' }}>
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
                            {/* client status (read-only for admin) */}
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

                            {/* admin check */}
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
                          </div>

                          {item.note && (
                            <span className="check-note" title={item.note}>{item.note}</span>
                          )}
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
