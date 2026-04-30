import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import type { Profile, Project, ChecklistItem } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

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
