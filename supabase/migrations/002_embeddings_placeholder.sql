-- Placeholder columns for future semantic / multimodal recommendation upgrades.
-- We keep these as jsonb to avoid requiring pgvector in MVP.

alter table if exists public.cards
  add column if not exists semantic_embedding jsonb,
  add column if not exists visual_embedding jsonb;

alter table if exists public.flowers
  add column if not exists semantic_embedding jsonb;

