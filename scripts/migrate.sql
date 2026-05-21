-- ============================================================
-- EnquadraMap 4.0 — Schema inicial
-- Execute via: psql $DATABASE_URL -f scripts/migrate.sql
-- Ou via painel Neon: SQL Editor → colar e executar
-- ============================================================

-- Extensão para gerar UUIDs nativamente (disponível no Neon)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabela principal de vistorias ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vistorias (
  -- ID curto legível (ex: "aB3xK9") gerado no servidor com nanoid
  id              TEXT PRIMARY KEY,

  -- Endereço formatado pelo Google Maps Geocoder
  endereco        TEXT NOT NULL,

  -- Coordenadas do terreno analisado
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,

  -- Payload JSON completo: checklist, equipamentos, rotas, scores
  payload         JSONB NOT NULL DEFAULT '{}',

  -- Auditoria
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para ordenação por data (painel de histórico)
CREATE INDEX IF NOT EXISTS idx_vistorias_criado_em
  ON vistorias (criado_em DESC);

-- ─── Tabela de fotos das vistorias ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vistoria_fotos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência à vistoria pai
  vistoria_id     TEXT NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,

  -- Qual item do checklist essa foto documenta (ex: "escola_proxima", "ubs")
  item_id         TEXT NOT NULL,

  -- URL pública do Vercel Blob (CDN)
  blob_url        TEXT NOT NULL,

  -- Pathname interno do Blob (para deleção futura)
  blob_pathname   TEXT NOT NULL,

  -- Auditoria
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por vistoria (listagem de fotos por item)
CREATE INDEX IF NOT EXISTS idx_vistoria_fotos_vistoria_id
  ON vistoria_fotos (vistoria_id, item_id);

-- ─── Trigger: atualiza atualizado_em automaticamente ─────────────────────────
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_vistorias_atualizado_em
  BEFORE UPDATE ON vistorias
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
