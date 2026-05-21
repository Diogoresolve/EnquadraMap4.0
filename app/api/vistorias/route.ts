/**
 * app/api/vistorias/route.ts
 * Rotas principais de vistorias — EnquadraMap 4.0
 *
 * POST /api/vistorias  → cria nova vistoria
 * GET  /api/vistorias  → lista vistorias (resumido, para o painel de histórico)
 *
 * Mock mode: quando DATABASE_URL e POSTGRES_URL estiverem ausentes,
 * retorna dados fictícios em vez de crashar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from '@/lib/nanoid'

// ─── Helper: detecta se o banco está configurado ─────────────────────────────

function dbAvailable(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
}

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface VistoriaBody {
  nome?: string
  promotor?: string
  numUnidades?: string
  programa?: string
  /** Chave de reconciliação com o sistema de compliance / parecer final */
  numeroChamado?: string
  endereco: string
  latitude: number
  longitude: number
  payload?: Record<string, unknown>
}

// ─── POST /api/vistorias ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: VistoriaBody = await request.json()
    const {
      endereco, latitude, longitude,
      payload = {},
      nome = '',
      promotor = '',
      numUnidades = '',
      programa = '',
      numeroChamado = '',
    } = body

    // Valida campos obrigatórios
    if (!endereco || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: endereco, latitude, longitude' },
        { status: 400 }
      )
    }

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (!dbAvailable()) {
      return NextResponse.json({ id: 'DEMO0001', url: '/v/DEMO0001' }, { status: 201 })
    }

    // ── Produção: insere no banco com todos os metadados do projeto ────────────
    const { sql } = await import('@/lib/db')
    const id = nanoid()

    await sql`
      INSERT INTO vistorias
        (id, nome, promotor, num_unidades, programa, numero_chamado, endereco, latitude, longitude, payload)
      VALUES (
        ${id},
        ${nome},
        ${promotor},
        ${numUnidades},
        ${programa},
        ${numeroChamado},
        ${endereco},
        ${latitude},
        ${longitude},
        ${JSON.stringify(payload)}
      )
    `

    return NextResponse.json({ id, url: `/v/${id}` }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET /api/vistorias ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filtroChamado = searchParams.get('chamado') ?? ''

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (!dbAvailable()) {
      return NextResponse.json([
        {
          id: 'DEMO0001',
          nome: 'Residencial Esperança (Demo)',
          promotor: 'Construtora Demo Ltda',
          num_unidades: '96',
          programa: 'MCMV Faixa 1',
          numero_chamado: 'CHM-2024-0381',
          endereco: 'Rua das Flores, 100 — São Paulo/SP',
          latitude: -23.5505,
          longitude: -46.6333,
          criado_em: '2025-01-15T10:00:00Z',
          atualizado_em: '2025-01-15T10:00:00Z',
        },
        {
          id: 'DEMO0002',
          nome: 'Conjunto Palmares (Demo)',
          promotor: '',
          num_unidades: '48',
          programa: 'FAR',
          numero_chamado: 'CHM-2024-0512',
          endereco: 'Av. Brasil, 2000 — Rio de Janeiro/RJ',
          latitude: -22.9068,
          longitude: -43.1729,
          criado_em: '2025-02-20T14:30:00Z',
          atualizado_em: '2025-02-20T14:30:00Z',
        },
      ])
    }

    // ── Produção: consulta banco com filtro opcional por chamado ───────────────
    const { sql } = await import('@/lib/db')

    // Filtro por numero_chamado (busca parcial, case-insensitive)
    const rows = filtroChamado
      ? await sql`
          SELECT id, nome, promotor, num_unidades, programa, numero_chamado,
                 endereco, latitude, longitude, criado_em, atualizado_em
          FROM vistorias
          WHERE numero_chamado ILIKE ${'%' + filtroChamado + '%'}
          ORDER BY criado_em DESC
          LIMIT 100
        `
      : await sql`
          SELECT id, nome, promotor, num_unidades, programa, numero_chamado,
                 endereco, latitude, longitude, criado_em, atualizado_em
          FROM vistorias
          ORDER BY criado_em DESC
          LIMIT 100
        `

    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
