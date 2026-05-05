# Como replicar este portal para um novo cliente

Guia completo para criar um portal cliente/admin do zero — ou adaptar este projeto para um novo contexto (área diferente, abas diferentes, fluxo diferente).

---

## Visão geral do que é este projeto

Um portal web com dois painéis:

- **Painel cliente** (`/dashboard`) — o cliente faz login, vê o checklist de materiais, acompanha o andamento, envia arquivos, faz perguntas por item, comenta sobre entregas, aprova entregáveis
- **Painel admin** (`/admin`) — você gerencia todos os projetos: avança status, edita checklist, responde dúvidas, envia arquivos ao cliente, sobe HTML do design system e estrutura

**Stack:** Next.js (App Router) + Supabase (banco, auth, storage) + Tailwind v4 — hospedado na Vercel.

---

## Pré-requisitos

| O que | Onde criar |
|---|---|
| Conta Supabase | supabase.com |
| Conta Vercel | vercel.com |
| Node.js ≥ 20 | nodejs.org |
| Supabase CLI | `npm i -g supabase` |

---

## Passo 1 — Copiar o projeto

```bash
# Opção A: clonar este repo e criar um novo origin
git clone <url-deste-repo> nome-do-novo-portal
cd nome-do-novo-portal
git remote set-url origin <url-do-novo-repo>

# Opção B: copiar só os arquivos (sem histórico git)
# Copie a pasta inteira, delete .git/, rode git init novamente
```

---

## Passo 2 — Criar o projeto no Supabase

1. Acesse supabase.com → New project
2. Anote: **Project URL** e **anon key** (em Settings → API)
3. Anote também a **service role key** (mesma página — usada só no `.env.local`, nunca no front)

---

## Passo 3 — Configurar variáveis de ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Passo 4 — Rodar as migrações no Supabase

```bash
supabase login
supabase link --project-ref <ref-do-projeto>   # ref = parte do URL (xxxx.supabase.co → xxxx)
supabase db push
```

Isso cria todas as tabelas, políticas RLS e o trigger de auto-criação de perfil.

**Migrações existentes (em ordem):**

| Arquivo | O que faz |
|---|---|
| `001_initial.sql` | Tabelas `profiles`, `projects`, `checklist_items`; RLS; trigger de perfil automático |
| `002_project_html_urls.sql` | Colunas `design_system_url` e `estrutura_url` em `projects` |
| `003_project_comments.sql` | Colunas `design_system_comment`, `estrutura_comment` em `projects` |
| `004_checklist_item_question.sql` | Coluna `client_question` em `checklist_items` |
| `005_question_reply.sql` | Coluna `admin_question_reply` em `checklist_items` |
| `006_admin_file_url.sql` | Coluna `admin_file_url` em `checklist_items` |

Se alguma migração falhar por "já existe", marque como aplicada:
```bash
supabase migration repair <numero> --status applied
supabase db push
```

---

## Passo 5 — Criar o bucket de storage

No painel Supabase → Storage → New bucket:
- Nome: `materiais`
- Public: **sim**

**Convenção de paths no bucket:**

| Tipo de upload | Path |
|---|---|
| Arquivo enviado pelo cliente | `${projectId}/${itemId}/${timestamp}.${ext}` |
| Arquivo enviado pelo admin | `${projectId}/${itemId}/admin.${ext}` |
| HTML do design system | `${projectId}/design-system.html` |
| HTML da estrutura | `${projectId}/estrutura.html` |

---

## Passo 6 — Criar o usuário admin

1. No painel Supabase → Authentication → Users → Add user
2. E-mail e senha da sua conta admin
3. Depois, no SQL Editor, troque o role manualmente:

```sql
update profiles set role = 'admin' where id = '<seu-uuid>';
```

O UUID aparece na lista de usuários do Supabase.

---

## Passo 7 — Personalizar o portal

### 7a. Identidade visual

Todo o CSS está em `app/globals.css`. As variáveis de cor ficam no bloco `:root` no início do arquivo. O design atual vem do site principal da geōrgia — se for um portal com marca diferente, altere:

```css
:root {
  --bg:      /* cor de fundo da página */;
  --chassis: /* cor dos painéis (chassi) */;
  --wood:    /* cor das faixas laterais */;
  --wood-w:  /* largura das faixas laterais (padrão: 28px) */;
  --teal:    /* cor de destaque (ciano) */;
  --grad-a:  /* amarelo do gradiente */;
  --grad-b:  /* vermelho do gradiente */;
  --grad-c:  /* ciano do gradiente */;
}
```

As faixas laterais (`--wood`) descem pela altura total do dispositivo (chassi + tela escura), recortadas pelo `border-radius` do `.device`. A largura é controlada por `--wood-w`.

### 7b. Status do projeto

O fluxo padrão é: `briefing → design → desenvolvimento → revisao → entregue`

Para mudar, edite `lib/types.ts`:

```typescript
export type ProjectStatus = 'briefing' | 'design' | 'desenvolvimento' | 'revisao' | 'entregue'

export const STATUS_STEPS = [
  { key: 'briefing',        label: 'briefing'        },
  { key: 'design',          label: 'design'          },
  { key: 'desenvolvimento', label: 'desenvolvimento' },
  { key: 'revisao',         label: 'revisão'         },
  { key: 'entregue',        label: 'entregue'        },
]
```

E atualize também o `check` constraint no banco (nova migração SQL):
```sql
alter table projects drop constraint projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('etapa1', 'etapa2', 'etapa3'));
```

### 7c. Abas do painel cliente

