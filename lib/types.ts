export type Role = 'admin' | 'client'

export type ProjectStatus = 'briefing' | 'design' | 'desenvolvimento' | 'revisao' | 'entregue'

export interface Profile {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface DesignSystemColor {
  name: string
  hex: string
}

export interface DesignSystemData {
  typography: {
    primary: string
    secondary: string
    scale: string
  }
  colors: DesignSystemColor[]
  spacing: string
  notes: string
}

export const DESIGN_SYSTEM_EMPTY: DesignSystemData = {
  typography: { primary: '', secondary: '', scale: '' },
  colors: [{ name: '', hex: '#000000' }],
  spacing: '',
  notes: '',
}

export interface Project {
  id: string
  client_id: string
  name: string
  status: ProjectStatus
  design_system?: DesignSystemData
  created_at: string
  profiles?: Profile
}

export interface ChecklistItem {
  id: string
  project_id: string
  label: string
  category: string
  checked_by_client: boolean
  checked_by_admin: boolean
  note: string | null
  file_url: string | null
  order_index: number
}

export const STATUS_STEPS: { key: ProjectStatus; label: string }[] = [
  { key: 'briefing',      label: 'briefing'      },
  { key: 'design',        label: 'design'        },
  { key: 'desenvolvimento', label: 'desenvolvimento' },
  { key: 'revisao',       label: 'revisão'       },
  { key: 'entregue',      label: 'entregue'      },
]

export const CHECKLIST_DEFAULTS: Omit<ChecklistItem, 'id' | 'project_id' | 'checked_by_client' | 'checked_by_admin' | 'note' | 'file_url'>[] = [
  { label: 'copy da página inicial (hero, tagline, CTAs)',   category: 'Textos',            order_index: 0 },
  { label: 'texto sobre / quem somos',                       category: 'Textos',            order_index: 1 },
  { label: 'serviços ou produtos (lista + descrições)',      category: 'Textos',            order_index: 2 },
  { label: 'depoimentos de clientes',                        category: 'Textos',            order_index: 3 },
  { label: 'informações de contato (endereço, tel, e-mail)', category: 'Textos',            order_index: 4 },
  { label: 'logotipo (SVG + PNG)',                           category: 'Identidade Visual', order_index: 5 },
  { label: 'paleta de cores (hex)',                          category: 'Identidade Visual', order_index: 6 },
  { label: 'tipografia definida (fontes + pesos)',           category: 'Identidade Visual', order_index: 7 },
  { label: 'sites de referência (URLs ou prints)',           category: 'Referências',       order_index: 8 },
  { label: 'estilo visual que NÃO quer se parecer',          category: 'Referências',       order_index: 9 },
  { label: 'razão social / nome comercial',                  category: 'Dados',             order_index: 10 },
  { label: 'redes sociais (handles)',                        category: 'Dados',             order_index: 11 },
  { label: 'CNPJ (se houver)',                               category: 'Dados',             order_index: 12 },
  { label: 'fotos da equipe / founders',                     category: 'Mídias',            order_index: 13 },
  { label: 'fotos do espaço / produto',                      category: 'Mídias',            order_index: 14 },
  { label: 'vídeos (se houver)',                             category: 'Mídias',            order_index: 15 },
  { label: 'domínio (registrar ou dados de acesso)',         category: 'Técnico',           order_index: 16 },
  { label: 'hospedagem existente (se houver)',               category: 'Técnico',           order_index: 17 },
]
