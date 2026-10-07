/**
 * FUTBOL DE TODO EL MUNDO - Supabase Client & Data Access Layer
 * Multi-Competition Architecture: Competitions, Teams, Matches, Standings
 */
import { createClient } from '@supabase/supabase-js';

// Get config from Vite environment or localStorage for runtime customization
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localConfigUrl = typeof window !== 'undefined' ? localStorage.getItem('fresh_supabase_url') || '' : '';
const localConfigKey = typeof window !== 'undefined' ? localStorage.getItem('fresh_supabase_key') || '' : '';

export const SUPABASE_URL = localConfigUrl || envUrl;
export const SUPABASE_KEY = localConfigKey || envKey;

export const isConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_KEY && 
  !SUPABASE_URL.includes('your-project-id') &&
  !SUPABASE_KEY.includes('your-anon-public-key')
);

// Create real client or null
export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Local fallback store keys
const STORAGE_KEYS = {
  COMPETITIONS: 'fdtm_competitions',
  PROFILES: 'fdtm_profiles',
  SESSION: 'fdtm_session',
  NEWS: 'fdtm_news',
  COMMENTS: 'fdtm_comments',
  MATCHES: 'fdtm_matches',
  STANDINGS: 'fdtm_standings',
  TEAMS: 'fdtm_teams',
  POLLS: 'fdtm_polls',
  POLL_OPTIONS: 'fdtm_poll_options',
  POLL_VOTES: 'fdtm_poll_votes',
  DEBATES: 'fdtm_debates',
  DEBATE_COMMENTS: 'fdtm_debate_comments',
  PREDICTIONS: 'fdtm_predictions',
  TRIVIA: 'fdtm_trivia',
  TRIVIA_ATTEMPTS: 'fdtm_trivia_attempts',
  MEMES: 'fdtm_memes'
};

function getLocal(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Local storage read error', e);
    return [];
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage write error', e);
  }
}

/* ==========================================================================
   AUTHENTICATION API
   ========================================================================== */

export async function signUpUser({ email, password, nickname }) {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname.trim(),
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user'
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // Fallback local auth
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este email ya está registrado.');
  }

  const newId = 'usr_' + Date.now();
  const isAdmin = email.toLowerCase().includes('admin') || nickname.toLowerCase().includes('admin');
  const newProfile = {
    id: newId,
    email: email.toLowerCase(),
    password, // For local test only
    nickname: nickname.trim(),
    avatar_url: '',
    role: isAdmin ? 'admin' : 'user',
    points: 0,
    created_at: new Date().toISOString()
  };

  profiles.push(newProfile);
  setLocal(STORAGE_KEYS.PROFILES, profiles);
  setLocal(STORAGE_KEYS.SESSION, { user: newProfile, access_token: 'local-token-' + newId });
  return { user: newProfile, session: true };
}

export async function signInUser({ email, password }) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Fallback local auth
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const found = profiles.find(p => p.email.toLowerCase() === email.toLowerCase() && p.password === password);
  if (!found) {
    throw new Error('Credenciales incorrectas o usuario no encontrado.');
  }

  setLocal(STORAGE_KEYS.SESSION, { user: found, access_token: 'local-token-' + found.id });
  return { user: found, session: true };
}

export async function signOutUser() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export async function resetPasswordForEmail(email) {
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/perfil.html'
    });
    if (error) throw error;
    return true;
  }
  return true;
}

export async function getCurrentUser() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      profile: profile || {
        id: user.id,
        email: user.email,
        nickname: user.user_metadata?.nickname || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || '',
        role: user.user_metadata?.role || 'user',
        points: 0
      }
    };
  }

  // Fallback
  const session = getLocal(STORAGE_KEYS.SESSION);
  if (session && session.user) {
    const profiles = getLocal(STORAGE_KEYS.PROFILES);
    const updated = profiles.find(p => p.id === session.user.id) || session.user;
    return {
      id: updated.id,
      email: updated.email,
      profile: updated
    };
  }
  return null;
}

export async function updateProfile({ nickname, avatar_url }) {
  const current = await getCurrentUser();
  if (!current) throw new Error('No has iniciado sesión.');

  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        avatar_url: avatar_url || ''
      })
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const idx = profiles.findIndex(p => p.id === current.id);
  if (idx !== -1) {
    profiles[idx].nickname = nickname.trim();
    if (avatar_url !== undefined) profiles[idx].avatar_url = avatar_url;
    setLocal(STORAGE_KEYS.PROFILES, profiles);
    const session = getLocal(STORAGE_KEYS.SESSION);
    if (session) {
      session.user = profiles[idx];
      setLocal(STORAGE_KEYS.SESSION, session);
    }
    return profiles[idx];
  }
  throw new Error('Perfil no encontrado.');
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const isAdmin = user && (user.profile?.role === 'admin' || user.email?.includes('admin'));
  if (!isAdmin) {
    throw new Error('Acceso no autorizado: requiere permisos de administrador.');
  }
  return user;
}

/* ==========================================================================
   STORAGE UPLOAD API (Avatars, News, Memes, Escudos, Competiciones)
   ========================================================================== */