As abas ficam em `app/dashboard/DashboardClient.tsx`. As abas atuais são:

| Aba | O que faz |
|---|---|
| `materiais` | Checklist de arquivos que o cliente deve enviar |
| `design system` | Admin sobe HTML do design system; cliente comenta |
| `estrutura` | Admin sobe HTML da estrutura; cliente comenta |
| `aprovações` | Cliente aprova ou pede ajustes nos entregáveis |

Para remover uma aba que não faz sentido para o contexto do cliente, apague o botão de tab correspondente e o bloco de conteúdo associado no `DashboardClient.tsx`. Faça o mesmo no `AdminClient.tsx`.

Para adicionar uma aba nova, siga o padrão das existentes: botão no header + bloco `{activeTab === 'nome' && (...)}` no corpo.

### 7d. Checklist padrão (quando não há markdown customizado)

Se quiser um checklist padrão diferente para novas instalações, edite `CHECKLIST_DEFAULTS` em `lib/types.ts`. Na prática, para clientes específicos você vai usar o script (veja seção abaixo).

### 7e. Texto de ajuda do cliente

O modal `?` no painel do cliente (botão ao lado de "sair") contém instruções estáticas sobre como usar o portal. Se mudar abas ou fluxo, atualize o texto em `DashboardClient.tsx` na função que renderiza o modal com `helpOpen`.

---

## Passo 8 — Deploy na Vercel

```bash
# instale Vercel CLI se não tiver
npm i -g vercel

vercel
# siga o wizard: link ao projeto Vercel, confirme framework Next.js

# adicione as env vars no painel Vercel ou via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# deploy de produção
vercel --prod
```

A cada `git push` para `main`, a Vercel faz deploy automático se o projeto estiver linkado.

---

## Passo 9 — Criar cliente e checklist personalizado

Veja o arquivo `checklists dos clientes/COMO-USAR.md` para o passo a passo completo.

Resumo:
1. Crie o usuário cliente no Supabase → Authentication
2. Escreva o checklist em markdown (formato `## Categoria / - item`)
3. Rode o script no Claude Code:

```
! node --experimental-strip-types --env-file=.env.local scripts/set-checklist.ts "email@cliente.com" "checklists dos clientes/NomeCliente.md"
```

O script cria o projeto automaticamente se não existir.

---

## Fluxo de comunicação dentro do portal

Entender o fluxo de troca de informações ajuda a decidir o que adaptar num novo contexto:

```
Cliente                          Admin (você)
──────                           ────────────
↑ envia arquivo ou texto         vê o arquivo + nota
? faz pergunta por item          vê badge amarelo no seletor de projetos
                                 ↓ responde a pergunta (inline)
vê resposta na caixa amarela
                                 ↓ envia arquivo ao cliente (botão ↓)
vê "↗ arquivo de geōrgia"
                                 ↵ pede reenvio com nota
vê notificação amarela ⚠
↑ reenvia material
                                 ✓ confirma recebimento (LED azul acende)
vê LED azul aceso (confirmado)
comenta no design system/estrutura
                                 vê observação do cliente
aprova ou solicita ajuste        vê resposta do cliente
```

---

## O que muda por tipo de cliente

| Contexto | O que adaptar |
|---|---|
| E-commerce | Abas podem virar "identidade", "fotografia", "copy de produto", "loja" |
| Branding puro | Remover abas "estrutura" e "aprovações", focar em "materiais" e "design system" |
| Site institucional | Padrão atual — funciona bem como está |
| Aplicativo | Adicionar aba "fluxo" para upload de wireframes; status pode incluir "prototipação" |
| Campanha | Status mais curto: `briefing → criação → revisao → entregue` |

A regra é: abas e status são só texto e condicionais no código — mudam em menos de 1h com Claude Code.

---

## Resolução de problemas comuns

**Migração falha com "already exists"**
```bash
supabase migration repair <numero> --status applied
supabase db push
```

**Script `set-checklist.ts` não executa**
Use `node --experimental-strip-types` (não `npx tsx`, que pode não estar instalado):
```
! node --experimental-strip-types --env-file=.env.local scripts/set-checklist.ts ...
```

**Mudanças não aparecem na Vercel**
Verifique se o commit foi feito e empurrado: `git push`. A Vercel só deploya após o push — alterações locais não sobem automaticamente.

**Usuário não consegue fazer login**
Confirme que o perfil existe na tabela `profiles`. Se não existir (erro no trigger), insira manualmente:
```sql
insert into profiles (id, name, role)
values ('<uuid-do-usuario>', 'Nome', 'client');
```

---

## Referência rápida de arquivos

| Arquivo | O que controla |
|---|---|
| `lib/types.ts` | Tipos, STATUS_STEPS, CHECKLIST_DEFAULTS |
| `app/globals.css` | Todo o CSS (cores, layout, motif visual, mobile) |
| `app/dashboard/DashboardClient.tsx` | Painel do cliente (abas, checklist, modais, ajuda) |
| `app/admin/AdminClient.tsx` | Painel admin (projetos, checklist, badges, respostas) |
| `app/components/DesignSystemTab.tsx` | Aba genérica de HTML (design system e estrutura) |
| `app/components/ApprovalsTab.tsx` | Aba de aprovações |
| `scripts/set-checklist.ts` | Script CLI para criar checklist por markdown |
| `supabase/migrations/` | Histórico completo do banco (001 a 006) |
| `checklists dos clientes/` | Arquivos markdown dos checklists de cada cliente |
| `COMO-USAR.md` (em `checklists dos clientes/`) | Passo a passo para onboarding de novo cliente |
