# Como replicar este portal para um novo cliente

Guia completo para criar um portal cliente/admin do zero — ou adaptar este projeto para um novo contexto (área diferente, abas diferentes, fluxo diferente).

---

## Visão geral do que é este projeto

Um portal web com dois painéis:

- **Painel cliente** (`/dashboard`) — o cliente faz login, vê o checklist de materiais, acompanha o andamento, envia arquivos, faz perguntas, comenta sobre entregas
- **Painel admin** (`/admin`) — você gerencia todos os projetos: avança status, edita checklist, responde dúvidas, sobe HTML do design system e estrutura

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

Todo o CSS está em `app/globals.css`. As variáveis de cor ficam no bloco `:root` no início do arquivo. O design vem do site principal da geōrgia — se for um portal com marca diferente, altere:

```css
:root {
  --bg: /* cor de fundo */;
  --chassis: /* cor dos painéis */;
  --wood: /* cor lateral */;
  --teal: /* cor de destaque */;
  --grad-a: /* amarelo */;
  --grad-b: /* vermelho */;
  --grad-c: /* ciano */;
}
```

### 7b. Status do projeto

O fluxo padrão é: `briefing → design → desenvolvimento → revisao → entregue`

Para mudar, edite `lib/types.ts`:

```typescript
export type ProjectStatus = 'briefing' | 'design' | 'desenvolvimento' | 'revisao' | 'entregue'

export const STATUS_STEPS = [
  { key: 'briefing',      label: 'briefing'      },
  { key: 'design',        label: 'design'        },
  { key: 'desenvolvimento', label: 'desenvolvimento' },
  { key: 'revisao',       label: 'revisão'       },
  { key: 'entregue',      label: 'entregue'      },
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

Para remover uma aba que não faz sentido para o contexto do cliente, apague o botão de tab correspondente e o bloco de conteúdo associado no `DashboardClient.tsx`. Faça o mesmo no `AdminClient.tsx` para o painel admin.

Para adicionar uma aba nova, siga o padrão das existentes: botão no header + bloco `{activeTab === 'nome' && (...)}` no corpo.

### 7d. Checklist padrão (quando não há markdown customizado)

Se quiser um checklist padrão diferente para novas instalações, edite `CHECKLIST_DEFAULTS` em `lib/types.ts`. Na prática, para clientes específicos você vai usar o script (veja seção abaixo).

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
3. Rode o script:

```
! node --experimental-strip-types --env-file=.env.local scripts/set-checklist.ts "email@cliente.com" "checklists dos clientes/NomeCliente.md"
```

O script cria o projeto automaticamente se não existir.

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

## Referência rápida de arquivos

| Arquivo | O que controla |
|---|---|
| `lib/types.ts` | Tipos, STATUS_STEPS, CHECKLIST_DEFAULTS |
| `app/globals.css` | Todo o CSS (cores, layout, motif visual) |
| `app/dashboard/DashboardClient.tsx` | Painel do cliente (abas, checklist, modais) |
| `app/admin/AdminClient.tsx` | Painel admin (projetos, edição de checklist, respostas) |
| `app/components/DesignSystemTab.tsx` | Aba genérica de HTML (design system e estrutura) |
| `app/components/ApprovalsTab.tsx` | Aba de aprovações |
| `scripts/set-checklist.ts` | Script CLI para criar checklist por markdown |
| `supabase/migrations/` | Histórico completo do banco |
| `checklists dos clientes/` | Arquivos markdown dos checklists de cada cliente |
