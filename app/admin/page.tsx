import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'
import type { Profile, Project, ChecklistItem } from '@/lib/types'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, profiles(id, name, role, created_at)')
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('name')

  const projectList = (projects ?? []) as (Project & { profiles: Profile })[]
  const clientList  = (clients  ?? []) as Profile[]

  const firstProject = projectList[0] ?? null
  const { data: checklist } = firstProject
    ? await supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', firstProject.id)
        .order('order_index')
    : { data: [] }

  return (
    <AdminClient
      adminProfile={profile as Profile}
      projects={projectList}
      clients={clientList}
      initialProjectId={firstProject?.id ?? null}
      initialChecklist={(checklist ?? []) as ChecklistItem[]}
    />
  )
}
