# EnquadraMap 4.0

> **Análise de Inserção Urbana — Portaria MCID 725/2023**  
> Versão 4.0 — Infraestrutura Vercel Postgres + Blob · GitHub: `enquadramap-40`

---

## O que é

O **EnquadraMap** é uma ferramenta web para análise de inserção urbana de empreendimentos habitacionais, conforme critérios da **Portaria MCID 725/2023**. A versão 4.0 adiciona banco de dados, upload de fotos em campo e histórico de vistorias.

## Novidades do 4.0

| Funcionalidade | Descrição |
|---|---|
| 🗄️ **Vercel Postgres** | Banco relacional hospedado na mesma conta Vercel — sem riscos de proxy corporativo |
| 📸 **Upload de Fotos** | Vistoriador tira foto no celular (`capture="environment"`) e ela é salva via Vercel Blob |
| 🔗 **Link Curto `/v/[ID]`** | Dados gravados no banco; motorista/vistoriador recebe URL limpa |
| 📋 **Portal de Vistoria Renovado** | Cada item tem botão "📸 Tirar Foto", galeria de thumbs e navegação integrada |
| 🗂️ **Histórico Arquivado** | Painel do escritório para consultar qualquer vistoria anterior com fotos |
| 🔍 **Busca Pública Melhorada** | Escolas e UBS filtradas por `type` + `keyword` nativo da API Google |
| ✨ **Interface Premium** | Cards animados, radar pulsante durante busca, marcadores com sigla visível |

## Stack Técnica

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Mapa**: Google Maps API + `@react-google-maps/api`
- **Banco de Dados**: Vercel Postgres (`@vercel/postgres`)
- **Armazenamento de Fotos**: Vercel Blob (`@vercel/blob`)
- **Hospedagem**: Vercel (projeto separado do 3.x — sem interferência)
- **Estilo**: Tailwind CSS 4

## Pré-requisitos

```bash
node >= 20
npm >= 10
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Vercel Postgres (gerado automaticamente ao linkar o banco na Vercel)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Vercel Blob (gerado automaticamente ao criar o store na Vercel)
BLOB_READ_WRITE_TOKEN=
```

## Instalação e Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Fases de Desenvolvimento

- [x] **Fase 1** — Inicialização do repo, README, package.json, variáveis de ambiente
- [ ] **Fase 2** — Integração Vercel Postgres: schema SQL, migrations, API routes `/api/vistorias`
- [ ] **Fase 3** — Upload de fotos via Vercel Blob, portal mobile `/v/[id]`
- [ ] **Fase 4** — Painel de histórico do escritório
- [ ] **Fase 5** — Interface premium: animações, radar, marcadores com sigla
- [ ] **Fase 6** — Busca pública melhorada (escolas/UBS por `type` + `keyword`)
- [ ] **Fase 7** — Geração de PDF atualizada com fotos e QR Code do link

## Estrutura do Projeto

```
enquadra 4.0/
├── app/
│   ├── page.tsx              # Página principal — análise de inserção
│   ├── layout.tsx
│   ├── globals.css
│   ├── motorista/            # Portal mobile do motorista (3.x legado)
│   └── v/[id]/               # 🆕 Portal de vistoria com fotos (4.0)
├── components/               # Componentes reutilizáveis
├── hooks/                    # Custom hooks (Google Maps, etc.)
├── utils/                    # Helpers (PDF, KML, rotas)
├── lib/
│   ├── db.ts                 # 🆕 Cliente Vercel Postgres
│   └── blob.ts               # 🆕 Cliente Vercel Blob
├── .env.local                # Variáveis locais (não versionado)
├── .env.example              # Template de variáveis (versionado)
└── vercel.json
```

## Relação com v3.x

A versão 3.x continua no ar e **não é afetada** por este projeto. O 4.0 é um **projeto Vercel separado** conectado a este repositório, rodando em subdomínio/domínio diferente.

---

Desenvolvido para análise habitacional conforme **Portaria MCID 725/2023**.
