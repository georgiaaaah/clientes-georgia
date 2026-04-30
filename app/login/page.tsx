'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
        <div className="panel-header" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="logo-text">geōrgia.</span>
          <span className="tagline-sub">área do cliente</span>
        </div>

        {/* screen */}
        <div className="screen-interior">
          <div className="screen-content">
            <form onSubmit={handleLogin} className="login-form">
              <div className="field-group">
                <label className="field-label">e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="field-input"
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field-group">
                <label className="field-label">senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="field-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="field-error">{error}</p>}

              <button
                type="submit"
                className="btn-chassis btn-chassis--teal"
                disabled={loading}
              >
                {loading ? 'entrando...' : 'entrar'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </main>
  )
}
