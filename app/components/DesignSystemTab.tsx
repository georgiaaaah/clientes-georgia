'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DesignSystemData, DesignSystemColor } from '@/lib/types'
import { DESIGN_SYSTEM_EMPTY } from '@/lib/types'

interface Props {
  projectId: string
  initial: DesignSystemData
  isAdmin: boolean
}

function isValidHex(h: string) { return /^#[0-9A-Fa-f]{6}$/.test(h) }

export function DesignSystemTab({ projectId, initial, isAdmin }: Props) {
  const [ds, setDs]       = useState<DesignSystemData>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    await supabase.from('projects').update({ design_system: ds }).eq('id', projectId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function setTypo(field: keyof typeof ds.typography, val: string) {
    setDs(d => ({ ...d, typography: { ...d.typography, [field]: val } }))
  }

  function setColor(i: number, field: keyof DesignSystemColor, val: string) {
    setDs(d => {
      const colors = [...d.colors]
      colors[i] = { ...colors[i], [field]: val }
      return { ...d, colors }
    })
  }

  function addColor() {
    setDs(d => ({ ...d, colors: [...d.colors, { name: '', hex: '#000000' }] }))
  }

  function removeColor(i: number) {
    setDs(d => ({ ...d, colors: d.colors.filter((_, idx) => idx !== i) }))
  }

  const isEmpty = !ds.typography.primary && !ds.typography.secondary && ds.colors.every(c => !c.name)

  /* ── CLIENT VIEW ── */
  if (!isAdmin) {
    if (isEmpty) return (
      <div className="empty-state">design system será publicado aqui em breve.</div>
    )
    return <DesignSystemView ds={ds} />
  }

  /* ── ADMIN EDITOR ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* TIPOGRAFIA */}
      <section className="ds-section">
        <div className="ds-section-label">tipografia</div>
        <div className="ds-grid">
          <div className="field-group">
            <label className="ds-field-label">fonte primária</label>
            <input className="ds-input" value={ds.typography.primary} onChange={e => setTypo('primary', e.target.value)} placeholder="ex: Epilogue" />
          </div>
          <div className="field-group">
            <label className="ds-field-label">fonte secundária</label>
            <input className="ds-input" value={ds.typography.secondary} onChange={e => setTypo('secondary', e.target.value)} placeholder="ex: IBM Plex Mono" />
          </div>
          <div className="field-group" style={{ gridColumn: '1 / -1' }}>
            <label className="ds-field-label">escala de tamanhos</label>
            <input className="ds-input" value={ds.typography.scale} onChange={e => setTypo('scale', e.target.value)} placeholder="ex: 12 / 14 / 16 / 20 / 24 / 32 / 48px" />
          </div>
        </div>
      </section>

      {/* CORES */}
      <section className="ds-section">
        <div className="ds-section-label">cores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {ds.colors.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="color"
                value={isValidHex(c.hex) ? c.hex : '#000000'}
                onChange={e => setColor(i, 'hex', e.target.value)}
                style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none', padding: 0 }}
              />
              <input className="ds-input" value={c.hex} onChange={e => setColor(i, 'hex', e.target.value)} placeholder="#000000" style={{ width: '100px', flexShrink: 0 }} />
              <input className="ds-input" value={c.name} onChange={e => setColor(i, 'name', e.target.value)} placeholder="ex: primária" style={{ flex: 1 }} />
              {ds.colors.length > 1 && (
                <button onClick={() => removeColor(i)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(240,241,241,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.25rem' }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addColor} className="ds-add-btn">+ adicionar cor</button>
        </div>
      </section>

      {/* ESPAÇAMENTO */}
      <section className="ds-section">
        <div className="ds-section-label">espaçamento</div>
        <input className="ds-input" value={ds.spacing} onChange={e => setDs(d => ({ ...d, spacing: e.target.value }))} placeholder="ex: base 4px — 4 / 8 / 16 / 24 / 32 / 48 / 64px" />
      </section>

      {/* NOTAS */}
      <section className="ds-section">
        <div className="ds-section-label">notas</div>
        <textarea
          className="ds-textarea"
          value={ds.notes}
          onChange={e => setDs(d => ({ ...d, notes: e.target.value }))}
          placeholder="observações gerais sobre o design system..."
          rows={4}
        />
      </section>

      {/* SAVE */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="cta-btn" onClick={save} disabled={saving}>
          <span className="cta-led" style={saved ? { background: 'radial-gradient(circle at 35% 35%, #7ff8ff, #08ECF3 45%, #046a6e)', boxShadow: '0 0 6px 2px rgba(8,236,243,0.5)' } : {}} />
          <span className="cta-label">{saving ? 'salvando...' : saved ? 'salvo ✓' : 'salvar'}</span>
        </button>
      </div>

    </div>
  )
}

/* ── READ-ONLY VIEW (client + admin preview) ── */
function DesignSystemView({ ds }: { ds: DesignSystemData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {(ds.typography.primary || ds.typography.secondary) && (
        <section className="ds-section">
          <div className="ds-section-label">tipografia</div>
          <div className="ds-grid">
            {ds.typography.primary && (
              <div className="ds-view-block">
                <span className="ds-view-sublabel">primária</span>
                <span className="ds-view-value" style={{ fontFamily: ds.typography.primary }}>{ds.typography.primary}</span>
                <span className="ds-view-specimen" style={{ fontFamily: ds.typography.primary }}>Aa Bb Cc 123</span>
              </div>
            )}
            {ds.typography.secondary && (
              <div className="ds-view-block">
                <span className="ds-view-sublabel">secundária</span>
                <span className="ds-view-value" style={{ fontFamily: ds.typography.secondary }}>{ds.typography.secondary}</span>
                <span className="ds-view-specimen" style={{ fontFamily: ds.typography.secondary }}>Aa Bb Cc 123</span>
              </div>
            )}
            {ds.typography.scale && (
              <div className="ds-view-block" style={{ gridColumn: '1 / -1' }}>
                <span className="ds-view-sublabel">escala</span>
                <span className="ds-view-value">{ds.typography.scale}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {ds.colors.some(c => c.name || c.hex) && (
        <section className="ds-section">
          <div className="ds-section-label">cores</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {ds.colors.filter(c => c.name || isValidHex(c.hex)).map((c, i) => (
              <div key={i} className="ds-color-chip">
                <div className="ds-color-swatch" style={{ background: isValidHex(c.hex) ? c.hex : '#333' }} />
                <span className="ds-color-hex">{c.hex}</span>
                <span className="ds-color-name">{c.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ds.spacing && (
        <section className="ds-section">
          <div className="ds-section-label">espaçamento</div>
          <span className="ds-view-value">{ds.spacing}</span>
        </section>
      )}

      {ds.notes && (
        <section className="ds-section">
          <div className="ds-section-label">notas</div>
          <p className="ds-notes">{ds.notes}</p>
        </section>
      )}

    </div>
  )
}