export async function uploadImage(file, bucketName = 'avatars') {
  if (!file) throw new Error('No se seleccionó ningún archivo.');

  if (supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Fallback: convert file to local data URL for preview
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Error al procesar la imagen.'));
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   1. COMPETITIONS API (public.competitions)
   ========================================================================== */

export const DEFAULT_COMPETITIONS = [
  { id: 'comp_laliga', name: 'LaLiga', short_name: 'LALIGA', country: 'España', type: 'league', logo: '' },
  { id: 'comp_premier', name: 'Premier League', short_name: 'EPL', country: 'Inglaterra', type: 'league', logo: '' },
  { id: 'comp_bundesliga', name: 'Bundesliga', short_name: 'BUN', country: 'Alemania', type: 'league', logo: '' },
  { id: 'comp_seriea', name: 'Serie A', short_name: 'SERIEA', country: 'Italia', type: 'league', logo: '' },
  { id: 'comp_ligue1', name: 'Ligue 1', short_name: 'LIGUE1', country: 'Francia', type: 'league', logo: '' },
  { id: 'comp_selecciones', name: 'Selecciones', short_name: 'INT', country: 'Mundial', type: 'international', logo: '' }
];

export function isValidUuid(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

export async function resolveCompetitionUuid(compIdentifier) {
  const comps = await getCompetitions();
  if (!compIdentifier) {
    const defaultComp = comps.find(c => c.name === 'LaLiga' || c.short_name === 'LALIGA') || comps[0];
    return defaultComp?.id || null;
  }

  // 1. If it's already a valid UUID and matches an existing competition
  if (isValidUuid(compIdentifier)) {
    const direct = comps.find(c => c.id === compIdentifier);
    if (direct) return direct.id;
  }

  // 2. Normalize search term and known slugs
  const search = compIdentifier.toString().toLowerCase().trim();
  const slugMap = {
    'comp_laliga': 'laliga',
    'comp_premier': 'premier league',
    'comp_bundesliga': 'bundesliga',
    'comp_seriea': 'serie a',
    'comp_ligue1': 'ligue 1',
    'comp_selecciones': 'selecciones'
  };
  const targetName = (slugMap[search] || search).toLowerCase();

  // Find in loaded comps
  let found = comps.find(c => 
    c.id === compIdentifier ||
    c.name.toLowerCase() === targetName ||
    (c.short_name && c.short_name.toLowerCase() === targetName) ||
    c.name.toLowerCase().includes(targetName) ||
    targetName.includes(c.name.toLowerCase())
  );

  if (found && isValidUuid(found.id)) {
    return found.id;
  }

  // 3. If connected to Supabase, query or seed competition in Supabase to get real UUID
  if (supabase) {
    try {
      const canonComp = DEFAULT_COMPETITIONS.find(dc => 
        dc.id === compIdentifier || 
        dc.name.toLowerCase() === targetName ||
        (dc.short_name && dc.short_name.toLowerCase() === targetName) ||
        targetName.includes(dc.name.toLowerCase())
      ) || { name: compIdentifier, short_name: compIdentifier.substring(0, 4).toUpperCase(), country: 'Mundial', type: 'league' };

      const { data: existingComp, error: selErr } = await supabase
        .from('competitions')
        .select('*')
        .ilike('name', canonComp.name)
        .maybeSingle();

      if (!selErr && existingComp && isValidUuid(existingComp.id)) {
        return existingComp.id;
      }

      // If not present in Supabase, create it
      const { data: newComp, error: insErr } = await supabase
        .from('competitions')
        .insert([{
          name: canonComp.name,
          short_name: canonComp.short_name,
          country: canonComp.country || 'Mundial',
          type: canonComp.type || 'league',
          logo: canonComp.logo || '',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!insErr && newComp && isValidUuid(newComp.id)) {
        return newComp.id;
      }
    } catch (e) {
      console.warn('[resolveCompetitionUuid] Error querying/inserting competition in Supabase:', e);
    }
  }

  return found?.id || comps[0]?.id || null;
}

export async function seedCompetitionsSupabase() {
  if (!supabase) return [];
  try {
    const prepared = DEFAULT_COMPETITIONS.map(c => ({
      name: c.name,
      short_name: c.short_name,
      country: c.country,
      type: c.type,
      logo: c.logo
    }));
    const { data, error } = await supabase
      .from('competitions')
      .upsert(prepared, { onConflict: 'name' })
      .select();
    if (!error && data) return data;
  } catch (e) {
    console.error('Error seeding competitions in Supabase:', e);
  }
  return [];
}

export async function getCompetitions() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        if (data.length === 0) {
          const seeded = await seedCompetitionsSupabase();
          if (seeded && seeded.length > 0) return seeded;
        }
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch competitions from Supabase, falling back to local.', e);
    }
  }

  let localComps = getLocal(STORAGE_KEYS.COMPETITIONS);
  if (!localComps || localComps.length === 0) {
    localComps = DEFAULT_COMPETITIONS.map((c, idx) => ({
      id: c.id || ('comp_fallback_' + idx + '_' + Math.random().toString(36).substr(2, 5)),
      name: c.name,
      short_name: c.short_name,
      country: c.country,
      type: c.type,
      logo: c.logo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    setLocal(STORAGE_KEYS.COMPETITIONS, localComps);
  }
  return localComps;
}

export async function saveCompetition(compData) {
  await requireAdmin();
  const name = compData.name?.trim();
  if (!name) throw new Error('El nombre de la competición es obligatorio.');

  const payload = {
    name,
    short_name: compData.short_name?.trim() || name.substring(0, 4).toUpperCase(),
    country: compData.country?.trim() || 'Mundial',
    type: compData.type || 'league',
    logo: compData.logo?.trim() || '',
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    if (isValidUuid(compData.id)) {
      const { data, error } = await supabase
        .from('competitions')
        .update(payload)
        .eq('id', compData.id)
        .select()
        .single();
      if (error) {
        console.error('[Supabase saveCompetition error]', error);
        throw new Error(error.message || 'Error al actualizar competición');
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('competitions')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) {
        console.error('[Supabase saveCompetition error]', error);
        throw new Error(error.message || 'Error al insertar competición');
      }
      return data;
    }
  }

  // Fallback Local
  const comps = await getCompetitions();
  if (compData.id) {
    const idx = comps.findIndex(c => c.id === compData.id);
    if (idx !== -1) {
      comps[idx] = { ...comps[idx], ...payload };
      setLocal(STORAGE_KEYS.COMPETITIONS, comps);
      return comps[idx];
    }
  }
  const newComp = {
    id: 'comp_fallback_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString()
  };
  comps.push(newComp);
  setLocal(STORAGE_KEYS.COMPETITIONS, comps);
  return newComp;
}

export async function deleteCompetition(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('competitions').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let comps = getLocal(STORAGE_KEYS.COMPETITIONS);
  comps = comps.filter(c => c.id !== id);
  setLocal(STORAGE_KEYS.COMPETITIONS, comps);
  return true;
}

/* ==========================================================================
   2. TEAMS API (public.teams with shield & competition_id)
   ========================================================================== */

const CANONICAL_TEAMS = {
  'fc barcelona': 'FC Barcelona',
  'barcelona': 'FC Barcelona',
  'real madrid': 'Real Madrid',
  'atlético de madrid': 'Atlético de Madrid',
  'athletic club': 'Athletic Club',
  'villarreal cf': 'Villarreal CF',
  'real betis': 'Real Betis',
  'real sociedad': 'Real Sociedad',
  'girona fc': 'Girona FC',
  'sevilla fc': 'Sevilla FC',
  'valencia cf': 'Valencia CF',
  'manchester city': 'Manchester City',
  'arsenal fc': 'Arsenal FC',
  'liverpool fc': 'Liverpool FC',
  'manchester united': 'Manchester United',
  'chelsea fc': 'Chelsea FC',
  'tottenham hotspur': 'Tottenham Hotspur',
  'bayern münchen': 'Bayern München',
  'borussia dortmund': 'Borussia Dortmund',
  'bayer leverkusen': 'Bayer Leverkusen',
  'inter de milán': 'Inter de Milán',
  'ac milan': 'AC Milan',
  'juventus fc': 'Juventus FC',
  'ssc napoli': 'SSC Napoli',
  'paris saint-germain': 'Paris Saint-Germain',
  'as monaco': 'AS Monaco',
  'olympique de marsella': 'Olympique de Marsella',
  'selección de españa': 'Selección de España',
  'selección de argentina': 'Selección de Argentina',
  'selección de brasil': 'Selección de Brasil',
  'selección de francia': 'Selección de Francia',
  'selección de inglaterra': 'Selección de Inglaterra',
  'selección de alemania': 'Selección de Alemania'
};

export function normalizeTeamName(name) {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  if (CANONICAL_TEAMS[clean]) return CANONICAL_TEAMS[clean];
  const unpunct = clean.replace(/\./g, '').replace(/\s+/g, ' ');
  if (CANONICAL_TEAMS[unpunct]) return CANONICAL_TEAMS[unpunct];
  return name.trim();
}

export function normalizeMatchStatus(st) {
  if (!st) return 'scheduled';
  const s = st.toLowerCase().trim();
  if (s === 'finalizado' || s === 'finished') return 'finished';
  if (s === 'en_juego' || s === 'live' || s === 'en juego') return 'live';
  return 'scheduled';
}

export const DEFAULT_TEAMS = [
  // LaLiga
  { name: 'FC Barcelona', short_name: 'BAR', shield: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', comp: 'LaLiga' },
  { name: 'Real Madrid', short_name: 'RMA', shield: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', comp: 'LaLiga' },
  { name: 'Atlético de Madrid', short_name: 'ATM', shield: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg', comp: 'LaLiga' },
  { name: 'Athletic Club', short_name: 'ATH', shield: 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg', comp: 'LaLiga' },
  { name: 'Real Betis', short_name: 'BET', shield: 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg', comp: 'LaLiga' },
  { name: 'Real Sociedad', short_name: 'RSO', shield: 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg', comp: 'LaLiga' },
  { name: 'Villarreal CF', short_name: 'VIL', shield: 'https://upload.wikimedia.org/wikipedia/en/7/70/Villarreal_CF_logo.svg', comp: 'LaLiga' },
  { name: 'Sevilla FC', short_name: 'SEV', shield: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg', comp: 'LaLiga' },
  { name: 'Girona FC', short_name: 'GIR', shield: 'https://upload.wikimedia.org/wikipedia/en/7/79/Girona_FC_crest.svg', comp: 'LaLiga' },
  { name: 'Valencia CF', short_name: 'VAL', shield: 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg', comp: 'LaLiga' },

  // Premier League
  { name: 'Manchester City', short_name: 'MCI', shield: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', comp: 'Premier League' },
  { name: 'Arsenal FC', short_name: 'ARS', shield: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', comp: 'Premier League' },
  { name: 'Liverpool FC', short_name: 'LIV', shield: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg', comp: 'Premier League' },
  { name: 'Chelsea FC', short_name: 'CHE', shield: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', comp: 'Premier League' },
  { name: 'Manchester United', short_name: 'MUN', shield: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg', comp: 'Premier League' },
  { name: 'Tottenham Hotspur', short_name: 'TOT', shield: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', comp: 'Premier League' },
  { name: 'Aston Villa', short_name: 'AVL', shield: 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg', comp: 'Premier League' },
  { name: 'Newcastle United', short_name: 'NEW', shield: 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg', comp: 'Premier League' },

  // Bundesliga
  { name: 'Bayern München', short_name: 'BAY', shield: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', comp: 'Bundesliga' },
  { name: 'Borussia Dortmund', short_name: 'BVB', shield: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg', comp: 'Bundesliga' },
  { name: 'Bayer Leverkusen', short_name: 'B04', shield: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg', comp: 'Bundesliga' },
  { name: 'RB Leipzig', short_name: 'RBL', shield: 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2020_logo.svg', comp: 'Bundesliga' },
  { name: 'Eintracht Frankfurt', short_name: 'SGE', shield: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg', comp: 'Bundesliga' },
  { name: 'VfB Stuttgart', short_name: 'VFB', shield: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg', comp: 'Bundesliga' },

  // Serie A
  { name: 'Inter de Milán', short_name: 'INT', shield: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg', comp: 'Serie A' },
  { name: 'AC Milan', short_name: 'MIL', shield: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg', comp: 'Serie A' },
  { name: 'Juventus FC', short_name: 'JUV', shield: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg', comp: 'Serie A' },
  { name: 'SSC Napoli', short_name: 'NAP', shield: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/SSC_Napoli_2024_%28deep_blue_navy%29.svg', comp: 'Serie A' },
  { name: 'AS Roma', short_name: 'ROM', shield: 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg', comp: 'Serie A' },
  { name: 'SS Lazio', short_name: 'LAZ', shield: 'https://upload.wikimedia.org/wikipedia/en/e/e4/SS_Lazio.svg', comp: 'Serie A' },

  // Ligue 1
  { name: 'Paris Saint-Germain', short_name: 'PSG', shield: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', comp: 'Ligue 1' },
  { name: 'AS Monaco', short_name: 'ASM', shield: 'https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg', comp: 'Ligue 1' },
  { name: 'Olympique de Marsella', short_name: 'OM', shield: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg', comp: 'Ligue 1' },
  { name: 'LOSC Lille', short_name: 'LIL', shield: 'https://upload.wikimedia.org/wikipedia/en/6/6f/LOSC_Lille_logo.svg', comp: 'Ligue 1' },
  { name: 'Olympique de Lyon', short_name: 'OL', shield: 'https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg', comp: 'Ligue 1' },

  // Selecciones
  { name: 'Selección de España', short_name: 'ESP', shield: 'https://upload.wikimedia.org/wikipedia/en/3/31/Spain_National_Football_Team_badge.png', comp: 'Selecciones' },
  { name: 'Selección de Argentina', short_name: 'ARG', shield: 'https://upload.wikimedia.org/wikipedia/en/d/d1/Argentina_national_football_team_crest.svg', comp: 'Selecciones' },
  { name: 'Selección de Francia', short_name: 'FRA', shield: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/86/French_Football_Federation_logo.svg/800px-French_Football_Federation_logo.svg.png', comp: 'Selecciones' },
  { name: 'Selección de Brasil', short_name: 'BRA', shield: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Brazilian_Football_Confederation_logo.svg/800px-Brazilian_Football_Confederation_logo.svg.png', comp: 'Selecciones' },
  { name: 'Selección de Inglaterra', short_name: 'ENG', shield: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/England_national_football_team_crest.svg/800px-England_national_football_team_crest.svg.png', comp: 'Selecciones' },
  { name: 'Selección de Alemania', short_name: 'GER', shield: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/DFB-Logo_2014.svg/800px-DFB-Logo_2014.svg.png', comp: 'Selecciones' }
];

export async function getTeams({ competitionId } = {}) {
  const comps = await getCompetitions();
  const compMap = new Map(comps.map(c => [c.id, c]));

  if (supabase) {
    try {
      let query = supabase
        .from('teams')
        .select(`
          *,
          competition:competition_id (id, name, short_name, logo, type)
        `)
        .order('name', { ascending: true });

      if (competitionId && competitionId !== 'all') {
        query = query.eq('competition_id', competitionId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(t => {
          const comp = t.competition || compMap.get(t.competition_id);
          return {
            ...t,
            competition_name: comp ? comp.name : 'LaLiga',
            competition_logo: comp ? comp.logo : ''
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch teams from Supabase, falling back to local.', e);
    }
  }

  let localTeams = getLocal(STORAGE_KEYS.TEAMS);
  if (!localTeams || localTeams.length === 0) {
    localTeams = DEFAULT_TEAMS.map((t, idx) => {
      const matchComp = comps.find(c => c.name === t.comp) || comps[0];
      return {
        id: 'team_fallback_' + idx + '_' + Math.random().toString(36).substr(2, 6),
        name: t.name,
        short_name: t.short_name,
        shield: t.shield,
        competition_id: matchComp ? matchComp.id : null,
        created_at: new Date().toISOString()
      };
    });
    setLocal(STORAGE_KEYS.TEAMS, localTeams);
  }

  let result = localTeams;
  if (competitionId && competitionId !== 'all') {
    result = result.filter(t => t.competition_id === competitionId);
  }

  return result.map(t => {
    const comp = compMap.get(t.competition_id);
    return {
      ...t,
      competition_name: comp ? comp.name : 'LaLiga',
      competition_logo: comp ? comp.logo : ''
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTeam(teamData) {
  await requireAdmin();
  const name = teamData.name?.trim();
  if (!name) throw new Error('El nombre del equipo es obligatorio.');

  const competition_id = await resolveCompetitionUuid(teamData.competition_id || teamData.competition);
  if (!competition_id) {
    throw new Error('Es obligatorio seleccionar una competición válida para el equipo.');
  }

  const canonName = normalizeTeamName(name);

  const payload = {
    name: canonName,
    short_name: teamData.short_name?.trim() || canonName.substring(0, 3).toUpperCase(),
    shield: teamData.shield?.trim() || '',
    competition_id: isValidUuid(competition_id) ? competition_id : null,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    if (isValidUuid(teamData.id)) {
      const { data, error } = await supabase
        .from('teams')
        .update(payload)
        .eq('id', teamData.id)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error(`El equipo "${canonName}" ya existe.`);
        console.error('[Supabase saveTeam error]', { error, payload });
        throw new Error(`Error Supabase [${error.code || '400'}]: ${error.message}`);
      }
      return data;
    } else {
      // Look up if team with same name already exists in Supabase
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', canonName)
        .maybeSingle();

      if (existingTeam && isValidUuid(existingTeam.id)) {
        const { data, error } = await supabase
          .from('teams')
          .update(payload)
          .eq('id', existingTeam.id)
          .select()
          .single();
        if (error) throw new Error(`Error al actualizar equipo existente: ${error.message}`);
        return data;
      }

      const { data, error } = await supabase
        .from('teams')
        .insert([{ ...payload, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error(`El equipo "${canonName}" ya existe.`);
        console.error('[Supabase saveTeam insert error]', { error, payload });
        throw new Error(`Error Supabase [${error.code || '400'}]: ${error.message}`);
      }
      return data;
    }
  }

  // Local fallback
  const localTeams = getLocal(STORAGE_KEYS.TEAMS);
  if (teamData.id) {
    const idx = localTeams.findIndex(t => t.id === teamData.id);
    if (idx !== -1) {
      localTeams[idx] = { ...localTeams[idx], ...payload };
      setLocal(STORAGE_KEYS.TEAMS, localTeams);
      return localTeams[idx];
    }
  }
  const newTeam = {
    id: 'team_fallback_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString()
  };
  localTeams.push(newTeam);
  setLocal(STORAGE_KEYS.TEAMS, localTeams);
  return newTeam;
}

export async function deleteTeam(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let localTeams = getLocal(STORAGE_KEYS.TEAMS);
  localTeams = localTeams.filter(t => t.id !== id);
  setLocal(STORAGE_KEYS.TEAMS, localTeams);
  return true;
}

/* ==========================================================================
   3. MATCHES & RESULTS API (public.matches with competition_id & team_id joins)
   ========================================================================== */

export async function getMatches({ competitionId, matchday, status, season } = {}) {
  const teams = await getTeams();
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const comps = await getCompetitions();
  const compMap = new Map(comps.map(c => [c.id, c]));

  if (supabase) {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home:home_team_id (id, name, short_name, shield, competition_id),
          away:away_team_id (id, name, short_name, shield, competition_id),
          competition:competition_id (id, name, short_name, logo, type)
        `)
        .order('match_date', { ascending: true });

      if (competitionId && competitionId !== 'all') {
        query = query.eq('competition_id', competitionId);
      }
      if (season && season !== 'all') {
        query = query.eq('season', season);
      }
      if (matchday) {
        query = query.eq('matchday', matchday);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(m => {
          const homeRef = m.home || teamMap.get(m.home_team_id) || (m.home_team ? teams.find(t => t.name.toLowerCase() === m.home_team.toLowerCase()) : null);
          const awayRef = m.away || teamMap.get(m.away_team_id) || (m.away_team ? teams.find(t => t.name.toLowerCase() === m.away_team.toLowerCase()) : null);
          const compRef = m.competition || compMap.get(m.competition_id);

          return {
            ...m,
            competition_id: m.competition_id,
            competition_name: compRef ? compRef.name : (m.competition || 'LaLiga'),
            competition_logo: compRef ? compRef.logo : '',
            home_team: homeRef ? homeRef.name : (m.home_team || 'Equipo local'),
            home_shield: homeRef ? homeRef.shield : (m.home_shield || ''),
            away_team: awayRef ? awayRef.name : (m.away_team || 'Equipo visitante'),
            away_shield: awayRef ? awayRef.shield : (m.away_shield || '')
          };
        });
      }
    } catch (e) {
      console.error('Error fetching matches with joins from Supabase:', e);
    }
  }

  // Local Storage Fallback
  let matches = getLocal(STORAGE_KEYS.MATCHES) || [];
  if (competitionId && competitionId !== 'all') {
    matches = matches.filter(m => m.competition_id === competitionId || m.competition === competitionId);
  }
  if (season && season !== 'all') {
    matches = matches.filter(m => (m.season || '2026/2027') === season);
  }
  if (matchday) {
    matches = matches.filter(m => Number(m.matchday) === Number(matchday));
  }
  if (status && status !== 'all') {
    matches = matches.filter(m => m.status === status);
  }

  return matches.map(m => {
    const homeRef = teamMap.get(m.home_team_id) || (m.home_team ? teams.find(t => t.name.toLowerCase() === m.home_team.toLowerCase()) : null);
    const awayRef = teamMap.get(m.away_team_id) || (m.away_team ? teams.find(t => t.name.toLowerCase() === m.away_team.toLowerCase()) : null);
    const compRef = compMap.get(m.competition_id);

    return {
      ...m,
      competition_id: m.competition_id,
      competition_name: compRef ? compRef.name : (m.competition || 'LaLiga'),
      competition_logo: compRef ? compRef.logo : '',
      home_team: homeRef ? homeRef.name : (m.home_team || 'Equipo local'),
      home_shield: homeRef ? homeRef.shield : (m.home_shield || ''),
      away_team: awayRef ? awayRef.name : (m.away_team || 'Equipo visitante'),
      away_shield: awayRef ? awayRef.shield : (m.away_shield || '')
    };
  });
}

export async function seedTeamsSupabase() {
  if (!supabase) return [];
  try {
    const comps = await getCompetitions();
    const compMapByName = new Map(comps.map(c => [c.name.toLowerCase(), c.id]));

    const prepared = DEFAULT_TEAMS.map(t => {
      const compId = compMapByName.get(t.comp.toLowerCase()) || comps[0]?.id;
      return {
        name: t.name,
        short_name: t.short_name,
        shield: t.shield,
        competition_id: compId,
        created_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('teams')
      .upsert(prepared, { onConflict: 'name' })
      .select();

    if (!error && data) return data;
  } catch (e) {
    console.error('Error seeding teams in Supabase:', e);
  }
  return [];
}

export async function resolveTeamInDb(teamNameOrId, competitionId) {
  if (!teamNameOrId) return null;
  const canonName = normalizeTeamName(teamNameOrId);
  const searchName = canonName.toLowerCase().trim();

  const compUuid = await resolveCompetitionUuid(competitionId);
  const teams = await getTeams();

  let found = teams.find(t => t.id === teamNameOrId);
  if (!found) {
    found = teams.find(t => t.name.toLowerCase() === searchName || (t.short_name && t.short_name.toLowerCase() === searchName));
  }

  // If connected to Supabase, query or insert in Supabase public.teams to get real UUID
  if (supabase) {
    try {
      // 1. If teamNameOrId is already a valid UUID, verify in Supabase
      if (isValidUuid(teamNameOrId)) {
        const { data: teamByUuid, error: uuidErr } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamNameOrId)
          .maybeSingle();

        if (!uuidErr && teamByUuid && isValidUuid(teamByUuid.id)) {
          return teamByUuid;
        }
      }

      // 2. Look up by name in Supabase
      const { data: teamByName, error: nameErr } = await supabase
        .from('teams')
        .select('*')
        .ilike('name', canonName)
        .maybeSingle();

      if (!nameErr && teamByName && isValidUuid(teamByName.id)) {
        return teamByName;
      }

      // 3. Team does not exist in Supabase yet -> Insert it
      const defaultTeamObj = DEFAULT_TEAMS.find(dt => dt.name.toLowerCase() === searchName);
      const shield = found?.shield || defaultTeamObj?.shield || '';
      const shortName = found?.short_name || defaultTeamObj?.short_name || canonName.substring(0, 3).toUpperCase();

      const { data: newTeam, error: insErr } = await supabase
        .from('teams')
        .insert([{
          name: canonName,
          short_name: shortName,
          shield: shield,
          competition_id: isValidUuid(compUuid) ? compUuid : null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!insErr && newTeam && isValidUuid(newTeam.id)) {
        return newTeam;
      }

      // If insert failed because of unique constraint (concurrent creation), retry select
      if (insErr && insErr.code === '23505') {
        const { data: retryTeam } = await supabase
          .from('teams')
          .select('*')
          .ilike('name', canonName)
          .maybeSingle();
        if (retryTeam && isValidUuid(retryTeam.id)) return retryTeam;
      }

      console.warn('[resolveTeamInDb] Team insert notice in Supabase:', insErr);
    } catch (e) {
      console.warn('[resolveTeamInDb] Error resolving team in Supabase:', e);
    }
  }

  if (found && isValidUuid(found.id)) {
    return found;
  }

  return {
    id: isValidUuid(found?.id) ? found.id : null,
    name: canonName,
    shield: found?.shield || '',
    competition_id: compUuid
  };
}

export async function saveMatch(matchData) {
  await requireAdmin();

  const compId = await resolveCompetitionUuid(matchData.competition_id || matchData.competition);
  if (!compId || !isValidUuid(compId)) {
    throw new Error('Es obligatorio seleccionar una competición válida con UUID para el partido.');
  }

  const homeTeam = await resolveTeamInDb(matchData.home_team_id || matchData.home_team, compId);
  const awayTeam = await resolveTeamInDb(matchData.away_team_id || matchData.away_team, compId);

  if (!homeTeam || !homeTeam.name) {
    throw new Error('Debes seleccionar un equipo local válido.');
  }
  if (!awayTeam || !awayTeam.name) {
    throw new Error('Debes seleccionar un equipo visitante válido.');
  }

  if (homeTeam.name.toLowerCase() === awayTeam.name.toLowerCase() || (homeTeam.id && awayTeam.id && homeTeam.id === awayTeam.id)) {
    throw new Error('El equipo local y el equipo visitante no pueden ser el mismo.');
  }

  // Date parsing
  let matchDateIso;
  try {
    const d = new Date(matchData.match_date || Date.now());
    matchDateIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  } catch (e) {
    matchDateIso = new Date().toISOString();
  }

  // Scores parsing
  let homeScore = null;
  if (matchData.home_score !== null && matchData.home_score !== undefined && matchData.home_score !== '') {
    const parsed = parseInt(matchData.home_score, 10);
    if (!isNaN(parsed)) homeScore = parsed;
  }

  let awayScore = null;
  if (matchData.away_score !== null && matchData.away_score !== undefined && matchData.away_score !== '') {
    const parsed = parseInt(matchData.away_score, 10);
    if (!isNaN(parsed)) awayScore = parsed;
  }

  const matchday = Math.min(38, Math.max(1, parseInt(matchData.matchday, 10) || 1));
  const status = normalizeMatchStatus(matchData.status);
  const season = (matchData.season || '2026/2027').trim();
  const stadium = (matchData.stadium || '').trim();

  // STRICT SUPABASE PAYLOAD (ONLY VALID TABLE COLUMNS)
  // NEVER send 'id' key on new insertions so Postgres generates default UUID
  const supabaseRecord = {
    competition_id: compId,
    matchday,
    season,
    match_date: matchDateIso,
    home_team_id: (homeTeam.id && isValidUuid(homeTeam.id)) ? homeTeam.id : null,
    away_team_id: (awayTeam.id && isValidUuid(awayTeam.id)) ? awayTeam.id : null,
    home_team: homeTeam.name,
    away_team: awayTeam.name,
    home_shield: homeTeam.shield || matchData.home_shield || '',
    away_shield: awayTeam.shield || matchData.away_shield || '',
    status,
    stadium,
    home_score: homeScore,
    away_score: awayScore
  };

  if (supabase) {
    const isEdit = isValidUuid(matchData.id);

    const executeSave = async (recordToSave) => {
      if (isEdit) {
        return await supabase
          .from('matches')
          .update(recordToSave)
          .eq('id', matchData.id)
          .select()
          .single();
      } else {
        return await supabase
          .from('matches')
          .insert([recordToSave])
          .select()
          .single();
      }
    };

    let { data, error } = await executeSave(supabaseRecord);

    if (error) {
      console.warn('[Supabase matches request notice, examining error]:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: supabaseRecord
      });

      let recovered = false;

      // 1. Auto-recovery if a specific column is missing in schema cache
      const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i) ||
                              error.message?.match(/column "([^"]+)" of relation "matches" does not exist/i);
      if (missingColMatch && missingColMatch[1]) {
        const missingCol = missingColMatch[1];
        console.warn(`[Supabase auto-adaptation] Removing unsupported column '${missingCol}' and retrying...`);
        delete supabaseRecord[missingCol];
        const retryResult = await executeSave(supabaseRecord);
        if (!retryResult.error && retryResult.data) {
          data = retryResult.data;
          error = null;
          recovered = true;
        } else {
          error = retryResult.error;
        }
      }

      // 2. Auto-recovery if foreign key constraint fails on team IDs (error 23503)
      if (error && error.code === '23503') {
        console.warn('[Supabase auto-adaptation] Foreign key violation on team IDs. Setting home_team_id and away_team_id to null and retrying...');
        supabaseRecord.home_team_id = null;
        supabaseRecord.away_team_id = null;
        const retryResult = await executeSave(supabaseRecord);
        if (!retryResult.error && retryResult.data) {
          data = retryResult.data;
          error = null;
          recovered = true;
        } else {
          error = retryResult.error;
        }
      }

      if (error && !recovered) {
        const errorBreakdown = [
          `Error Supabase [Código ${error.code || '400'}]: ${error.message || 'Petición rechazada'}`,
          error.details ? `Detalles: ${error.details}` : '',
          error.hint ? `Sugerencia: ${error.hint}` : ''
        ].filter(Boolean).join('\n');

        console.error('[Supabase match fatal error]', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload: supabaseRecord
        });
        throw new Error(errorBreakdown);
      }
    }

    if (data) return data;
  }

  // Local fallback
  const matches = getLocal(STORAGE_KEYS.MATCHES);
  if (matchData.id) {
    const idx = matches.findIndex(m => m.id === matchData.id);
    if (idx !== -1) {
      matches[idx] = { ...matches[idx], ...supabaseRecord, id: matchData.id };
      setLocal(STORAGE_KEYS.MATCHES, matches);
      return matches[idx];
    }
  }
  const newMatch = {
    id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    ...supabaseRecord,
    created_at: new Date().toISOString()
  };
  matches.push(newMatch);
  setLocal(STORAGE_KEYS.MATCHES, matches);
  return newMatch;
}

export async function deleteMatch(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let matches = getLocal(STORAGE_KEYS.MATCHES);
  matches = matches.filter(m => m.id !== id);
  setLocal(STORAGE_KEYS.MATCHES, matches);
  return true;
}

/* ==========================================================================
   4. STANDINGS API (Independent per Competition)
   ========================================================================== */

export async function getStandings({ competitionId } = {}) {
  const comps = await getCompetitions();
  const compMap = new Map(comps.map(c => [c.id, c]));
  const defaultCompId = comps.find(c => c.name === 'LaLiga')?.id || comps[0]?.id;

  const targetCompId = competitionId && competitionId !== 'all' ? competitionId : null;

  const teams = await getTeams();
  const teamMap = new Map(teams.map(t => [t.id, t]));

  if (supabase) {
    try {
      let query = supabase
        .from('standings')
        .select(`
          *,
          team_ref:team_id (id, name, short_name, shield, competition_id),
          competition:competition_id (id, name, short_name, logo, type)
        `)
        .order('position', { ascending: true });

      if (targetCompId) {
        query = query.eq('competition_id', targetCompId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(s => {
          const tRef = s.team_ref || teamMap.get(s.team_id) || (s.team ? teams.find(t => t.name.toLowerCase() === s.team.toLowerCase()) : null);
          const cRef = s.competition || compMap.get(s.competition_id);

          return {
            ...s,
            competition_id: s.competition_id,
            competition_name: cRef ? cRef.name : (s.competition || 'LaLiga'),
            competition_logo: cRef ? cRef.logo : '',
            team: tRef ? tRef.name : (s.team || 'Equipo pendiente'),
            shield: tRef ? tRef.shield : (s.shield || ''),
            short_name: tRef ? tRef.short_name : ''
          };
        });
      }
    } catch (e) {
      console.error('Error fetching standings with joins from Supabase:', e);
    }
  }

  // Local Fallback: Seed independent standings if empty
  let standings = getLocal(STORAGE_KEYS.STANDINGS) || [];
  if (standings.length === 0) {
    // Generate initial standings per league from default teams
    standings = [];
    const leagueComps = comps.filter(c => c.type === 'league');
    leagueComps.forEach(comp => {
      const compTeams = teams.filter(t => t.competition_id === comp.id);
      compTeams.forEach((t, idx) => {
        standings.push({
          id: 'std_' + comp.short_name.toLowerCase() + '_' + idx,
          competition_id: comp.id,
          team_id: t.id,
          team: t.name,
          shield: t.shield || '',
          position: idx + 1,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          dg: 0,
          points: 0,
          season: '2026/2027',
          updated_at: new Date().toISOString()
        });
      });
    });
    setLocal(STORAGE_KEYS.STANDINGS, standings);
  }

  if (targetCompId) {
    standings = standings.filter(s => s.competition_id === targetCompId || s.competition === targetCompId);
  }

  return standings.map(s => {
    const tRef = teamMap.get(s.team_id) || (s.team ? teams.find(t => t.name.toLowerCase() === s.team.toLowerCase()) : null);
    const cRef = compMap.get(s.competition_id);

    return {
      ...s,
      competition_id: s.competition_id,
      competition_name: cRef ? cRef.name : (s.competition || 'LaLiga'),
      competition_logo: cRef ? cRef.logo : '',
      team: tRef ? tRef.name : (s.team || 'Equipo pendiente'),
      shield: tRef ? tRef.shield : (s.shield || ''),
      short_name: tRef ? tRef.short_name : ''
    };
  }).sort((a, b) => a.position - b.position);
}

export async function saveStandingTeam(teamData) {
  await requireAdmin();

  const comps = await getCompetitions();
  const teams = await getTeams();

  let team_id = teamData.team_id || null;
  let competition_id = teamData.competition_id || null;
  let teamName = teamData.team;

  if (!competition_id && teamData.competition) {
    const compFound = comps.find(c => c.name.toLowerCase() === teamData.competition.toLowerCase());
    if (compFound) competition_id = compFound.id;
  }

  if (!competition_id) {
    throw new Error('Es obligatorio indicar la competición para la fila de clasificación.');
  }

  const selectedComp = comps.find(c => c.id === competition_id);
  if (!selectedComp) {
    throw new Error('La competición seleccionada para la clasificación no es válida.');
  }

  let foundTeamObj = null;
  if (team_id) {
    foundTeamObj = teams.find(x => x.id === team_id);
    if (foundTeamObj) teamName = foundTeamObj.name;
  } else if (teamName) {
    const canon = normalizeTeamName(teamName);
    foundTeamObj = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
    if (foundTeamObj) {
      team_id = foundTeamObj.id;
      teamName = foundTeamObj.name;
    }
  }

  if (!team_id || !foundTeamObj) {
    throw new Error(`El equipo "${teamName || 'desconocido'}" debe crearse previamente en la sección de Equipos.`);
  }

  // Cross-competition validation: The team MUST belong to the competition of this standing!
  if (foundTeamObj.competition_id && foundTeamObj.competition_id !== competition_id) {
    throw new Error(`El equipo "${foundTeamObj.name}" pertenece a otra competición y no puede añadirse a la clasificación de "${selectedComp.name}".`);
  }

  const pos = parseInt(teamData.position, 10);
  if (isNaN(pos) || pos < 1) throw new Error('La posición debe ser un número entero mayor a 0.');

  const pj = Math.max(0, parseInt(teamData.pj ?? 0, 10));
  const pg = Math.max(0, parseInt(teamData.pg ?? 0, 10));
  const pe = Math.max(0, parseInt(teamData.pe ?? 0, 10));
  const pp = Math.max(0, parseInt(teamData.pp ?? 0, 10));
  const gf = Math.max(0, parseInt(teamData.gf ?? 0, 10));
  const gc = Math.max(0, parseInt(teamData.gc ?? 0, 10));
  const dg = teamData.dg !== undefined && teamData.dg !== '' ? parseInt(teamData.dg, 10) : (gf - gc);
  const points = Math.max(0, parseInt(teamData.points ?? (pg * 3 + pe), 10));

  const payload = {
    competition_id,
    team_id,
    team: teamName,
    shield: foundTeamObj.shield || teamData.shield || '',
    position: pos,
    pj,
    pg,
    pe,
    pp,
    gf,
    gc,
    dg,
    points,
    season: teamData.season || '2026/2027',
    updated_at: new Date().toISOString()
  };

  if (teamData.id) payload.id = teamData.id;

  if (supabase) {
    if (payload.id) {
      const { data, error } = await supabase
        .from('standings')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('standings')
        .upsert(payload, { onConflict: 'competition_id, team_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  const standings = getLocal(STORAGE_KEYS.STANDINGS);
  const idx = standings.findIndex(s => s.id === payload.id || (s.competition_id === competition_id && s.team_id === team_id));
  if (idx !== -1) {
    standings[idx] = { ...standings[idx], ...payload };
  } else {
    standings.push({ id: 'std_' + Date.now(), ...payload });
  }
  setLocal(STORAGE_KEYS.STANDINGS, standings);
  return payload;
}

export async function deleteStandingTeam(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('standings').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let standings = getLocal(STORAGE_KEYS.STANDINGS);
  standings = standings.filter(s => s.id !== id);
  setLocal(STORAGE_KEYS.STANDINGS, standings);
  return true;
}


/* ==========================================================================
   NEWS, COMMENTS, POLLS, DEBATES, PREDICTIONS, TRIVIA & MEMES
   ========================================================================== */

export async function getNews({ category = 'all', limit = 50 } = {}) {
  if (supabase) {
    try {
      let query = supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
  }

  const news = getLocal(STORAGE_KEYS.NEWS).filter(n => n.published !== false);
  let filtered = category && category !== 'all' ? news.filter(n => n.category === category) : news;
  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

export async function getNewsById(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data;
    } catch (e) {}
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  return news.find(n => n.id === id) || null;
}

export async function createNews(newsData) {
  await requireAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('news')
      .insert([newsData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  const item = {
    id: 'news_' + Date.now(),
    ...newsData,
    created_at: new Date().toISOString()
  };
  news.unshift(item);
  setLocal(STORAGE_KEYS.NEWS, news);
  return item;
}

export async function updateNews(id, updateData) {
  await requireAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  const idx = news.findIndex(n => n.id === id);
  if (idx !== -1) {
    news[idx] = { ...news[idx], ...updateData };
    setLocal(STORAGE_KEYS.NEWS, news);
    return news[idx];
  }
  throw new Error('Noticia no encontrada.');
}

export async function deleteNews(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  let news = getLocal(STORAGE_KEYS.NEWS);
  news = news.filter(n => n.id !== id);
  setLocal(STORAGE_KEYS.NEWS, news);
  return true;
}

export async function getComments(newsId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('news_id', newsId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (e) {}
  }

  const comments = getLocal(STORAGE_KEYS.COMMENTS);
  return comments
    .filter(c => c.news_id === newsId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function addComment({ newsId, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para comentar.');

  const commentData = {
    news_id: newsId,
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || '',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const comments = getLocal(STORAGE_KEYS.COMMENTS);
  const item = { id: 'com_' + Date.now(), ...commentData };
  comments.push(item);
  setLocal(STORAGE_KEYS.COMMENTS, comments);
  return item;
}

export async function deleteComment(commentId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para eliminar comentarios.');

  if (supabase) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
    return true;
  }

  let comments = getLocal(STORAGE_KEYS.COMMENTS);
  comments = comments.filter(c => c.id !== commentId);
  setLocal(STORAGE_KEYS.COMMENTS, comments);
  return true;
}

export async function getPolls() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          poll_options (*)
        `)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  return getLocal(STORAGE_KEYS.POLLS) || [];
}

export async function votePoll({ pollId, optionId }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para votar.');

  if (supabase) {
    const { error } = await supabase
      .from('poll_votes')
      .insert([{
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      }]);
    if (error) {
      if (error.code === '23505') throw new Error('Ya has votado en esta encuesta.');
      throw error;
    }
    return true;
  }

  const votes = getLocal(STORAGE_KEYS.POLL_VOTES);
  if (votes.some(v => v.poll_id === pollId && v.user_id === user.id)) {
    throw new Error('Ya has votado en esta encuesta.');
  }
  votes.push({ poll_id: pollId, option_id: optionId, user_id: user.id });
  setLocal(STORAGE_KEYS.POLL_VOTES, votes);
  return true;
}

export async function hasUserVoted(pollId) {
  const user = await getCurrentUser();
  if (!user) return false;

  if (supabase) {
    const { data } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();
    return Boolean(data);
  }

  const votes = getLocal(STORAGE_KEYS.POLL_VOTES);
  return votes.some(v => v.poll_id === pollId && v.user_id === user.id);
}

export async function getDebates() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('debates')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  return getLocal(STORAGE_KEYS.DEBATES) || [];
}

export async function createDebate({ title, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para abrir un debate.');

  const payload = {
    title: title.trim(),
    content: content.trim(),
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || ''
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('debates')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const debates = getLocal(STORAGE_KEYS.DEBATES);
  const item = { id: 'deb_' + Date.now(), ...payload, created_at: new Date().toISOString() };
  debates.unshift(item);
  setLocal(STORAGE_KEYS.DEBATES, debates);
  return item;
}

export async function getDebateComments(debateId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('debate_comments')
        .select('*')
        .eq('debate_id', debateId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (e) {}
  }

  const comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  return comments.filter(c => c.debate_id === debateId);
}

export async function addDebateComment({ debateId, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para responder.');

  const payload = {
    debate_id: debateId,
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || '',
    content: content.trim()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('debate_comments')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  const item = { id: 'debcom_' + Date.now(), ...payload, created_at: new Date().toISOString() };
  comments.push(item);
  setLocal(STORAGE_KEYS.DEBATE_COMMENTS, comments);
  return item;
}

export async function deleteDebate(id) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No has iniciado sesión.');

  if (supabase) {
    const { error } = await supabase.from('debates').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  let debates = getLocal(STORAGE_KEYS.DEBATES);
  debates = debates.filter(d => d.id !== id);
  setLocal(STORAGE_KEYS.DEBATES, debates);
  return true;
}

export async function deleteDebateComment(id) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No has iniciado sesión.');

  if (supabase) {
    const { error } = await supabase.from('debate_comments').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  let comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  comments = comments.filter(c => c.id !== id);
  setLocal(STORAGE_KEYS.DEBATE_COMMENTS, comments);
  return true;
}

export async function getPredictions({ userId } = {}) {
  if (supabase) {
    try {
      let query = supabase.from('predictions').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
  }
  const preds = getLocal(STORAGE_KEYS.PREDICTIONS) || [];
  return userId ? preds.filter(p => p.user_id === userId) : preds;
}

export async function savePrediction({ matchId, homeScore, awayScore }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para participar en las porras.');

  const payload = {
    match_id: matchId,
    user_id: user.id,
    user_nickname: user.profile?.nickname || user.email,
    predicted_home_score: parseInt(homeScore, 10),
    predicted_away_score: parseInt(awayScore, 10)
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'match_id, user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const preds = getLocal(STORAGE_KEYS.PREDICTIONS);
  const idx = preds.findIndex(p => p.match_id === matchId && p.user_id === user.id);
  if (idx !== -1) {
    preds[idx] = { ...preds[idx], ...payload };
  } else {
    preds.push({ id: 'pred_' + Date.now(), ...payload, created_at: new Date().toISOString() });
  }
  setLocal(STORAGE_KEYS.PREDICTIONS, preds);
  return payload;
}

export async function getTriviaQuestions() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  return [
    {
      id: 'q1',
      question: '¿Qué selección ganó el Mundial de la FIFA 2022 en Qatar?',
      option_a: 'Francia',
      option_b: 'Argentina',
      option_c: 'Brasil',
      option_d: 'Croacia',
      correct_option: 'b',
      explanation: 'Argentina se proclamó campeona tras vencer a Francia en la tanda de penaltis.'
    },
    {
      id: 'q2',
      question: '¿Quién es el máximo goleador histórico de la Champions League?',
      option_a: 'Lionel Messi',
      option_b: 'Robert Lewandowski',
      option_c: 'Cristiano Ronaldo',
      option_d: 'Karim Benzema',
      correct_option: 'c',
      explanation: 'Cristiano Ronaldo ostenta el récord con 140 goles marcados.'
    },
    {
      id: 'q3',
      question: '¿Qué equipo ganó la Premier League invicto en la temporada 2003-04?',
      option_a: 'Manchester United',
      option_b: 'Chelsea',
      option_c: 'Arsenal FC',
      option_d: 'Liverpool FC',
      correct_option: 'c',
      explanation: 'Los "Invisibles" del Arsenal de Arsène Wenger finalizaron la liga sin perder un solo encuentro.'
    }
  ];
}

export async function submitTriviaScore({ score, totalQuestions, correctAnswers }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Inicia sesión para guardar tu puntuación de trivial.');

  const payload = {
    user_id: user.id,
    user_nickname: user.profile?.nickname || user.email,
    score,
    total_questions: totalQuestions,
    correct_answers: correctAnswers
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('trivia_attempts')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const attempts = getLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS);
  const item = { id: 'triv_' + Date.now(), ...payload, created_at: new Date().toISOString() };
  attempts.push(item);
  setLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS, attempts);
  return item;
}

export async function getTriviaLeaderboard() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trivia_attempts')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);
      if (!error && data) return data;
    } catch (e) {}
  }
  const attempts = getLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS);
  return attempts.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function getMemes() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  return getLocal(STORAGE_KEYS.MEMES) || [];
}

export async function createMeme({ title, image_url }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para subir un meme.');

  const payload = {
    title: title.trim(),
    image_url: image_url.trim(),
    author_id: user.id,
    author_name: user.profile?.nickname || user.email
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('memes')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const memes = getLocal(STORAGE_KEYS.MEMES);
  const item = { id: 'meme_' + Date.now(), ...payload, created_at: new Date().toISOString() };
  memes.unshift(item);
  setLocal(STORAGE_KEYS.MEMES, memes);
  return item;
}

export async function likeMeme(id) {
  if (supabase) {
    const { data: current } = await supabase.from('memes').select('likes_count').eq('id', id).single();
    const count = (current?.likes_count || 0) + 1;
    const { data, error } = await supabase.from('memes').update({ likes_count: count }).eq('id', id).select().single();
    if (!error && data) return data;
  }
  const memes = getLocal(STORAGE_KEYS.MEMES);
  const idx = memes.findIndex(m => m.id === id);
  if (idx !== -1) {
    memes[idx].likes_count = (memes[idx].likes_count || 0) + 1;
    setLocal(STORAGE_KEYS.MEMES, memes);
    return memes[idx];
  }
  return null;
}

export async function deleteMeme(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('memes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let memes = getLocal(STORAGE_KEYS.MEMES);
  memes = memes.filter(m => m.id !== id);
  setLocal(STORAGE_KEYS.MEMES, memes);
  return true;
}

// Aliases for porras and trivia page compatibility
export const submitPrediction = savePrediction;
export const submitTriviaAttempt = submitTriviaScore;

export async function getPorrasRanking() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('points_awarded', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  const preds = getLocal(STORAGE_KEYS.PREDICTIONS);
  return preds.sort((a, b) => (b.points_awarded || 0) - (a.points_awarded || 0));
}

export async function getAllProfiles() {
  await requireAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  return getLocal(STORAGE_KEYS.PROFILES);
}

export async function getDashboardStats() {
  const [users, teams, newsList, matchesList, commentsList, debatesList, pollsList, memesList, triviaList] = await Promise.all([
    getAllProfiles().catch(() => []),
    getTeams().catch(() => []),
    getNews({ limit: 1000 }).catch(() => []),
    getMatches().catch(() => []),
    getLocal(STORAGE_KEYS.COMMENTS),
    getDebates().catch(() => []),
    getPolls().catch(() => []),
    getMemes().catch(() => []),
    getTriviaQuestions().catch(() => [])
  ]);

  return {
    users: users?.length || 0,
    teams: teams?.length || 0,
    news: newsList?.length || 0,
    matches: matchesList?.length || 0,
    comments: commentsList?.length || 0,
    debates: debatesList?.length || 0,
    polls: pollsList?.length || 0,
    memes: memesList?.length || 0,
    trivia: triviaList?.length || 0
  };
}

export async function closePoll(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('polls').update({ status: 'closed' }).eq('id', id);
    if (error) throw error;
    return true;
  }
  const polls = getLocal(STORAGE_KEYS.POLLS);
  const p = polls.find(x => x.id === id);
  if (p) p.status = 'closed';
  setLocal(STORAGE_KEYS.POLLS, polls);
  return true;
}

export async function deletePoll(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let polls = getLocal(STORAGE_KEYS.POLLS);
  polls = polls.filter(x => x.id !== id);
  setLocal(STORAGE_KEYS.POLLS, polls);
  return true;
}

export async function createPoll({ question, options }) {
  await requireAdmin();
  if (supabase) {
    const { data: poll, error: pErr } = await supabase
      .from('polls')
      .insert([{ question, status: 'active' }])
      .select()
      .single();
    if (pErr) throw pErr;

    const optPayloads = options.map(opt => ({
      poll_id: poll.id,
      option_text: opt,
      votes_count: 0
    }));

    const { error: oErr } = await supabase.from('poll_options').insert(optPayloads);
    if (oErr) throw oErr;
    return poll;
  }

  const polls = getLocal(STORAGE_KEYS.POLLS);
  const pollId = 'poll_' + Date.now();
  const pollOptions = options.map((opt, i) => ({
    id: `opt_${pollId}_${i}`,
    poll_id: pollId,
    option_text: opt,
    votes_count: 0
  }));
  const newPoll = {
    id: pollId,
    question,
    status: 'active',
    created_at: new Date().toISOString(),
    poll_options: pollOptions
  };
  polls.unshift(newPoll);
  setLocal(STORAGE_KEYS.POLLS, polls);
  return newPoll;
}

export async function saveTriviaQuestion(data) {
  await requireAdmin();
  const payload = {
    question: data.question.trim(),
    option_a: data.option_a.trim(),
    option_b: data.option_b.trim(),
    option_c: data.option_c?.trim() || '',
    option_d: data.option_d?.trim() || '',
    correct_option: data.correct_option,
    points: parseInt(data.points || 10, 10),
    explanation: data.explanation?.trim() || ''
  };

  if (supabase) {
    const { data: item, error } = await supabase
      .from('trivia_questions')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return item;
  }

  const qList = getLocal(STORAGE_KEYS.TRIVIA);
  const newItem = { id: 'q_' + Date.now(), ...payload, created_at: new Date().toISOString() };
  qList.unshift(newItem);
  setLocal(STORAGE_KEYS.TRIVIA, qList);
  return newItem;
}

export async function deleteTriviaQuestion(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('trivia_questions').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let qList = getLocal(STORAGE_KEYS.TRIVIA);
  qList = qList.filter(q => q.id !== id);
  setLocal(STORAGE_KEYS.TRIVIA, qList);
  return true;
}

export async function importMatchdayBatch(matches, updateExisting = false, targetCompetitionId = null) {
  await requireAdmin();
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const compId = await resolveCompetitionUuid(targetCompetitionId);
  if (!compId) {
    throw new Error('Debes seleccionar una competición válida para importar partidos.');
  }

  // Fetch existing matches to detect duplicates accurately
  let existingMatches = [];
  try {
    existingMatches = await getMatches({ competitionId: compId });
  } catch (e) {
    existingMatches = [];
  }

  for (const m of matches) {
    const homeName = normalizeTeamName(m.home_team || '').trim();
    const awayName = normalizeTeamName(m.away_team || '').trim();

    if (!homeName || !awayName) {
      skippedCount++;
      continue;
    }

    try {
      // Resolve teams to ensure they have valid UUIDs in Supabase / Local
      const homeTeam = await resolveTeamInDb(m.home_team_id || homeName, compId);
      const awayTeam = await resolveTeamInDb(m.away_team_id || awayName, compId);

      if (!homeTeam || !awayTeam) {
        throw new Error(`No se pudieron resolver los equipos "${homeName}" y "${awayName}".`);
      }

      const matchday = Math.min(38, Math.max(1, parseInt(m.matchday, 10) || 1));
      const season = m.season || '2026/2027';

      // Check if match already exists
      const duplicate = existingMatches.find(em => 
        (em.competition_id === compId || em.competition === compId) &&
        (em.season || '2026/2027') === season &&
        Number(em.matchday) === matchday &&
        (
          (em.home_team?.toLowerCase() === homeName.toLowerCase() && em.away_team?.toLowerCase() === awayName.toLowerCase()) ||
          (homeTeam.id && awayTeam.id && em.home_team_id === homeTeam.id && em.away_team_id === awayTeam.id)
        )
      );

      if (duplicate && !updateExisting) {
        skippedCount++;
        continue;
      }

      const matchRecord = {
        ...(duplicate && isValidUuid(duplicate.id) ? { id: duplicate.id } : {}),
        competition_id: compId,
        matchday,
        season,
        match_date: m.match_date,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        home_shield: homeTeam.shield || m.home_shield || '',
        away_shield: awayTeam.shield || m.away_shield || '',
        stadium: m.stadium || '',
        status: m.status,
        home_score: m.home_score,
        away_score: m.away_score
      };

      await saveMatch(matchRecord);

      if (duplicate) {
        updatedCount++;
      } else {
        newCount++;
      }
    } catch (err) {
      console.error(`[Error importing match ${homeName} vs ${awayName}]`, err);
      errors.push({
        match: `${homeName} vs ${awayName}`,
        message: err.message || 'Error desconocido'
      });
      skippedCount++;
    }
  }

  return { newCount, updatedCount, skippedCount, errors };
}

export async function recalculateStandingsFromMatches(season = '2026/2027', competitionId = null) {
  await requireAdmin();
  const comps = await getCompetitions();

  // If no competitionId specified, recalculate each competition independently
  if (!competitionId || competitionId === 'all') {
    const results = {};
    for (const comp of comps) {
      if (comp.type === 'league') {
        results[comp.id] = await recalculateSingleCompetitionStandings(season, comp.id);
      }
    }
    return results;
  }

  return await recalculateSingleCompetitionStandings(season, competitionId);
}

async function recalculateSingleCompetitionStandings(season, competitionId) {
  const allMatches = await getMatches({ season, competitionId });
  const finishedMatches = allMatches.filter(m => m.status === 'finished' && m.competition_id === competitionId);

  const teams = await getTeams({ competitionId });
  const compStandings = new Map();

  teams.forEach(t => {
    compStandings.set(t.id, {
      team_id: t.id,
      competition_id: competitionId,
      team: t.name,
      shield: t.shield || '',
      position: 1,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      points: 0,
      season
    });
  });

  finishedMatches.forEach(m => {
    if (m.home_score === null || m.away_score === null) return;

    const home = compStandings.get(m.home_team_id);
    const away = compStandings.get(m.away_team_id);

    if (home) {
      home.pj++;
      home.gf += m.home_score;
      home.gc += m.away_score;
      if (m.home_score > m.away_score) {
        home.pg++;
        home.points += 3;
      } else if (m.home_score === m.away_score) {
        home.pe++;
        home.points += 1;
      } else {
        home.pp++;
      }
      home.dg = home.gf - home.gc;
    }

    if (away) {
      away.pj++;
      away.gf += m.away_score;
      away.gc += m.home_score;
      if (m.away_score > m.home_score) {
        away.pg++;
        away.points += 3;
      } else if (m.home_score === m.away_score) {
        away.pe++;
        away.points += 1;
      } else {
        away.pp++;
      }
      away.dg = away.gf - away.gc;
    }
  });

  const sortedList = Array.from(compStandings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });

  sortedList.forEach((st, idx) => {
    st.position = idx + 1;
  });

  // Clear existing standings for this specific competition in local storage if not supabase
  if (!supabase) {
    let standings = getLocal(STORAGE_KEYS.STANDINGS);
    standings = standings.filter(s => s.competition_id !== competitionId);
    setLocal(STORAGE_KEYS.STANDINGS, standings);
  }

  for (const st of sortedList) {
    await saveStandingTeam(st);
  }

  return sortedList;
}

export async function checkStandingsConsistency(competitionId = null) {
  const standings = await getStandings({ competitionId });
  const issues = [];
  const posMap = new Map();

  standings.forEach(s => {
    if (posMap.has(s.position)) {
      issues.push(`Posición duplicada: #${s.position} entre "${posMap.get(s.position)}" y "${s.team}"`);
    } else {
      posMap.set(s.position, s.team);
    }
  });

  return { isConsistent: issues.length === 0, issues };
}

export async function importStandingsBatch(rows, targetCompetitionId = null) {
  await requireAdmin();
  for (const row of rows) {
    await saveStandingTeam({
      ...row,
      ...(targetCompetitionId ? { competition_id: targetCompetitionId } : {})
    });
  }
  return true;
}

export const getProfiles = getAllProfiles;

export async function updateUserRole(userId, newRole) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) throw error;
  }
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const idx = profiles.findIndex(p => p.id === userId);
  if (idx !== -1) {
    profiles[idx].role = newRole;
    setLocal(STORAGE_KEYS.PROFILES, profiles);
  }
  return true;
}

export async function deleteUser(userId) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
  }
  let profiles = getLocal(STORAGE_KEYS.PROFILES);
  profiles = profiles.filter(p => p.id !== userId);
  setLocal(STORAGE_KEYS.PROFILES, profiles);
  return true;
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem('ffd_supabase_url', url);
  localStorage.setItem('ffd_supabase_key', key);
}

export function getSupabaseConfig() {
  return {
    url: localStorage.getItem('ffd_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
    key: localStorage.getItem('ffd_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
}

export function clearSupabaseConfig() {
  localStorage.removeItem('ffd_supabase_url');
  localStorage.removeItem('ffd_supabase_key');
}



