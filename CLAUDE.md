# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (v9 flat config)
```

No test suite configured.

## Architecture

**Client portal for a design agency.** Two distinct interfaces: a client-facing dashboard and an admin panel, both backed by Supabase (PostgreSQL + Auth + Storage).

### Role-Based Access

- `client` — sees only their project; can upload materials, check off items, comment on approvals
- `admin` — sees all projects; manages checklists, advances project status, requests resubmissions

Role is stored in the `profiles` table and set by a Postgres trigger on `auth.users` insert (defaults to `client`). Auth uses Supabase SSR cookies — server components call `lib/supabase/server.ts`, client components call `lib/supabase/client.ts`.

Route protection is done at the server component level (`page.tsx` calls `getUser()` and redirects to `/login` if unauthenticated). Admins hitting `/dashboard` are redirected to `/admin`; clients hitting `/admin` see an error page with debug info.

### Data Model

- **profiles** — extends `auth.users`; has `name` and `role`
- **projects** — belongs to a client profile; has a `status` enum (`briefing → design → desenvolvimento → revisao → entregue`) and optional HTML URL fields (`design_system_url`, `estrutura_url`)
- **checklist_items** — belongs to a project; has `checked_by_client`, `checked_by_admin`, `note` (client upload note), `admin_note` (sent back to client as notification), `file_url` (Supabase storage URL)
- **approvals** — belongs to a project; tracks deliverable sign-offs with `status` (`pendente | aprovado | ajuste`) and `client_comment`

RLS is enabled on all tables — clients see only their own data; admins see everything. No manual permission checks are needed; Supabase enforces access at query level.

Storage bucket: `materiais` (public URLs for uploaded files).

### Storage Path Conventions

- Checklist file uploads: `${projectId}/${itemId}/${timestamp}.${ext}`
- HTML design system / estrutura uploads: `${projectId}/${storageKey}` (e.g. `design-system`, `estrutura`)

### Component Structure

Each route is split into a **server component** (`page.tsx`) that fetches initial data, and a **client component** (`*Client.tsx`) that owns all interactivity:

- `app/dashboard/` — client interface; tabs: `materiais | design system | estrutura | aprovacoes`
- `app/admin/` — admin interface; project selector, status progression, checklist management; selected project is persisted in `localStorage`
- `app/components/DesignSystemTab.tsx` — generic `HtmlTab` used for both Design System and Estrutura tabs (HTML upload + iframe preview)
- `app/components/ApprovalsTab.tsx` — approval workflow UI shared between client and admin views

### Key Conventions

- **All UI text is in Portuguese** — labels, status names, category names. See `STATUS_STEPS` and `CHECKLIST_DEFAULTS` constants in `lib/types.ts` for the canonical values.
- **`CHECKLIST_DEFAULTS`** in `lib/types.ts` defines 17 pre-populated checklist items across 7 categories (Textos, Identidade Visual, Referências, Dados, Mídias, Técnico). Add new default items here; the admin panel bulk-initializes from this constant.
- **`useTransition`** wraps async Supabase calls in client components — no explicit error handling on updates.
- Modal state in `DashboardClient` follows the pattern `{ item: ChecklistItem; editing: boolean } | null`.

### Styling

All CSS lives in `app/globals.css` (~1200 lines) — no CSS modules. Tailwind CSS v4 is imported via PostCSS. The design uses a skeuomorphic retro-tech motif (wood flanks, chassis panels, LED indicators) with CSS custom properties for the full color palette. Key variables: `--bg`, `--chassis`, `--wood`, `--teal`, `--grad-a/b/c` (yellow/red/cyan gradient).

**This portal is a visual extension of the main marketing site.** The entire design language (`:root` variables, retro-tech aesthetic, color palette) originates in `C:\Projetos\geōrgia-site-arquitetura-digital\georgia-landing-standalone HTML.html`. When changing colors, typography, or motif elements in `globals.css`, keep them consistent with the `:root` block in that file — the portal should look like it belongs to the same product.

### TypeScript

Path alias `@/*` maps to the repo root. All shared types are in `lib/types.ts`.

## Screenshots

When the user references a screenshot or image without a full path, it is in `C:\Projetos\`.
