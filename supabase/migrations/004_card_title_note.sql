-- Migration 004: Add card_title and personal_note to shared_cards
ALTER TABLE shared_cards
  ADD COLUMN IF NOT EXISTS card_title TEXT,
  ADD COLUMN IF NOT EXISTS personal_note TEXT;
