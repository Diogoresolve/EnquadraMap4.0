/**
 * lib/db.ts
 * Cliente Neon Serverless Postgres para o EnquadraMap 4.0
 *
 * A Vercel migrou Postgres → Neon como integração nativa.
 * As variáveis DATABASE_URL / POSTGRES_URL são geradas automaticamente
 * ao linkar o banco no painel Vercel → Storage.
 *
 * Uso nas API Routes:
 *   import { sql } from '@/lib/db'
 *   const result = await sql`SELECT * FROM vistorias WHERE id = ${id}`
 */
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  throw new Error(
    'DATABASE_URL ou POSTGRES_URL não definido. ' +
    'Configure a variável de ambiente antes de usar o banco de dados.'
  )
}

const connectionString = (process.env.DATABASE_URL ?? process.env.POSTGRES_URL)!
export const sql = neon(connectionString)

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Vistoria {
  id: string
  endereco: string
  latitude: number
  longitude: number
  payload: Record<string, unknown>
  criado_em: string
}

export interface VistoriaFoto {
  id: string
  vistoria_id: string
  item_id: string
  blob_url: string
  blob_pathname: string
  criado_em: string
}

// ─── Funções de acesso ───────────────────────────────────────────────────────

/**
 * Retorna uma vistoria pelo ID (UUID ou NANOID curto)
 */
export async function getVistoriaById(id: string): Promise<Vistoria | null> {
  const rows = await sql`
    SELECT * FROM vistorias WHERE id = ${id} LIMIT 1
  `
  return (rows[0] as Vistoria) ?? null
}

/**
 * Cria uma nova vistoria e retorna o registro completo
 */
export async function createVistoria(dados: {
  id: string             // nanoid gerado no servidor
  endereco: string
  latitude: number
  longitude: number
  payload: object
}): Promise<Vistoria> {
  const rows = await sql`
    INSERT INTO vistorias (id, endereco, latitude, longitude, payload)
    VALUES (
      ${dados.id},
      ${dados.endereco},
      ${dados.latitude},
      ${dados.longitude},
      ${JSON.stringify(dados.payload)}
    )
    RETURNING *
  `
  return rows[0] as Vistoria
}

/**
 * Lista vistorias mais recentes para o painel do escritório
 */
export async function listVistorias(limit = 50): Promise<Vistoria[]> {
  const rows = await sql`
    SELECT id, endereco, latitude, longitude, criado_em
    FROM vistorias
    ORDER BY criado_em DESC
    LIMIT ${limit}
  `
  return rows as Vistoria[]
}

/**
 * Adiciona uma foto a um item da vistoria
 */
export async function addFotoVistoria(dados: {
  vistoria_id: string
  item_id: string
  blob_url: string
  blob_pathname: string
}): Promise<VistoriaFoto> {
  const rows = await sql`
    INSERT INTO vistoria_fotos (vistoria_id, item_id, blob_url, blob_pathname)
    VALUES (
      ${dados.vistoria_id},
      ${dados.item_id},
      ${dados.blob_url},
      ${dados.blob_pathname}
    )
    RETURNING *
  `
  return rows[0] as VistoriaFoto
}

/**
 * Retorna todas as fotos de uma vistoria agrupadas por item_id
 */
export async function getFotosVistoria(
  vistoria_id: string
): Promise<VistoriaFoto[]> {
  const rows = await sql`
    SELECT item_id, blob_url, blob_pathname, criado_em
    FROM vistoria_fotos
    WHERE vistoria_id = ${vistoria_id}
    ORDER BY item_id, criado_em
  `
  return rows as VistoriaFoto[]
}
