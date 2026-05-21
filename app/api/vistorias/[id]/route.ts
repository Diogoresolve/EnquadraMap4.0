/**
 * app/api/vistorias/[id]/route.ts
 * Operações sobre uma vistoria específica — EnquadraMap 4.0
 *
 * GET   /api/vistorias/[id]  → retorna vistoria completa + fotos
 * PATCH /api/vistorias/[id]  → atualiza payload/checklist da vistoria
 *
 * Mock mode: quando DATABASE_URL e POSTGRES_URL estiverem ausentes,
 * retorna dados fictícios em vez de crashar.
 */
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: detecta se o banco está configurado ─────────────────────────────

function dbAvailable(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
}

// ─── Parâmetros de rota ───────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── GET /api/vistorias/[id] ──────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (!dbAvailable()) {
      return NextResponse.json({
        id,
        endereco: 'Rua das Flores, 100 — São Paulo/SP',
        latitude: -23.5505,
        longitude: -46.6333,
        payload: {
          nome: 'Residencial Esperança (Demo)',
          promotor: 'Promotor Demo Ltda',
          numUnidades: 48,
          programa: 'MCMV Faixa 1',
          checklist: {},
        },
        criado_em: '2025-01-15T10:00:00Z',
        atualizado_em: '2025-01-15T10:00:00Z',
        fotos: [
          {
            id: 'foto-mock-1',
            item_id: 'fachada',
            blob_url: 'https://placehold.co/400x300/1a2744/4ade80?text=Foto+Demo',
            blob_pathname: 'mock/demo.jpg',
            criado_em: '2025-01-15T10:05:00Z',
          },
        ],
      })
    }

    // ── Produção: consulta banco ───────────────────────────────────────────────
    const { sql } = await import('@/lib/db')

    // Busca a vistoria principal
    const vistorias = await sql`
      SELECT * FROM vistorias WHERE id = ${id} LIMIT 1
    `

    if (vistorias.length === 0) {
      return NextResponse.json({ error: 'Vistoria não encontrada' }, { status: 404 })
    }

    // Busca as fotos associadas
    const fotos = await sql`
      SELECT id, item_id, blob_url, blob_pathname, criado_em
      FROM vistoria_fotos
      WHERE vistoria_id = ${id}
      ORDER BY item_id, criado_em
    `

    return NextResponse.json({ ...vistorias[0], fotos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/vistorias/[id] ────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body: Record<string, unknown> = await request.json()

    // ── Mock mode ──────────────────────────────────────────────────────────────
    if (!dbAvailable()) {
      return NextResponse.json({ ok: true })
    }

    // ── Produção: atualiza o banco ─────────────────────────────────────────────
    const { sql } = await import('@/lib/db')

    // Permite atualizar campos de topo ou o payload inteiro
    // Se vier { payload: {...} } atualiza o payload; se vier { endereco, ... } atualiza a linha
    const { payload, endereco, latitude, longitude } = body as {
      payload?: Record<string, unknown>
      endereco?: string
      latitude?: number
      longitude?: number
    }

    if (payload !== undefined) {
      // Merge do payload existente com os novos dados
      await sql`
        UPDATE vistorias
        SET
          payload      = payload || ${JSON.stringify(payload)}::jsonb,
          atualizado_em = NOW()
        WHERE id = ${id}
      `
    }

    if (endereco || latitude !== undefined || longitude !== undefined) {
      // Atualiza campos de endereço/coordenadas se fornecidos
      await sql`
        UPDATE vistorias
        SET
          endereco      = COALESCE(${endereco ?? null}, endereco),
          latitude      = COALESCE(${latitude ?? null}, latitude),
          longitude     = COALESCE(${longitude ?? null}, longitude),
          atualizado_em = NOW()
        WHERE id = ${id}
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
