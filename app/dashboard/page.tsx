import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import type { Profile, Project, ChecklistItem } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: 'monospace', color: '#08ECF3', flexDirection: 'column', gap: '1rem' }}>
        <p>perfil não encontrado</p>
        <p style={{ fontSize: '0.7rem', color: 'rgba(8,236,243,0.4)' }}>user: {user.id}</p>
        <p style={{ fontSize: '0.7rem', color: 'rgba(8,236,243,0.4)' }}>erro: {profileError?.message}</p>
      </main>
    )
  }

  // admin → redirect to /admin
  if (profile.role === 'admin') redirect('/admin')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const checklist: ChecklistItem[] = project
    ? (await supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', project.id)
        .order('order_index')).data ?? []
    : []

  return (
    <DashboardClient
      profile={profile as Profile}
      project={project as Project | null}
      checklist={checklist}
    />
  )
}
