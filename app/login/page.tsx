'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('e-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="page-wrap">
      <div className="device device--sm">

        {/* header */}
        <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.75rem 3.5rem' }}>
          <Image
            src="/logo-light.svg"
            alt="geōrgia."
            width={200}
            height={52}
            priority
            style={{ display: 'block' }}
          />
          <div className="sticker">
            <div className="sticker-body">
              <span className="sticker-title">área do cliente</span>
            </div>
          </div>
        </div>

        {/* form — envolve os dois painéis para o submit funcionar corretamente */}
        <form onSubmit={handleLogin}>

          {/* painel de campos — chassi claro, inputs com visual escuro embutido */}
          <div style={{
            padding: '1.75rem 3.5rem',
            background: 'var(--chassis-2)',
            borderTop: '1px solid var(--divider)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div className="field-group">
              <label className="field-label" style={{ color: 'var(--text-soft)' }}>e-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input login-input"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field-group">
              <label className="field-label" style={{ color: 'var(--text-soft)' }}>senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field-input login-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="field-error">{error}</p>}
          </div>

          {/* CTA panel — entalhe + botão igual ao "iniciar projeto" */}
          <div className="login-cta">
            <button type="submit" className="cta-btn" disabled={loading}>
              <span className="cta-led" />
              <span className="cta-label">{loading ? 'entrando...' : 'entrar'}</span>
            </button>
          </div>

        </form>

      </div>
    </main>
  )
}
