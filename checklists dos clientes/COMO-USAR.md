# Como criar um checklist personalizado para um novo cliente

## O que você precisa

1. **E-mail do cliente** — o mesmo com que ele vai fazer login no portal
2. **Arquivo de checklist** — um `.txt` ou `.md` com os itens (veja o formato abaixo)
3. **Dev server ou sessão Claude Code aberta** — o script roda aqui

---

## Formato do arquivo de checklist

O script aceita dois formatos:

**Formato simples** (para checklists diretos):
```
## Textos
- copy da página inicial
- texto sobre a empresa

## Identidade Visual
- logotipo (SVG + PNG)
- paleta de cores
```

**Formato rico** (como o arquivo da LUMINA — com checkboxes, destaques e anotações):
```
## A · Identidade Visual

- [x] **Logotipo** `✓ Já contemplado`
  Descrição opcional — é ignorada, só o título em negrito vai para o portal.

- [ ] **Tagline / slogan** · `Obrigatório`
```

> O script extrai automaticamente o texto em **negrito** como label do item.
> Descrições multilinha abaixo de cada item são ignoradas.
> O prefixo de letra (`A ·`, `B ·`) é removido do nome da categoria.

---

## Como rodar

No Claude Code, execute o comando abaixo (substituindo email e caminho do arquivo):

```
! node --experimental-strip-types --env-file=.env.local scripts/set-checklist.ts "email@cliente.com" "checklists dos clientes/Nome do Arquivo.txt"
```

**O script faz automaticamente:**
- Encontra o usuário pelo e-mail
- Se não houver projeto criado, cria um com o nome extraído do título `# Nome` do arquivo
- Se já houver projeto, substitui todos os itens existentes
- Se houver arquivos já enviados pelo cliente, avisa e aguarda 5 segundos antes de deletar (Ctrl+C para cancelar)
- Exibe um resumo completo do que foi inserido

---

## Exemplo real (LUMINA)

```
! node --experimental-strip-types --env-file=.env.local scripts/set-checklist.ts "magnoprudencio@gmail.com" "checklists dos clientes/LUMINA — Checklist de Materiais.txt"
```

Resultado: projeto "LUMINA" criado automaticamente, 28 itens em 8 categorias.

---

## Ajustes finos pelo painel admin

Para pequenas mudanças após a criação (sem precisar rodar o script novamente):

| Ação | Como |
|---|---|
| Adicionar item a uma categoria existente | Clique no `+` ao lado do nome da categoria |
| Editar label de um item | Clique no `✎` à direita do item |
| Remover um item | Clique no `×` à direita do item |
| Criar nova categoria | Clique em `+ nova categoria` no final da lista |

> Se o cliente já enviou arquivo para um item e você tentar deletar, o painel pede confirmação.

---

## Observações

- O script **substitui** o checklist inteiro — não acrescenta. Ideal para o onboarding inicial.
- O painel admin é para ajustes pontuais depois.
- O cliente vê o checklist atualizado imediatamente após o script rodar (não precisa de deploy).
- Mudanças no código do painel (UI) precisam de push para aparecer na Vercel.
