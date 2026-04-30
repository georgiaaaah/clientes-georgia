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
  const [hasError, setHasError] = useState(false)
  const router = useRouter()

  function clearError() {
    if (hasError) { setHasError(false); setError('') }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    setHasError(false)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('[login] auth error:', error.message)
        setError('e-mail ou senha incorretos.')
        setHasError(true)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('[login] exception:', err)
      setError('erro de conexão. tente novamente.')
      setHasError(true)
      setLoading(false)
    }
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
              <label className="field-label login-label">e-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                className="field-input login-input"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field-group">
              <label className="field-label login-label">senha</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError() }}
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
            <button
              type="submit"
              className="cta-btn"
              style={loading ? { pointerEvents: 'none' } : {}}
            >
              <span
                className="cta-led"
                style={hasError ? {
                  background: 'radial-gradient(circle at 35% 35%, #ff7070 0%, #DE0538 45%, #8a0020 100%)',
                  boxShadow: '0 0 5px 2px rgba(222,5,56,0.6), 0 0 10px 3px rgba(222,5,56,0.2), inset 0 -1px 1px rgba(0,0,0,0.4)',
                  animation: 'none',
                } : {}}
              />
              <span className="cta-label">{loading ? 'entrando...' : 'entrar'}</span>
            </button>
          </div>

        </form>

      </div>
    </main>
  )
}
