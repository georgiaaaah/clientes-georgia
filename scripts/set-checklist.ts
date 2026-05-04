/**
 * Substitui o checklist de um cliente por um markdown customizado.
 *
 * Uso:
 *   npx tsx scripts/set-checklist.ts <email-do-cliente> "<caminho/do/arquivo.md>"
 *
 * Formato do markdown:
 *   ## Categoria
 *   - label do item
 *   - outro item
 *
 *   ## Outra Categoria
 *   - item
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// carrega .env.local automaticamente
try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^=\s#][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
} catch {}

const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !svcKey) {
  console.error('❌  Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const [,, email, mdFile] = process.argv
if (!email || !mdFile) {
  console.error('Uso: npx tsx scripts/set-checklist.ts <email> "<arquivo.md>"')
  process.exit(1)
}

function parseTitle(md: string): string {
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('# ')) {
      // "# LUMINA — Checklist de Materiais" → "LUMINA"
      return line.slice(2).split(/[—–-]/)[0].trim()
    }
  }
  return 'Projeto'
}

function parseMarkdown(md: string) {
  const items: { category: string; label: string; order_index: number }[] = []
  let category = ''
  let order = 0

  for (const raw of md.split('\n')) {
    const line = raw.trim()

    if (line.startsWith('## ')) {
      // "## A · Identidade Visual" → "Identidade Visual"
      // "## Textos" → "Textos"
      category = line.slice(3).trim().replace(/^[A-Z]\s*·\s*/, '').trim()
      continue
    }

    // formato rico: - [x] **Label** `anotação` ou - [ ] **Label** · `anotação`
    if ((line.startsWith('- [x]') || line.startsWith('- [ ]') || line.startsWith('- [ ]')) && category) {
      const rest = line.replace(/^-\s*\[[x ]\]\s*/, '')
      const boldMatch = rest.match(/\*\*([^*]+)\*\*/)
      if (boldMatch) {
        items.push({ category, label: boldMatch[1].trim(), order_index: order++ })
      } else {
        const label = rest.split(/·|`/)[0].trim()
        if (label) items.push({ category, label, order_index: order++ })
      }
      continue
    }

    // formato simples: - label
    if (line.startsWith('- ') && category) {
      const label = line.slice(2).trim()
      if (label) items.push({ category, label, order_index: order++ })
    }
  }
  return items
}

const supabase = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const md    = readFileSync(mdFile, 'utf8')
  const items = parseMarkdown(md)

  if (items.length === 0) {
    console.error('❌  Nenhum item encontrado no markdown. Verifique o formato (## Categoria / - item).')
    process.exit(1)
  }

  // encontra usuário pelo email
  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (usersErr) { console.error('❌  Erro ao listar usuários:', usersErr.message); process.exit(1) }

  const user = users.find(u => u.email === email)
  if (!user) { console.error(`❌  Nenhum usuário com email: ${email}`); process.exit(1) }

  // encontra o projeto do cliente
  const { data: projs, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .eq('client_id', user.id)

  if (projErr) {
    console.error(`❌  Erro ao buscar projetos para ${email}:`, projErr.message)
    process.exit(1)
  }

  if (!projs?.length) {
    const projectName = parseTitle(md)
    console.log(`\n📋  Nenhum projeto encontrado. Criando "${projectName}"...`)
    const { data: created, error: createErr } = await supabase
      .from('projects')
      .insert({ name: projectName, client_id: user.id, status: 'briefing' })
      .select('id, name')
      .single()
    if (createErr || !created) {
      console.error('❌  Erro ao criar projeto:', createErr?.message)
      process.exit(1)
    }
    projs.push(created)
    console.log(`   Projeto criado: ${created.id}`)
  }

  if (projs.length > 1) {
    console.error(`❌  Múltiplos projetos para ${email}. Especifique qual:`)
    projs.forEach(p => console.error(`   • ${p.id}  ${p.name}`))
    process.exit(1)
  }

  const project = projs[0]
  console.log(`\n📁  Projeto: ${project.name} (${project.id})`)

  // avisa se há uploads já enviados
  const { data: submitted } = await supabase
    .from('checklist_items')
    .select('label, file_url')
    .eq('project_id', project.id)
    .not('file_url', 'is', null)

  if (submitted?.length) {
    console.warn(`\n⚠️   ${submitted.length} item(s) têm arquivos enviados pelo cliente e serão deletados:`)
    submitted.forEach(i => console.warn(`   • ${i.label}`))
    console.warn('\n   Ctrl+C para cancelar. Continuando em 5s...')
    await new Promise(r => setTimeout(r, 5000))
  }

  // deleta itens existentes
  const { error: delErr } = await supabase
    .from('checklist_items')
    .delete()
    .eq('project_id', project.id)

  if (delErr) { console.error('❌  Erro ao deletar itens:', delErr.message); process.exit(1) }

  // insere novos itens
  const { error: insErr } = await supabase
    .from('checklist_items')
    .insert(items.map(i => ({ ...i, project_id: project.id })))

  if (insErr) { console.error('❌  Erro ao inserir itens:', insErr.message); process.exit(1) }

  console.log(`\n✅  ${items.length} itens definidos para ${email}.\n`)
  const cats = [...new Set(items.map(i => i.category))]
  cats.forEach(cat => {
    console.log(`   ${cat}`)
    items.filter(i => i.category === cat).forEach(i => console.log(`     - ${i.label}`))
  })
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
