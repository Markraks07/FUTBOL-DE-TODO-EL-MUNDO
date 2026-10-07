-- ====================================================================
-- FUTBOL DE TODO EL MUNDO - MIGRACIÓN Y ESTRUCTURA DE COMPETICIONES
-- ====================================================================

-- 1. EXTENSIÓN Y FUNCIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREACIÓN DE TABLA PUBLIC.COMPETITIONS
CREATE TABLE IF NOT EXISTS public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT DEFAULT '',
  country TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('league', 'international')) DEFAULT 'league',
  logo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS para competiciones
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Competitions are viewable by everyone" ON public.competitions;
CREATE POLICY "Competitions are viewable by everyone" 
ON public.competitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert competitions" ON public.competitions;
CREATE POLICY "Admins can insert competitions" 
ON public.competitions FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update competitions" ON public.competitions;
CREATE POLICY "Admins can update competitions" 
ON public.competitions FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete competitions" ON public.competitions;
CREATE POLICY "Admins can delete competitions" 
ON public.competitions FOR DELETE USING (is_admin());

-- Prepolar competiciones iniciales
INSERT INTO public.competitions (name, short_name, country, type, logo) VALUES
('LaLiga', 'LALIGA', 'España', 'league', ''),
('Premier League', 'EPL', 'Inglaterra', 'league', ''),
('Bundesliga', 'BUN', 'Alemania', 'league', ''),
('Serie A', 'SERIEA', 'Italia', 'league', ''),
('Ligue 1', 'LIGUE1', 'Francia', 'league', ''),
('Selecciones', 'INT', 'Mundial', 'international', '')
ON CONFLICT (name) DO NOTHING;

-- 3. AÑADIR COMPETITION_ID A PUBLIC.TEAMS
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL;

-- Asignar equipos existentes a LaLiga por defecto
UPDATE public.teams 
SET competition_id = (SELECT id FROM public.competitions WHERE name = 'LaLiga' LIMIT 1)
WHERE competition_id IS NULL;

-- 4. AÑADIR COMPETITION_ID A PUBLIC.MATCHES
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;

-- Asignar partidos existentes a LaLiga por defecto
UPDATE public.matches 
SET competition_id = (SELECT id FROM public.competitions WHERE name = 'LaLiga' LIMIT 1)
WHERE competition_id IS NULL;

-- 5. AÑADIR COMPETITION_ID A PUBLIC.STANDINGS Y ELIMINAR RESTRICCIÓN UNIQUE EN POSITION
ALTER TABLE public.standings ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE;

-- Asignar clasificaciones existentes a LaLiga por defecto
UPDATE public.standings 
SET competition_id = (SELECT id FROM public.competitions WHERE name = 'LaLiga' LIMIT 1)
WHERE competition_id IS NULL;

-- CRÍTICO: Eliminar cualquier restricción UNIQUE antigua sobre position o team globalmente
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS standings_position_key;
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS standings_position_check;
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS standings_team_key;
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS uq_standings_position;
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS uq_standings_team;

-- Añadir nuevas restricciones compuestas por competición
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS uq_standings_comp_team;
ALTER TABLE public.standings ADD CONSTRAINT uq_standings_comp_team UNIQUE (competition_id, team_id);

ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS uq_standings_comp_position;
ALTER TABLE public.standings ADD CONSTRAINT uq_standings_comp_position UNIQUE (competition_id, position);

-- Crear Índices
CREATE INDEX IF NOT EXISTS idx_teams_competition ON public.teams(competition_id);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON public.matches(competition_id, matchday);
CREATE INDEX IF NOT EXISTS idx_standings_competition ON public.standings(competition_id, position ASC);
