-- ====================================================================
-- FUTBOL DE TODO EL MUNDO - COMPLETE DATABASE SCHEMA & RLS POLICIES
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & HELPERS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. COMPETITIONS TABLE
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

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competitions are viewable by everyone" 
ON public.competitions FOR SELECT USING (true);

CREATE POLICY "Admins can insert competitions" 
ON public.competitions FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update competitions" 
ON public.competitions FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete competitions" 
ON public.competitions FOR DELETE USING (is_admin());

-- Prepopulate Initial Competitions
INSERT INTO public.competitions (name, short_name, country, type, logo) VALUES
('LaLiga', 'LALIGA', 'España', 'league', ''),
('Premier League', 'EPL', 'Inglaterra', 'league', ''),
('Bundesliga', 'BUN', 'Alemania', 'league', ''),
('Serie A', 'SERIEA', 'Italia', 'league', ''),
('Ligue 1', 'LIGUE1', 'Francia', 'league', ''),
('Selecciones', 'INT', 'Mundial', 'international', '')
ON CONFLICT (name) DO NOTHING;

-- 4. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_role TEXT := 'user';
BEGIN
  IF new.email = 'admin@futboltodomundo.com' OR (new.raw_user_meta_data->>'role') = 'admin' THEN
    initial_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, nickname, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    initial_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nickname = COALESCE(EXCLUDED.nickname, profiles.nickname);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT DEFAULT '',
  shield TEXT DEFAULT '',
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by everyone" 
ON public.teams FOR SELECT USING (true);

CREATE POLICY "Admins can insert teams" 
ON public.teams FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update teams" 
ON public.teams FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete teams" 
ON public.teams FOR DELETE USING (is_admin());

-- 6. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL CHECK (matchday BETWEEN 1 AND 38),
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_team TEXT DEFAULT '',
  away_team TEXT DEFAULT '',
  home_shield TEXT DEFAULT '',
  away_shield TEXT DEFAULT '',
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  match_date TIMESTAMPTZ NOT NULL,
  stadium TEXT DEFAULT '',
  season TEXT DEFAULT '2026/2027',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_matches_competition ON public.matches(competition_id, matchday);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone" 
ON public.matches FOR SELECT USING (true);

CREATE POLICY "Admins can manage matches" 
ON public.matches FOR ALL USING (is_admin());

-- 7. STANDINGS TABLE
CREATE TABLE IF NOT EXISTS public.standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  shield TEXT DEFAULT '',
  position INTEGER NOT NULL,
  pj INTEGER NOT NULL DEFAULT 0,
  pg INTEGER NOT NULL DEFAULT 0,
  pe INTEGER NOT NULL DEFAULT 0,
  pp INTEGER NOT NULL DEFAULT 0,
  gf INTEGER NOT NULL DEFAULT 0,
  gc INTEGER NOT NULL DEFAULT 0,
  dg INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  season TEXT DEFAULT '2026/2027',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_standings_comp_team UNIQUE (competition_id, team_id),
  CONSTRAINT uq_standings_comp_position UNIQUE (competition_id, position)
);

CREATE INDEX IF NOT EXISTS idx_standings_comp_pos ON public.standings(competition_id, position ASC);

ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings are viewable by everyone" 
ON public.standings FOR SELECT USING (true);

CREATE POLICY "Admins can manage standings" 
ON public.standings FOR ALL USING (is_admin());

-- 8. NEWS TABLE
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Noticias', 'Fichajes', 'Rumores', 'LaLiga', 'Premier League', 'Bundesliga', 'Serie A', 'Ligue 1', 'Selecciones', 'Otros')),
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT true,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'FUTBOL DE TODO EL MUNDO Redacción',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published news are viewable by everyone" 
ON public.news FOR SELECT USING (published = true OR is_admin());

CREATE POLICY "Admins can manage news" 
ON public.news FOR ALL USING (is_admin());

-- 9. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" 
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post comments" 
ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users or admins can delete comments" 
ON public.comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

-- 10. POLLS, DEBATES, PREDICTIONS, TRIVIA & MEMES
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Polls viewable by everyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Admins manage polls" ON public.polls FOR ALL USING (is_admin());

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll options viewable by everyone" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Admins manage poll options" ON public.poll_options FOR ALL USING (is_admin());

CREATE TABLE IF NOT EXISTS public.debates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Debates viewable by everyone" ON public.debates FOR SELECT USING (true);
CREATE POLICY "Authenticated create debates" ON public.debates FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins delete debates" ON public.debates FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE TABLE IF NOT EXISTS public.debate_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.debate_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Debate comments viewable by everyone" ON public.debate_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated create debate comments" ON public.debate_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins delete debate comments" ON public.debate_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_nickname TEXT NOT NULL,
  predicted_home_score INTEGER NOT NULL CHECK (predicted_home_score >= 0),
  predicted_away_score INTEGER NOT NULL CHECK (predicted_away_score >= 0),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(match_id, user_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Predictions viewable by everyone" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Authenticated submit predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins or users update predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trivia questions viewable by everyone" ON public.trivia_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage trivia questions" ON public.trivia_questions FOR ALL USING (is_admin());

CREATE TABLE IF NOT EXISTS public.memes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Memes viewable by everyone" ON public.memes FOR SELECT USING (true);
CREATE POLICY "Authenticated post memes" ON public.memes FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins delete memes" ON public.memes FOR DELETE USING (auth.uid() = author_id OR is_admin());
