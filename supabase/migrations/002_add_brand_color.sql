-- ============================================================
-- Migration 002: Add brand_color to organizations
-- Run once in Supabase SQL Editor
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text;
