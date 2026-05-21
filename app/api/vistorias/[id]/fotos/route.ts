/**
 * app/api/vistorias/[id]/fotos/route.ts
 * Upload de fotos para uma vistoria — EnquadraMap 4.0
 *
 * POST /api/vistorias/[id]/fotos
 *   Body: FormData com campos:
 *     - file    : File  (imagem a fazer upload)
 *     - item_id : string (identificador do item do checklist)
 *
 * Mock mode: quando BLOB_READ_WRITE_TOKEN estiver ausente,
 * retorna URL de placeholder em vez de crashar.
 */
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: detecta se o Blob está configurado ───────────────────────────────

function blobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

function dbAvailable(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
}

// ─── Parâmetros de rota ───────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── POST /api/vistorias/[id]/fotos ──────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: vistoriaId } = await params

    // Lê o FormData enviado pelo cliente
    const formData = await request.formData()
    const file = formData.get('file')
    const itemId = formData.get('item_id')

    // Valida campos obrigatórios
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Campo "file" é obrigatório e deve ser um arquivo.' },
        { status: 400 }
      )
    }
    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json(
        { error: 'Campo "item_id" é obrigatório.' },
        { status: 400 }
      )
    }

    // ── Mock mode (sem Blob token) ─────────────────────────────────────────────
    if (!blobAvailable()) {
      return NextResponse.json(
        {
          url: 'https://placehold.co/400x300/1a2744/4ade80?text=Foto+Demo',
          pathname: 'mock/demo.jpg',
        },
        { status: 201 }
      )
    }

    // ── Produção: upload para Vercel Blob ─────────────────────────────────────
    const { uploadFoto } = await import('@/lib/blob')
    const { url, pathname } = await uploadFoto(file, vistoriaId, itemId)

    // ── Registra no banco se disponível ───────────────────────────────────────
    if (dbAvailable()) {
      const { sql } = await import('@/lib/db')

      await sql`
        INSERT INTO vistoria_fotos (vistoria_id, item_id, blob_url, blob_pathname)
        VALUES (
          ${vistoriaId},
          ${itemId},
          ${url},
          ${pathname}
        )
      `
    }

    return NextResponse.json({ url, pathname }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
