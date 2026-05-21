/**
 * lib/blob.ts
 * Cliente Vercel Blob para upload de fotos — EnquadraMap 4.0
 *
 * Uso nas API Routes (POST /api/vistorias/[id]/fotos):
 *   import { uploadFoto } from '@/lib/blob'
 *   const { url, pathname } = await uploadFoto(file, vistoriaId, itemId)
 */
import { put, del, list } from '@vercel/blob'

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de uma foto para o Vercel Blob
 * Retorna a URL pública e o pathname para armazenar no banco
 */
export async function uploadFoto(
  file: File | Blob,
  vistoriaId: string,
  itemId: string
): Promise<{ url: string; pathname: string }> {
  const ext = file instanceof File ? file.name.split('.').pop() ?? 'jpg' : 'jpg'
  const timestamp = Date.now()
  const pathname = `vistorias/${vistoriaId}/${itemId}-${timestamp}.${ext}`

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file instanceof File ? file.type : 'image/jpeg',
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
  }
}

// ─── Deleção ──────────────────────────────────────────────────────────────────

/**
 * Remove uma foto pelo URL (usar com cautela — irreversível)
 */
export async function deleteFoto(url: string): Promise<void> {
  await del(url)
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

/**
 * Lista todos os blobs de uma vistoria (útil para auditoria)
 */
export async function listFotosBlob(vistoriaId: string) {
  const { blobs } = await list({ prefix: `vistorias/${vistoriaId}/` })
  return blobs
}
