'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Project, ChecklistItem } from '@/lib/types'
import { STATUS_STEPS } from '@/lib/types'

type Tab = 'materiais' | 'design' | 'estrutura' | 'aprovacoes'

interface Props {
  profile: Profile
  project: Project | null
  checklist: ChecklistItem[]
}

export function DashboardClient({ profile, project, checklist: initial }: Props) {
  const [activeTab, setActiveTab]   = useState<Tab>('materiais')
  const [items, setItems]           = useState<ChecklistItem[]>(initial)
  const [, startTransition]         = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function toggleClient(item: ChecklistItem) {
    const next = !item.checked_by_client
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked_by_client: next } : i))
    startTransition(async () => {
      await supabase
        .from('checklist_items')
        .update({ checked_by_client: next })
        .eq('id', item.id)
    })
  }

  async function toggleAdmin(item: ChecklistItem) {
    const next = !item.checked_by_admin
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked_by_admin: next } : i))
    startTransition(async () => {
      await supabase
        .from('checklist_items')
        .update({ checked_by_admin: next })
        .eq('id', item.id)
    })
  }

  const statusIndex = project
    ? STATUS_STEPS.findIndex(s => s.key === project.status)
    : -1

  const categories = Array.from(new Set(items.map(i => i.category)))

  const totalItems    = items.length
  const doneItems     = items.filter(i => i.checked_by_client || i.checked_by_admin).length
  const progressPct   = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <main className="page-wrap">
      <div className="device">

        {/* ── PANEL HEADER ── */}
        <div className="panel-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Image src="/logo-light.svg" alt="geōrgia." width={160} height={42} priority style={{ display: 'block' }} />
            <span className="tagline-sub">
              {project ? project.name : 'área do cliente'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.65rem',
              fontWeight: 300,
              letterSpacing: '0.08em',
              color: 'var(--text-soft)',
            }}>
              {profile.name}
            </span>
            {isAdmin && <span className="admin-badge">admin</span>}
            <button className="btn-chassis" onClick={handleLogout} style={{ padding: '0.4rem 0.9rem', fontSize: '0.6rem' }}>
              sair
            </button>
          </div>
        </div>

        {/* ── STATUS BAR ── */}
        {project && (
          <div className="status-bar">
            {STATUS_STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`status-step ${i < statusIndex ? 'is-done' : ''} ${i === statusIndex ? 'is-active' : ''}`}
              >
                <span className="status-dot" />
                {step.label}
              </div>
            ))}
          </div>
        )}

        {/* ── TABS ── */}
        <div className="dash-tabs">
          {(['materiais', 'design', 'estrutura', 'aprovacoes'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'aprovacoes' ? 'aprovações' : tab}
            </button>
          ))}
        </div>

        {/* ── SCREEN ── */}
        <div className="screen-interior">
          <div className="screen-content">

            {/* MATERIAIS TAB */}
            {activeTab === 'materiais' && (
              <>
                {!project ? (
                  <div className="empty-state">
                    nenhum projeto ativo ainda.
                  </div>
                ) : items.length === 0 ? (
                  <div className="empty-state">
                    checklist vazio — aguarde geōrgia configurar os itens.
                  </div>
                ) : (
                  <>
                    {/* progress */}
                    <div style={{ marginBottom: '1.75rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                      }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.58rem',
                          letterSpacing: '0.2em',
                          color: 'rgba(8,236,243,0.4)',
                          textTransform: 'uppercase',
                        }}>
                          progresso
                        </span>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.62rem',
                          color: 'rgba(240,241,241,0.35)',
                        }}>
                          {doneItems}/{totalItems}
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '2px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '1px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: 'var(--gradient)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>

                    {/* checklist by category */}
                    {categories.map(cat => (
                      <div key={cat} className="checklist-category">
                        <div className="category-label">{cat}</div>
                        {items.filter(i => i.category === cat).map(item => {
                          const isComplete = item.checked_by_client && item.checked_by_admin
                          return (
                            <div
                              key={item.id}
                              className={`checklist-item ${isComplete ? 'is-complete' : ''}`}
                            >
                              <div className="check-wrap">
                                {/* client check */}
                                <button
                                  className={`led-check ${item.checked_by_client ? 'is-checked' : ''}`}
                                  onClick={() => toggleClient(item)}
                                  title="marcar como enviado (cliente)"
                                >
                                  {item.checked_by_client && (
                                    <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                      <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </button>

                                {/* admin check */}
                                {isAdmin && (
                                  <button
                                    className={`led-check is-admin ${item.checked_by_admin ? 'is-checked' : ''}`}
                                    onClick={() => toggleAdmin(item)}
                                    title="confirmar recebimento (geōrgia)"
                                  >
                                    {item.checked_by_admin && (
                                      <svg className="check-icon" viewBox="0 0 8 8" fill="none">
                                        <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>

                              <div className="check-label-wrap">
                                <div className="check-label">{item.label}</div>
                                {!isAdmin && (
                                  <div className="check-owners">
                                    {item.checked_by_client ? 'enviado por você' : ''}
                                    {item.checked_by_client && item.checked_by_admin ? ' · ' : ''}
                                    {item.checked_by_admin ? 'confirmado por geōrgia' : ''}
                                  </div>
                                )}
                              </div>

                              {item.note && (
                                <span className="check-note" title={item.note}>
                                  {item.note}
                                </span>
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

            {/* DESIGN SYSTEM TAB */}
            {activeTab === 'design' && (
              <div className="empty-state">
                design system será publicado aqui após aprovação do layout.
              </div>
            )}

            {/* ESTRUTURA TAB */}
            {activeTab === 'estrutura' && (
              <div className="empty-state">
                estrutura do site será publicada após o briefing.
              </div>
            )}

            {/* APROVAÇÕES TAB */}
            {activeTab === 'aprovacoes' && (
              <div className="empty-state">
                etapas de aprovação aparecerão conforme o projeto avança.
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
