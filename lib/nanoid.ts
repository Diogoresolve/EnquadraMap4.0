/**
 * lib/nanoid.ts
 * Gerador de IDs curtos para vistorias — EnquadraMap 4.0
 *
 * Usa crypto.getRandomValues (disponível no Node 19+ e Edge Runtime).
 * Gera IDs alfanuméricos de 8 caracteres sem dependências externas.
 *
 * Exemplo de saída: "A3fk9Xp2"
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const SIZE = 8

/**
 * Gera um ID aleatório de 8 caracteres alfanuméricos usando Web Crypto API.
 * Seguro para uso como chave primária de vistorias.
 */
export function nanoid(): string {
  // Obtém bytes aleatórios via Web Crypto (disponível em Node e Edge runtimes)
  const bytes = new Uint8Array(SIZE)
  crypto.getRandomValues(bytes)

  // Mapeia cada byte para um caractere do alfabeto (62 chars → sem viés relevante)
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('')
}
