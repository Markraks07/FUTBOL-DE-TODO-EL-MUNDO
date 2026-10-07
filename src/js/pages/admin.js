/**
 * FUTBOL DE TODO EL MUNDO - Admin Panel Controller
 * Strict Multi-Competition Isolation Architecture
 * Single Clean Competition Selector Per Section (Equipos, Partidos, Clasificación)
 */
import { initNavigation, showToast } from '../navigation.js';
import { 
  getCurrentUser, 
  getNews, 
  createNews, 
  updateNews, 
  deleteNews,
  getMatches, 
  saveMatch, 
  deleteMatch, 
  getStandings, 
  saveStandingTeam, 
  deleteStandingTeam, 
  recalculateStandingsFromMatches,
  getProfiles, 
  updateUserRole, 
  deleteUser,
  getPolls, 
  createPoll, 
  closePoll, 
  deletePoll,
  getDebates, 
  deleteDebate,
  getComments, 
  deleteComment,
  getMemes, 
  deleteMeme,
  getTriviaQuestions, 
  saveTriviaQuestion, 
  deleteTriviaQuestion,
  getPredictions,
  getCompetitions,
  getTeams,
  saveTeam,
  deleteTeam,
  importMatchdayBatch,
  saveSupabaseConfig,
  getSupabaseConfig,
  clearSupabaseConfig
} from '../supabase.js';

let currentUser = null;
let allCompetitions = [];
let allTeams = [];
let allAdminMatches = [];
let activeCompetitionId = 'comp_laliga';

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('admin');
  await checkAdminAuth();
});

async function checkAdminAuth() {
  const authCheckingState = document.getElementById('auth-checking-state');
  const unauthorizedBox = document.getElementById('unauthorized-box');
  const adminDashboard = document.getElementById('admin-dashboard');

  try {
    currentUser = await getCurrentUser();
    
    // Check admin rights
    const isAdmin = currentUser && (currentUser.profile?.role === 'admin' || currentUser.email === 'admin@futboltodomundo.com' || currentUser.email?.includes('admin'));

    if (authCheckingState) authCheckingState.classList.add('hidden');

    if (!isAdmin) {
      if (unauthorizedBox) unauthorizedBox.classList.remove('hidden');
      if (adminDashboard) adminDashboard.classList.add('hidden');
      return;
    }

    // Admin verified
    if (unauthorizedBox) unauthorizedBox.classList.add('hidden');
    if (adminDashboard) adminDashboard.classList.remove('hidden');

    await loadInitialCompetitions();
    setupAdminTabs();
    setupCompetitionSelectors();
    setupDashboardCounters();

    // Initialize all management sections
    setupNewsAdmin();
    setupTeamsAdmin();
    setupMatchesAdmin();
    setupStandingsAdmin();
    setupUsersAdmin();
    setupPollsAdmin();
    setupDebatesAdmin();
    setupCommentsAdmin();
    setupPorrasAdmin();
    setupTriviaAdmin();
    setupMemesAdmin();
    setupSupabaseConfigTab();

    // Default active tab: News
    await loadNewsAdmin();

  } catch (err) {
    console.error('Error verifying admin authorization:', err);
    if (authCheckingState) authCheckingState.classList.add('hidden');
    if (unauthorizedBox) unauthorizedBox.classList.remove('hidden');
  }
}

/* ==========================================================================
   0. COMPETITION STATE & SYNCHRONIZED SELECTORS
   ========================================================================== */
async function loadInitialCompetitions() {
  allCompetitions = await getCompetitions();
  if (allCompetitions.length > 0) {
    const laliga = allCompetitions.find(c => c.name === 'LaLiga' || c.short_name === 'LALIGA');
    activeCompetitionId = laliga ? laliga.id : allCompetitions[0].id;
  }
  allTeams = await getTeams();
}

function getCompEmoji(name) {
  if (name.includes('LaLiga')) return '🇪🇸';
  if (name.includes('Premier')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (name.includes('Bundesliga')) return '🇩🇪';
  if (name.includes('Serie A')) return '🇮🇹';
  if (name.includes('Ligue 1')) return '🇫🇷';
  if (name.includes('Selecciones')) return '🌍';
  return '⚽';
}

function getActiveCompetition() {
  return allCompetitions.find(c => c.id === activeCompetitionId) || {
    id: activeCompetitionId,
    name: 'LaLiga',
    type: 'league'
  };
}

function setupCompetitionSelectors() {
  const comp = getActiveCompetition();

  // Populate Teams competition select
  populateCompSelect('teams-competition-selector');
  populateCompSelect('matches-competition-selector');
  populateCompSelect('standings-competition-selector');

  // Attach change listeners
  const teamsSel = document.getElementById('teams-competition-selector');
  teamsSel?.addEventListener('change', async (e) => {
    await switchActiveCompetition(e.target.value);
  });

  const matchesSel = document.getElementById('matches-competition-selector');
  matchesSel?.addEventListener('change', async (e) => {
    await switchActiveCompetition(e.target.value);
  });

  const standingsSel = document.getElementById('standings-competition-selector');
  standingsSel?.addEventListener('change', async (e) => {
    await switchActiveCompetition(e.target.value);
  });

  updateAllCompetitionBadges();
}

function populateCompSelect(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;

  select.innerHTML = allCompetitions.map(c => `
    <option value="${c.id}" ${c.id === activeCompetitionId ? 'selected' : ''}>
      ${getCompEmoji(c.name)} ${c.name}
    </option>
  `).join('');
}

async function switchActiveCompetition(newCompId) {
  activeCompetitionId = newCompId;

  // Sync all select elements
  const selectors = ['teams-competition-selector', 'matches-competition-selector', 'standings-competition-selector'];
  selectors.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = activeCompetitionId;
  });

  updateAllCompetitionBadges();

  // Refresh dependent views
  await loadTeamsAdmin();
  updateMatchFormTeamsForActiveCompetition();
  await loadMatchesAdmin();
  await loadStandingsAdmin();
}

function updateAllCompetitionBadges() {
  const comp = getActiveCompetition();
  const label = `${getCompEmoji(comp.name)} ${comp.name}`;

  // Equipos section badges
  const teamsActiveName = document.getElementById('teams-comp-active-name');
  if (teamsActiveName) teamsActiveName.innerText = label;
  const teamsCompBadge = document.getElementById('teams-comp-title-badge');
  if (teamsCompBadge) teamsCompBadge.innerText = comp.name;
  const teamFormBadge = document.getElementById('team-form-comp-badge');
  if (teamFormBadge) teamFormBadge.innerText = comp.name;

  // Hidden input for team form
  const teamCompHidden = document.getElementById('team-competition-id');
  if (teamCompHidden) teamCompHidden.value = activeCompetitionId;

  // Matches section badges
  const matchesActiveName = document.getElementById('matches-comp-active-name');
  if (matchesActiveName) matchesActiveName.innerText = label;
  const matchesCompBadge = document.getElementById('matches-comp-title-badge');
  if (matchesCompBadge) matchesCompBadge.innerText = comp.name;
  const matchFormBadge = document.getElementById('match-form-comp-badge');
  if (matchFormBadge) matchFormBadge.innerText = comp.name;
  const importCompBadge = document.getElementById('import-comp-badge');
  if (importCompBadge) importCompBadge.innerText = comp.name;

  // Hidden input for match form
  const matchCompHidden = document.getElementById('match-form-competition-id');
  if (matchCompHidden) matchCompHidden.value = activeCompetitionId;

  // Standings section badges
  const standingsActiveName = document.getElementById('standings-comp-active-name');
  if (standingsActiveName) standingsActiveName.innerText = label;
  const standingsCompBadge = document.getElementById('standings-comp-title-badge');
  if (standingsCompBadge) standingsCompBadge.innerText = comp.name;
  const standingTeamBadge = document.getElementById('standing-team-comp-badge');
  if (standingTeamBadge) standingTeamBadge.innerText = comp.name;

  // Hidden input for standings form
  const standingCompHidden = document.getElementById('standing-team-comp-id');
  if (standingCompHidden) standingCompHidden.value = activeCompetitionId;

  // International notice in standings
  const intlNotice = document.getElementById('standings-international-notice');
  if (intlNotice) {
    if (comp.type === 'international' || comp.name === 'Selecciones') {
      intlNotice.classList.remove('hidden');
    } else {
      intlNotice.classList.add('hidden');
    }
  }
}

async function refreshCompetitionAndTeamData() {
  allCompetitions = await getCompetitions();
  allTeams = await getTeams();
  setupCompetitionSelectors();
}

/* ==========================================================================
   NAVIGATION TABS
   ========================================================================== */
function setupAdminTabs() {
  const tabs = document.querySelectorAll('#admin-tabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(t => {
        t.className = 'px-3.5 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white whitespace-nowrap';
      });
      tab.className = 'px-3.5 py-2 text-xs font-bold rounded-lg bg-neon text-black whitespace-nowrap';

      const target = tab.getAttribute('data-tab');
      document.querySelectorAll('[id^="tab-"][id$="-content"]').forEach(el => el?.classList.add('hidden'));
      
      const activeEl = document.getElementById(`tab-${target}-content`);
      if (activeEl) activeEl.classList.remove('hidden');

      if (target === 'news') await loadNewsAdmin();
      if (target === 'teams') await loadTeamsAdmin();
      if (target === 'matches') await loadMatchesAdmin();
      if (target === 'standings') await loadStandingsAdmin();
      if (target === 'users') await loadUsersAdmin();
      if (target === 'polls') await loadPollsAdmin();
      if (target === 'debates') await loadDebatesAdmin();
      if (target === 'comments') await loadCommentsAdmin();
      if (target === 'porras') await loadPorrasAdmin();
      if (target === 'trivia') await loadTriviaAdmin();
      if (target === 'memes') await loadMemesAdmin();
      if (target === 'supabase') await loadSupabaseConfigTab();
    });
  });
}

async function setupDashboardCounters() {
  try {
    const [news, teams, matches, polls, debates, memes, trivia, users] = await Promise.all([
      getNews({ limit: 100 }),
      getTeams(),
      getMatches(),
      getPolls(),
      getDebates(),
      getMemes(),
      getTriviaQuestions(),
      getProfiles()
    ]);

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setVal('stat-news', news.length);
    setVal('stat-teams', teams.length);
    setVal('stat-matches', matches.length);
    setVal('stat-polls', polls.length);
    setVal('stat-debates', debates.length);
    setVal('stat-memes', memes.length);
    setVal('stat-trivia', trivia.length);
    setVal('stat-users', users.length);
  } catch (e) {
    console.error('Error fetching dashboard counters:', e);
  }
}

/* ==========================================================================
   1. EQUIPOS ADMIN (SINGLE TOP COMPETITION SELECTOR, NO REDUNDANT SELECTOR)
   ========================================================================== */
function setupTeamsAdmin() {
  const showAddBtn = document.getElementById('btn-show-add-team');
  const formBox = document.getElementById('team-form-box');
  const cancelBtn = document.getElementById('team-cancel');
  const form = document.getElementById('admin-team-form');

  showAddBtn?.addEventListener('click', () => {
    form?.reset();
    const teamIdInput = document.getElementById('team-id');
    if (teamIdInput) teamIdInput.value = '';
    const teamCompHidden = document.getElementById('team-competition-id');
    if (teamCompHidden) teamCompHidden.value = activeCompetitionId;
    
    const teamTitle = document.getElementById('team-form-title');
    if (teamTitle) teamTitle.innerText = 'Añadir Nuevo Equipo';
    
    updateAllCompetitionBadges();
    formBox?.classList.remove('hidden');
    formBox?.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('team-id')?.value;
    const competition_id = activeCompetitionId;
    const name = document.getElementById('team-name')?.value.trim();
    const short_name = document.getElementById('team-short-name')?.value.trim();
    const shield = document.getElementById('team-shield')?.value.trim();

    if (!competition_id) {
      showToast('Es obligatorio seleccionar la competición para el equipo.', 'error');
      return;
    }

    if (!name) {
      showToast('Introduce el nombre del equipo.', 'error');
      return;
    }

    try {
      await saveTeam({
        ...(id ? { id } : {}),
        competition_id,
        name,
        short_name,
        shield
      });

      const comp = getActiveCompetition();
      showToast(`Equipo "${name}" guardado correctamente en ${comp.name}.`, 'success');
      formBox?.classList.add('hidden');
      await refreshCompetitionAndTeamData();
      await loadTeamsAdmin();
      await setupDashboardCounters();
    } catch (err) {
      showToast(err.message || 'Error al guardar equipo', 'error');
    }
  });

  const searchInput = document.getElementById('team-search');
  const sortSelect = document.getElementById('team-sort-select');

  searchInput?.addEventListener('input', () => filterAndRenderTeams());
  sortSelect?.addEventListener('change', () => filterAndRenderTeams());
}

async function loadTeamsAdmin() {
  allTeams = await getTeams();
  filterAndRenderTeams();
}

function filterAndRenderTeams() {
  const tbody = document.getElementById('admin-teams-table-body');
  if (!tbody) return;

  const searchVal = document.getElementById('team-search')?.value.toLowerCase().trim() || '';
  const sortVal = document.getElementById('team-sort-select')?.value || 'name-asc';

  // Strictly filter by activeCompetitionId
  let filtered = allTeams.filter(t => t.competition_id === activeCompetitionId);

  if (searchVal) {
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(searchVal) || 
      (t.short_name && t.short_name.toLowerCase().includes(searchVal)) ||
      (t.id && t.id.toLowerCase().includes(searchVal))
    );
  }

  filtered.sort((a, b) => {
    if (sortVal === 'name-asc') return a.name.localeCompare(b.name);
    if (sortVal === 'name-desc') return b.name.localeCompare(a.name);
    if (sortVal === 'created-desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    return 0;
  });

  const comp = getActiveCompetition();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-400">
          <div class="empty-state py-4">
            <h4 class="text-white font-bold text-sm mb-1">No hay equipos registrados para ${comp.name}</h4>
            <p class="text-xs text-slate-400">Haz clic en "+ Añadir Equipo" para crear el primer club de esta competición.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const shieldHtml = t.shield ? `
      <img src="${t.shield}" alt="${t.name}" class="w-7 h-7 object-contain mx-auto" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=60&auto=format&fit=crop&q=80';" />
    ` : `
      <div class="w-7 h-7 rounded-full bg-[#161c2d] border border-[#232838] flex items-center justify-center text-[11px] font-black text-neon mx-auto">
        ${(t.short_name || t.name.substring(0, 3)).toUpperCase()}
      </div>
    `;

    return `
      <tr class="hover:bg-[#111522] transition-colors border-b border-[#171b26]">
        <td class="py-3 px-4 text-center">${shieldHtml}</td>
        <td class="py-3 px-4 font-bold text-white">${t.name}</td>
        <td class="py-3 px-4 font-mono text-neon font-bold">${t.short_name || '—'}</td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#141b2c] border border-neon/30 text-neon">
            <span>${getCompEmoji(comp.name)}</span>
            <span>${comp.name}</span>
          </span>
        </td>
        <td class="py-3 px-4 text-slate-500 font-mono text-[11px] select-all truncate max-w-xs">${t.id}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <button data-edit-team="${t.id}" class="text-neon hover:underline font-bold text-xs p-1" title="Editar equipo">
              Editar
            </button>
            <button data-delete-team="${t.id}" class="text-red-400 hover:text-red-300 font-bold text-xs p-1" title="Eliminar equipo">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Edit Team handler
  tbody.querySelectorAll('[data-edit-team]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-team');
      const team = allTeams.find(x => x.id === id);
      if (!team) return;

      document.getElementById('team-id').value = team.id;
      document.getElementById('team-competition-id').value = team.competition_id || activeCompetitionId;
      document.getElementById('team-name').value = team.name;
      document.getElementById('team-short-name').value = team.short_name || '';
      document.getElementById('team-shield').value = team.shield || '';
      
      const formBox = document.getElementById('team-form-box');
      const teamTitle = document.getElementById('team-form-title');
      if (teamTitle) teamTitle.innerText = `Editar Equipo: ${team.name}`;
      
      formBox?.classList.remove('hidden');
      formBox?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Delete Team handler
  tbody.querySelectorAll('[data-delete-team]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-team');
      const team = allTeams.find(x => x.id === id);
      if (!team) return;

      if (!confirm(`¿Eliminar definitivamente el equipo "${team.name}" de la base de datos?`)) return;

      try {
        await deleteTeam(id);
        showToast(`Equipo "${team.name}" eliminado.`, 'info');
        await refreshCompetitionAndTeamData();
        await loadTeamsAdmin();
        await setupDashboardCounters();
      } catch (err) {
        showToast(err.message || 'Error al eliminar equipo', 'error');
      }
    });
  });
}

/* ==========================================================================
   2. NOTICIAS MANAGEMENT
   ========================================================================== */
function setupNewsAdmin() {
  const showBtn = document.getElementById('btn-show-create-news');
  const formBox = document.getElementById('news-form-box');
  const cancelBtn = document.getElementById('news-form-cancel');
  const form = document.getElementById('admin-news-form');

  showBtn?.addEventListener('click', () => {
    form?.reset();
    const editId = document.getElementById('edit-news-id');
    if (editId) editId.value = '';
    const newsTitle = document.getElementById('news-form-title');
    if (newsTitle) newsTitle.innerText = 'Crear Noticia';
    formBox?.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-news-id')?.value;
    const title = document.getElementById('news-form-title-input')?.value.trim();
    const category = document.getElementById('news-form-category')?.value;
    const imageUrl = document.getElementById('news-form-image')?.value.trim();
    const excerpt = document.getElementById('news-form-excerpt')?.value.trim();
    const content = document.getElementById('news-form-content')?.value.trim();
    const published = document.getElementById('news-form-published')?.checked;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      if (id) {
        await updateNews(id, { title, category, image_url: imageUrl, excerpt, content, published });
        showToast('Noticia actualizada.', 'success');
      } else {
        await createNews({
          title,
          slug,
          category,
          image_url: imageUrl,
          excerpt,
          content,
          published,
          author_id: currentUser.id,
          author_name: currentUser.profile?.nickname || 'FUTBOL DE TODO EL MUNDO Redacción'
        });
        showToast('Noticia creada correctamente.', 'success');
      }
      formBox?.classList.add('hidden');
      await loadNewsAdmin();
      await setupDashboardCounters();
    } catch (err) {
      showToast(err.message || 'Error al guardar noticia', 'error');
    }
  });
}

async function loadNewsAdmin() {
  const tbody = document.getElementById('admin-news-table-body');
  if (!tbody) return;

  try {
    const list = await getNews({ limit: 100 });
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">No hay noticias registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(n => `
      <tr class="hover:bg-[#121622] transition-colors border-b border-[#171b26]">
        <td class="py-3 px-4 font-bold text-white max-w-sm truncate">${n.title}</td>
        <td class="py-3 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neon/15 text-neon">${n.category}</span></td>
        <td class="py-3 px-3">${n.published ? '<span class="text-neon font-semibold text-[11px]">Publicada</span>' : '<span class="text-slate-400 text-[11px]">Borrador</span>'}</td>
        <td class="py-3 px-3 text-slate-400 text-[11px]">${new Date(n.created_at).toLocaleDateString('es-ES')}</td>
        <td class="py-3 px-4 text-right space-x-2">
          <button data-edit-news="${n.id}" class="text-neon hover:underline font-bold text-xs">Editar</button>
          <button data-delete-news="${n.id}" class="text-red-400 hover:underline font-bold text-xs">Eliminar</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit-news]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-news');
        const item = list.find(x => x.id === id);
        if (!item) return;
        document.getElementById('edit-news-id').value = item.id;
        document.getElementById('news-form-title-input').value = item.title;
        document.getElementById('news-form-category').value = item.category;
        document.getElementById('news-form-image').value = item.image_url || '';
        document.getElementById('news-form-excerpt').value = item.excerpt || '';
        document.getElementById('news-form-content').value = item.content;
        document.getElementById('news-form-published').checked = item.published;
        const titleEl = document.getElementById('news-form-title');
        if (titleEl) titleEl.innerText = 'Editar Noticia';
        document.getElementById('news-form-box')?.classList.remove('hidden');
      });
    });

    tbody.querySelectorAll('[data-delete-news]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta noticia?')) return;
        const id = btn.getAttribute('data-delete-news');
        await deleteNews(id);
        showToast('Noticia eliminada.', 'info');
        await loadNewsAdmin();
        await setupDashboardCounters();
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-400">Error al cargar noticias.</td></tr>`;
  }
}

/* ==========================================================================
   3. PARTIDOS / RESULTADOS ADMIN (SINGLE TOP SELECTOR & STRICT ISOLATION)
   ========================================================================== */
function updateMatchFormTeamsForActiveCompetition() {
  const homeSelect = document.getElementById('match-form-home-team');
  const awaySelect = document.getElementById('match-form-away-team');
  if (!homeSelect || !awaySelect) return;

  const comp = getActiveCompetition();

  // ONLY teams belonging to activeCompetitionId
  const compTeams = allTeams.filter(t => t.competition_id === activeCompetitionId);

  const buildOptions = (placeholder) => {
    if (compTeams.length === 0) {
      return `<option value="">⚠️ No hay equipos registrados en ${comp.name}. Añádelos en la pestaña "Equipos".</option>`;
    }
    return `<option value="">${placeholder}</option>` + compTeams.map(t => `
      <option value="${t.id}" data-shield="${t.shield || ''}">
        ${t.name} ${t.short_name ? `(${t.short_name})` : ''}
      </option>
    `).join('');
  };

  homeSelect.innerHTML = buildOptions('Seleccionar equipo local...');
  awaySelect.innerHTML = buildOptions('Seleccionar equipo visitante...');

  // Auto-sync shields
  homeSelect.onchange = (e) => {
    const opt = homeSelect.selectedOptions[0];
    const shield = opt ? opt.getAttribute('data-shield') || '' : '';
    const hShield = document.getElementById('match-form-home-shield');
    if (hShield) hShield.value = shield;
  };

  awaySelect.onchange = (e) => {
    const opt = awaySelect.selectedOptions[0];
    const shield = opt ? opt.getAttribute('data-shield') || '' : '';
    const aShield = document.getElementById('match-form-away-shield');
    if (aShield) aShield.value = shield;
  };
}

function setupMatchesAdmin() {
  const showBtn = document.getElementById('btn-show-create-match');
  const formBox = document.getElementById('match-form-box');
  const cancelBtn = document.getElementById('match-form-cancel');
  const form = document.getElementById('admin-match-form');

  // Toggle ChatGPT Importer
  const toggleImportBtn = document.getElementById('btn-toggle-import-jornada');
  const importBox = document.getElementById('chatgpt-import-box');
  toggleImportBtn?.addEventListener('click', () => {
    importBox?.classList.toggle('hidden');
    updateAllCompetitionBadges();
  });

  // ChatGPT Search Generator
  const btnGenerateSearch = document.getElementById('btn-generate-chatgpt-search');
  const promptDisplay = document.getElementById('chatgpt-prompt-display');
  const promptText = document.getElementById('chatgpt-prompt-text');
  const btnCopyPrompt = document.getElementById('btn-copy-actual-prompt');

  btnGenerateSearch?.addEventListener('click', () => {
    const comp = getActiveCompetition();
    const season = document.getElementById('import-season-input')?.value || '2026/2027';
    const matchday = document.getElementById('import-matchday-input')?.value || '1';

    const prompt = `Actúa como analista deportivo de FUTBOL DE TODO EL MUNDO. Realiza una búsqueda web en tiempo real sobre la ${comp.name} de fútbol para la Jornada ${matchday} de la temporada ${season}.

Proporciona la lista exacta de todos los partidos de esa jornada en este formato estructurado (sin formato Markdown adicional ni comentarios):

JORNADA: ${matchday}
COMPETICION: ${comp.name}
FECHA: YYYY-MM-DDTHH:MM:SSZ
LOCAL: Nombre Exacto Equipo Local
VISITANTE: Nombre Exacto Equipo Visitante
ESTADIO: Nombre Estadio
ESTADO: scheduled (o finished o live)
RESULTADO: GolesLocal-GolesVisitante (o guion - si no se ha jugado)
---`;

    if (promptText) promptText.innerText = prompt;
    if (promptDisplay) promptDisplay.classList.remove('hidden');
  });

  btnCopyPrompt?.addEventListener('click', () => {
    if (promptText) {
      navigator.clipboard.writeText(promptText.innerText);
      showToast('Prompt copiado al portapapeles.', 'success');
    }
  });

  // Analyze pasted text
  const btnAnalyze = document.getElementById('btn-analyze-matchday');
  const previewBox = document.getElementById('matchday-preview-box');
  const previewSummary = document.getElementById('matchday-preview-summary');
  const previewTbody = document.getElementById('matchday-preview-tbody');
  let parsedMatchesToImport = [];

  btnAnalyze?.addEventListener('click', () => {
    const rawText = document.getElementById('chatgpt-matchday-textarea')?.value.trim();
    if (!rawText) {
      showToast('Pega primero el texto devuelto por ChatGPT.', 'error');
      return;
    }

    const season = document.getElementById('import-season-input')?.value || '2026/2027';
    const defaultMatchday = parseInt(document.getElementById('import-matchday-input')?.value || '1', 10);
    const comp = getActiveCompetition();

    parsedMatchesToImport = parseMatchdayStructuredText(rawText, activeCompetitionId, comp.name, season, defaultMatchday);

    if (parsedMatchesToImport.length === 0) {
      showToast('No se pudieron reconocer partidos en el texto introducido.', 'error');
      if (previewBox) previewBox.classList.add('hidden');
      return;
    }

    const validCount = parsedMatchesToImport.filter(m => m.isValid).length;
    const warningsCount = parsedMatchesToImport.length - validCount;

    if (previewSummary) {
      previewSummary.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-white">Partidos analizados: <strong class="text-neon">${parsedMatchesToImport.length}</strong></span>
          <span class="text-xs text-slate-400">· Competición: <strong class="text-white">${comp.name}</strong></span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">${validCount} Válidos</span>
          ${warningsCount > 0 ? `<span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">${warningsCount} con advertencias</span>` : ''}
        </div>
      `;
    }

    if (previewTbody) {
      previewTbody.innerHTML = parsedMatchesToImport.map(m => `
        <tr class="hover:bg-[#121622] border-b border-[#171b26]">
          <td class="py-2.5 px-3 font-bold text-neon">J${m.matchday}</td>
          <td class="py-2.5 px-3 text-slate-300 font-mono">${new Date(m.match_date).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
          <td class="py-2.5 px-3 font-bold text-white">${m.home_team}</td>
          <td class="py-2.5 px-3 font-bold text-white">${m.away_team}</td>
          <td class="py-2.5 px-3 text-slate-400">${m.stadium || '—'}</td>
          <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'finished' ? 'bg-slate-800 text-slate-300' : 'bg-neon/15 text-neon'}">${m.status}</span></td>
          <td class="py-2.5 px-3 font-mono font-bold">${m.home_score !== null ? `${m.home_score} - ${m.away_score}` : '—'}</td>
          <td class="py-2.5 px-3">${m.isValid ? '<span class="text-emerald-400 font-bold">✅ Correcto</span>' : `<span class="text-amber-400 font-bold text-[11px]">${m.validationMsg}</span>`}</td>
        </tr>
      `).join('');
    }

    if (previewBox) previewBox.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-preview')?.addEventListener('click', () => {
    if (previewBox) previewBox.classList.add('hidden');
  });

  document.getElementById('btn-clear-chatgpt')?.addEventListener('click', () => {
    const textarea = document.getElementById('chatgpt-matchday-textarea');
    if (textarea) textarea.value = '';
    if (previewBox) previewBox.classList.add('hidden');
  });

  // Save imported matches into Supabase
  document.getElementById('btn-save-matchday')?.addEventListener('click', async () => {
    if (!parsedMatchesToImport || parsedMatchesToImport.length === 0) return;
    const updateExisting = document.getElementById('matchday-update-existing')?.checked || false;
    const saveBtn = document.getElementById('btn-save-matchday');
    
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Guardando en Supabase...';
    }

    try {
      const result = await importMatchdayBatch(parsedMatchesToImport, updateExisting, activeCompetitionId);
      const comp = getActiveCompetition();
      
      let msg = `Importación en ${comp.name}: ${result.newCount} nuevos, ${result.updatedCount} actualizados, ${result.skippedCount} omitidos.`;
      if (result.errors && result.errors.length > 0) {
        msg += ` (${result.errors.length} errores)`;
        console.warn('[Incidencias de importación]', result.errors);
        showToast(msg, 'error');
        alert(`Resultado de la importación:\n• Nuevos: ${result.newCount}\n• Actualizados: ${result.updatedCount}\n• Omitidos: ${result.skippedCount}\n\nErrores encontrados:\n` + result.errors.map(e => `• ${e.match}: ${e.message}`).join('\n'));
      } else {
        showToast(msg, 'success');
      }

      if (importBox) importBox.classList.add('hidden');
      if (previewBox) previewBox.classList.add('hidden');

      await loadMatchesAdmin();
      await setupDashboardCounters();
    } catch (err) {
      console.error('[Error importación jornada]', err);
      showToast(err.message || 'Error durante la importación', 'error');
      alert('Error de Supabase al guardar la jornada:\n' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Guardar jornada en Supabase';
      }
    }
  });

  // Manual Match Registration
  showBtn?.addEventListener('click', () => {
    form?.reset();
    const editId = document.getElementById('edit-match-id');
    if (editId) editId.value = '';
    const matchCompHidden = document.getElementById('match-form-competition-id');
    if (matchCompHidden) matchCompHidden.value = activeCompetitionId;
    
    updateMatchFormTeamsForActiveCompetition();
    updateAllCompetitionBadges();

    const matchTitle = document.getElementById('match-form-title');
    if (matchTitle) matchTitle.innerText = 'Registrar Partido';
    formBox?.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-match-id')?.value;
    const competition_id = activeCompetitionId;
    const season = document.getElementById('match-form-season')?.value.trim() || '2026/2027';
    const matchday = parseInt(document.getElementById('match-form-jornada')?.value, 10);
    const matchDate = document.getElementById('match-form-date')?.value;
    const status = document.getElementById('match-form-status')?.value;
    const stadium = document.getElementById('match-form-stadium')?.value.trim() || '';

    const home_team_id = document.getElementById('match-form-home-team')?.value;
    const homeShield = document.getElementById('match-form-home-shield')?.value.trim();
    const homeScoreRaw = document.getElementById('match-form-home-score')?.value;
    const homeScore = homeScoreRaw !== '' ? parseInt(homeScoreRaw, 10) : null;

    const away_team_id = document.getElementById('match-form-away-team')?.value;
    const awayShield = document.getElementById('match-form-away-shield')?.value.trim();
    const awayScoreRaw = document.getElementById('match-form-away-score')?.value;
    const awayScore = awayScoreRaw !== '' ? parseInt(awayScoreRaw, 10) : null;

    if (!competition_id) {
      showToast('Es obligatorio seleccionar la competición para el partido.', 'error');
      return;
    }

    if (!home_team_id || !away_team_id) {
      showToast('Debes seleccionar tanto el equipo local como el visitante.', 'error');
      return;
    }

    if (home_team_id === away_team_id) {
      showToast('El equipo local y el equipo visitante no pueden ser el mismo.', 'error');
      return;
    }

    const payload = {
      ...(id ? { id } : {}),
      competition_id,
      season,
      matchday,
      match_date: new Date(matchDate).toISOString(),
      status,
      stadium,
      home_team_id,
      away_team_id,
      home_shield: homeShield,
      home_score: homeScore,
      away_shield: awayShield,
      away_score: awayScore
    };

    try {
      await saveMatch(payload);
      const comp = getActiveCompetition();
      showToast(`Partido guardado con éxito en ${comp.name}.`, 'success');
      formBox?.classList.add('hidden');
      
      if (status === 'finished') {
        if (comp.type === 'league') {
          if (confirm(`¿Deseas recalcular la clasificación oficial de "${comp.name}" ahora para reflejar este resultado?`)) {
            await recalculateStandingsFromMatches(season, competition_id);
            showToast(`Clasificación de ${comp.name} recalculada con éxito.`, 'success');
          }
        }
      }

      await loadMatchesAdmin();
      await setupDashboardCounters();
    } catch (err) {
      showToast(err.message || 'Error al guardar partido', 'error');
    }
  });

  // Filter triggers
  ['admin-filter-season', 'admin-filter-matchday', 'admin-filter-status', 'admin-search-team'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => filterAndRenderMatches());
  });
}

function parseMatchdayStructuredText(text, targetCompId, targetCompName, defaultSeason, defaultMatchday) {
  const blocks = text.split(/---|\n\n+/).filter(b => b.trim());
  const parsed = [];

  const compTeams = allTeams.filter(t => t.competition_id === targetCompId);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const data = {};

    lines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim().toUpperCase();
        const val = line.substring(colonIdx + 1).trim();
        data[key] = val;
      }
    });

    const localName = data['LOCAL'] || data['HOME'] || data['EQUIPO LOCAL'] || '';
    const awayName = data['VISITANTE'] || data['AWAY'] || data['EQUIPO VISITANTE'] || '';

    if (!localName || !awayName) continue;

    const matchday = parseInt(data['JORNADA'] || data['MATCHDAY'] || defaultMatchday, 10);
    const stadium = data['ESTADIO'] || data['STADIUM'] || '';
    const statusRaw = (data['ESTADO'] || data['STATUS'] || 'scheduled').toLowerCase();
    const status = statusRaw.includes('fin') || statusRaw.includes('term') ? 'finished' : statusRaw.includes('vivo') || statusRaw.includes('play') ? 'live' : 'scheduled';

    let homeScore = null;
    let awayScore = null;
    const resRaw = data['RESULTADO'] || data['SCORE'] || '';
    if (resRaw && resRaw.includes('-')) {
      const parts = resRaw.split('-').map(p => parseInt(p.trim(), 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        homeScore = parts[0];
        awayScore = parts[1];
      }
    }

    let matchDate = new Date().toISOString();
    if (data['FECHA'] || data['DATE']) {
      const parsedDate = new Date(data['FECHA'] || data['DATE']);
      if (!isNaN(parsedDate.getTime())) {
        matchDate = parsedDate.toISOString();
      }
    }

    // Match teams to competition teams
    const homeTeamObj = compTeams.find(t => t.name.toLowerCase() === localName.toLowerCase() || (t.short_name && t.short_name.toLowerCase() === localName.toLowerCase()));
    const awayTeamObj = compTeams.find(t => t.name.toLowerCase() === awayName.toLowerCase() || (t.short_name && t.short_name.toLowerCase() === awayName.toLowerCase()));

    let isValid = true;
    let validationMsg = 'Válido';

    if (!homeTeamObj && !awayTeamObj) {
      validationMsg = `Equipos no encontrados en ${targetCompName}. Se registrarán bajo esta liga.`;
    } else if (!homeTeamObj) {
      validationMsg = `"${localName}" se asignará a ${targetCompName}`;
    } else if (!awayTeamObj) {
      validationMsg = `"${awayName}" se asignará a ${targetCompName}`;
    }

    parsed.push({
      competition_id: targetCompId,
      season: defaultSeason,
      matchday,
      match_date: matchDate,
      stadium,
      status,
      home_team: localName,
      away_team: awayName,
      home_team_id: homeTeamObj?.id || null,
      away_team_id: awayTeamObj?.id || null,
      home_shield: homeTeamObj?.shield || '',
      away_shield: awayTeamObj?.shield || '',
      home_score: homeScore,
      away_score: awayScore,
      isValid,
      validationMsg
    });
  }

  return parsed;
}

async function loadMatchesAdmin() {
  allAdminMatches = await getMatches();
  filterAndRenderMatches();
}

function filterAndRenderMatches() {
  const tbody = document.getElementById('admin-matches-table-body');
  if (!tbody) return;

  const seasonVal = document.getElementById('admin-filter-season')?.value || 'all';
  const matchdayVal = document.getElementById('admin-filter-matchday')?.value || 'all';
  const statusVal = document.getElementById('admin-filter-status')?.value || 'all';
  const searchVal = document.getElementById('admin-search-team')?.value.toLowerCase().trim() || '';

  // Strictly filter by activeCompetitionId
  let filtered = allAdminMatches.filter(m => (m.competition_id || 'comp_laliga') === activeCompetitionId);

  if (seasonVal !== 'all') filtered = filtered.filter(m => m.season === seasonVal);
  if (matchdayVal !== 'all') filtered = filtered.filter(m => Number(m.matchday) === Number(matchdayVal));
  if (statusVal !== 'all') filtered = filtered.filter(m => m.status === statusVal);
  if (searchVal) {
    filtered = filtered.filter(m => 
      (m.home_team && m.home_team.toLowerCase().includes(searchVal)) ||
      (m.away_team && m.away_team.toLowerCase().includes(searchVal)) ||
      (m.stadium && m.stadium.toLowerCase().includes(searchVal))
    );
  }

  const comp = getActiveCompetition();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-slate-400">
          <div class="empty-state py-4">
            <h4 class="text-white font-bold text-sm mb-1">No hay partidos registrados para ${comp.name}</h4>
            <p class="text-xs text-slate-400">Registra partidos manualmente con "+ Registrar Partido" o impórtalos en lote con "Añadir Jornada".</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(m => {
    let statusBadge = '';
    if (m.status === 'finished') {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">Finalizado</span>';
    } else if (m.status === 'live') {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-neon text-black animate-pulse">En Juego</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141b2c] border border-[#232838] text-slate-400">Programado</span>';
    }

    const d = new Date(m.match_date);
    const dateFormatted = !isNaN(d.getTime()) 
      ? d.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Fecha sin definir';

    return `
      <tr class="hover:bg-[#121622] transition-colors border-b border-[#171b26]">
        <td class="py-3 px-3">
          <span class="font-bold text-neon block text-xs">Jornada ${m.matchday}</span>
          <span class="text-[10px] text-slate-400">${comp.name}</span>
        </td>
        <td class="py-3 px-3">
          <span class="text-slate-300 text-xs block font-semibold">${dateFormatted}</span>
          <span class="text-slate-500 text-[10px] truncate max-w-xs block">${m.stadium || 'Estadio no definido'}</span>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-2">
            <!-- Home -->
            <div class="flex items-center gap-1.5 justify-end w-32 text-right truncate">
              <span class="text-xs font-bold text-white truncate">${m.home_team}</span>
              ${m.home_shield ? `<img src="${m.home_shield}" class="w-4 h-4 object-contain shrink-0" />` : ''}
            </div>

            <!-- Score -->
            <div class="px-2 py-0.5 rounded bg-[#07090f] border border-[#232838] text-xs font-mono font-black min-w-[50px] text-center">
              ${m.status === 'finished' || m.status === 'live' ? `
                <span class="${m.status === 'live' ? 'text-neon' : 'text-white'}">${m.home_score !== null ? m.home_score : 0} - ${m.away_score !== null ? m.away_score : 0}</span>
              ` : `
                <span class="text-slate-500 text-[10px]">VS</span>
              `}
            </div>

            <!-- Away -->
            <div class="flex items-center gap-1.5 justify-start w-32 text-left truncate">
              ${m.away_shield ? `<img src="${m.away_shield}" class="w-4 h-4 object-contain shrink-0" />` : ''}
              <span class="text-xs font-bold text-white truncate">${m.away_team}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-3 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right space-x-2">
          <button data-edit-match="${m.id}" class="text-neon hover:underline font-bold text-xs p-1" title="Editar partido">
            Editar
          </button>
          <button data-delete-match="${m.id}" class="text-red-400 hover:text-red-300 font-bold text-xs p-1" title="Eliminar partido">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Edit match
  tbody.querySelectorAll('[data-edit-match]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-match');
      const m = allAdminMatches.find(x => x.id === id);
      if (!m) return;

      document.getElementById('edit-match-id').value = m.id;
      document.getElementById('match-form-competition-id').value = m.competition_id || activeCompetitionId;
      document.getElementById('match-form-season').value = m.season || '2026/2027';
      document.getElementById('match-form-jornada').value = m.matchday;
      document.getElementById('match-form-status').value = m.status;
      document.getElementById('match-form-stadium').value = m.stadium || '';

      updateMatchFormTeamsForActiveCompetition();

      document.getElementById('match-form-home-team').value = m.home_team_id || '';
      document.getElementById('match-form-home-shield').value = m.home_shield || '';
      document.getElementById('match-form-home-score').value = m.home_score !== null ? m.home_score : '';

      document.getElementById('match-form-away-team').value = m.away_team_id || '';
      document.getElementById('match-form-away-shield').value = m.away_shield || '';
      document.getElementById('match-form-away-score').value = m.away_score !== null ? m.away_score : '';
      
      const d = new Date(m.match_date);
      const iso = !isNaN(d.getTime()) ? d.toISOString().substring(0, 16) : '';
      document.getElementById('match-form-date').value = iso;

      const titleEl = document.getElementById('match-form-title');
      if (titleEl) titleEl.innerText = 'Editar Partido';
      const matchBox = document.getElementById('match-form-box');
      matchBox?.classList.remove('hidden');
      matchBox?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Delete match
  tbody.querySelectorAll('[data-delete-match]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-match');
      const m = allAdminMatches.find(x => x.id === id);
      if (!m) return;

      if (!confirm(`¿Eliminar definitivamente el partido ${m.home_team} vs ${m.away_team}?`)) return;
      try {
        await deleteMatch(id);
        showToast('Partido eliminado.', 'info');
        await loadMatchesAdmin();
        await setupDashboardCounters();
      } catch (err) {
        showToast(err.message || 'Error al eliminar partido', 'error');
      }
    });
  });
}

/* ==========================================================================
   4. CLASIFICACIÓN ADMIN (SINGLE TOP SELECTOR & STRICT INDEPENDENT LEAGUES)
   ========================================================================== */
function updateStandingsTeamFormOptions() {
  const teamSelect = document.getElementById('standing-team-name');
  if (!teamSelect) return;

  const comp = getActiveCompetition();

  // Filter teams strictly belonging to activeCompetitionId
  const compTeams = allTeams.filter(t => t.competition_id === activeCompetitionId);

  if (compTeams.length === 0) {
    teamSelect.innerHTML = `<option value="">⚠️ No hay equipos registrados en ${comp.name}. Añádelos primero en "Equipos".</option>`;
    return;
  }

  teamSelect.innerHTML = `<option value="">Seleccionar equipo de ${comp.name}...</option>` + compTeams.map(t => `
    <option value="${t.id}" data-shield="${t.shield || ''}" data-name="${t.name}">
      ${t.name} ${t.short_name ? `(${t.short_name})` : ''}
    </option>
  `).join('');

  teamSelect.onchange = () => {
    const opt = teamSelect.selectedOptions[0];
    const shield = opt ? opt.getAttribute('data-shield') || '' : '';
    const sShield = document.getElementById('standing-team-shield');
    if (sShield) sShield.value = shield;
  };
}

function setupStandingsAdmin() {
  const showAddBtn = document.getElementById('btn-show-add-standing-team');
  const formBox = document.getElementById('standings-team-form-box');
  const cancelBtn = document.getElementById('standing-team-cancel');
  const form = document.getElementById('admin-standing-team-form');

  const gfInput = document.getElementById('standing-team-gf');
  const gcInput = document.getElementById('standing-team-gc');
  const dgInput = document.getElementById('standing-team-dg');
  const pgInput = document.getElementById('standing-team-pg');
  const peInput = document.getElementById('standing-team-pe');
  const ptsInput = document.getElementById('standing-team-points');

  const updateDg = () => {
    const gf = parseInt(gfInput?.value, 10) || 0;
    const gc = parseInt(gcInput?.value, 10) || 0;
    if (dgInput) dgInput.value = (gf - gc).toString();
  };
  gfInput?.addEventListener('input', updateDg);
  gcInput?.addEventListener('input', updateDg);

  const updateSuggestedPoints = () => {
    if (!document.getElementById('standing-team-id')?.value) {
      const pg = parseInt(pgInput?.value, 10) || 0;
      const pe = parseInt(peInput?.value, 10) || 0;
      if (ptsInput) ptsInput.value = (pg * 3 + pe).toString();
    }
  };
  pgInput?.addEventListener('input', updateSuggestedPoints);
  peInput?.addEventListener('input', updateSuggestedPoints);

  showAddBtn?.addEventListener('click', () => {
    form?.reset();
    const stId = document.getElementById('standing-team-id');
    if (stId) stId.value = '';
    const stCompHidden = document.getElementById('standing-team-comp-id');
    if (stCompHidden) stCompHidden.value = activeCompetitionId;
    
    const comp = getActiveCompetition();
    const stTitle = document.getElementById('standings-team-form-title');
    if (stTitle) stTitle.innerText = `Añadir Equipo a Clasificación (${comp.name})`;
    
    updateStandingsTeamFormOptions();
    updateAllCompetitionBadges();

    if (dgInput) dgInput.value = '0';
    if (ptsInput) ptsInput.value = '0';
    formBox?.classList.remove('hidden');
    formBox?.scrollIntoView({ behavior: 'smooth' });
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('standing-team-id')?.value;
    const position = parseInt(document.getElementById('standing-team-position')?.value, 10);
    const team_id = document.getElementById('standing-team-name')?.value;
    const shield = document.getElementById('standing-team-shield')?.value.trim();

    const pj = Math.max(0, parseInt(document.getElementById('standing-team-pj')?.value, 10) || 0);
    const pg = Math.max(0, parseInt(document.getElementById('standing-team-pg')?.value, 10) || 0);
    const pe = Math.max(0, parseInt(document.getElementById('standing-team-pe')?.value, 10) || 0);
    const pp = Math.max(0, parseInt(document.getElementById('standing-team-pp')?.value, 10) || 0);
    const gf = Math.max(0, parseInt(document.getElementById('standing-team-gf')?.value, 10) || 0);
    const gc = Math.max(0, parseInt(document.getElementById('standing-team-gc')?.value, 10) || 0);
    const dg = parseInt(document.getElementById('standing-team-dg')?.value, 10) || (gf - gc);
    const points = Math.max(0, parseInt(document.getElementById('standing-team-points')?.value, 10) || 0);

    if (!team_id) {
      showToast('Selecciona un equipo para añadirlo a la clasificación.', 'error');
      return;
    }

    try {
      await saveStandingTeam({
        ...(id ? { id } : {}),
        competition_id: activeCompetitionId,
        position,
        team_id,
        shield,
        pj,
        pg,
        pe,
        pp,
        gf,
        gc,
        dg,
        points
      });

      const comp = getActiveCompetition();
      showToast(`Equipo guardado en la clasificación de ${comp.name}.`, 'success');
      formBox?.classList.add('hidden');
      await loadStandingsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar equipo en la clasificación', 'error');
    }
  });

  const recalcBtn = document.getElementById('btn-recalculate-standings');
  recalcBtn?.addEventListener('click', async () => {
    const season = document.getElementById('standings-season-select')?.value || '2026/2027';
    const comp = getActiveCompetition();

    if (comp.type === 'international' || comp.name === 'Selecciones') {
      showToast('Las competiciones de selecciones no tienen tabla regular de liga.', 'info');
      return;
    }

    if (!confirm(`¿Recalcular la clasificación oficial de "${comp.name}" a partir de todos los partidos finalizados de la temporada ${season}?`)) return;

    try {
      await recalculateStandingsFromMatches(season, activeCompetitionId);
      showToast(`Clasificación de ${comp.name} recalculada con éxito.`, 'success');
      await loadStandingsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al recalcular la clasificación', 'error');
    }
  });
}

async function loadStandingsAdmin() {
  const tbody = document.getElementById('admin-standings-body');
  if (!tbody) return;

  const comp = getActiveCompetition();

  try {
    const list = await getStandings(comp.name);

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="py-12 text-center text-slate-400">
            <div class="empty-state py-4">
              <h4 class="text-white font-bold text-sm mb-1">No hay datos de clasificación para ${comp.name}</h4>
              <p class="text-xs text-slate-400">Usa "+ Añadir Equipo a Tabla" o haz clic en "Recalcular Liga Activa" tras registrar partidos.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(row => `
      <tr class="hover:bg-[#121622] transition-colors border-b border-[#171b26]">
        <td class="py-2.5 px-2 text-center font-bold text-neon">${row.position}</td>
        <td class="py-2.5 px-3 font-bold text-white flex items-center gap-2">
          ${row.shield ? `<img src="${row.shield}" class="w-5 h-5 object-contain" />` : ''}
          <span>${row.team}</span>
        </td>
        <td class="py-2.5 px-2 text-center text-slate-300 font-mono">${row.pj}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono">${row.pg}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono">${row.pe}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono">${row.pp}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono">${row.gf}</td>
        <td class="py-2.5 px-2 text-center text-slate-400 font-mono">${row.gc}</td>
        <td class="py-2.5 px-2 text-center font-mono font-bold ${row.dg > 0 ? 'text-neon' : row.dg < 0 ? 'text-red-400' : 'text-slate-400'}">${row.dg > 0 ? `+${row.dg}` : row.dg}</td>
        <td class="py-2.5 px-3 text-center font-black text-neon text-sm font-mono">${row.points}</td>
        <td class="py-2.5 px-4 text-right">
          <button data-delete-standing="${row.id}" class="text-red-400 hover:text-red-300 font-bold text-xs p-1" title="Eliminar de tabla">
            Eliminar
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-delete-standing]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-standing');
        if (!confirm('¿Eliminar esta fila de la tabla?')) return;
        try {
          await deleteStandingTeam(id);
          showToast('Registro eliminado de la clasificación.', 'info');
          await loadStandingsAdmin();
        } catch (e) {
          showToast(e.message || 'Error al eliminar fila', 'error');
        }
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="11" class="py-8 text-center text-red-400">Error al cargar clasificación.</td></tr>`;
  }
}

/* ==========================================================================
   5. USUARIOS REALES SUPABASE
   ========================================================================== */
function setupUsersAdmin() {
  document.getElementById('btn-refresh-users')?.addEventListener('click', async () => {
    await loadUsersAdmin();
    showToast('Lista de usuarios actualizada.', 'info');
  });
}

async function loadUsersAdmin() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  try {
    const list = await getProfiles();
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">No hay usuarios registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const isCurrentUser = currentUser && currentUser.id === u.id;
      return `
        <tr class="hover:bg-[#121622] transition-colors border-b border-[#171b26]">
          <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
            ${u.avatar_url ? `<img src="${u.avatar_url}" class="w-6 h-6 rounded-full object-cover" />` : `<div class="w-6 h-6 rounded-full bg-slate-800 text-neon font-bold text-[10px] flex items-center justify-center">${(u.nickname || 'U').charAt(0).toUpperCase()}</div>`}
            <span>${u.nickname || 'Sin apodo'}</span>
            ${isCurrentUser ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-neon/15 text-neon font-bold">Tú</span>' : ''}
          </td>
          <td class="py-3 px-4 text-slate-300">${u.email}</td>
          <td class="py-3 px-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-neon/20 text-neon border border-neon/30' : 'bg-slate-800 text-slate-400'}">${u.role}</span>
          </td>
          <td class="py-3 px-3 text-right font-mono font-bold text-neon">${u.points || 0} pts</td>
          <td class="py-3 px-4 text-right text-slate-400 text-xs">${new Date(u.created_at).toLocaleDateString('es-ES')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-400">Error al cargar usuarios.</td></tr>`;
  }
}

/* ==========================================================================
   6. ENCUESTAS, DEBATES, COMENTARIOS, PORRAS, TRIVIAL, MEMES, SUPABASE
   ========================================================================== */
function setupPollsAdmin() {
  const showBtn = document.getElementById('btn-show-create-poll');
  const formBox = document.getElementById('poll-form-box');
  const cancelBtn = document.getElementById('poll-form-cancel');
  const form = document.getElementById('admin-poll-form');

  showBtn?.addEventListener('click', () => {
    form?.reset();
    formBox?.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('poll-form-question')?.value.trim();
    const optInputs = form.querySelectorAll('.poll-opt-input');
    const options = Array.from(optInputs).map(i => i.value.trim()).filter(Boolean);

    if (options.length < 2) {
      showToast('Introduce al menos 2 opciones.', 'error');
      return;
    }

    try {
      await createPoll({ question, options });
      showToast('Encuesta creada.', 'success');
      formBox?.classList.add('hidden');
      await loadPollsAdmin();
    } catch (err) {
      showToast(err.message || 'Error al crear encuesta', 'error');
    }
  });
}

async function loadPollsAdmin() {
  const container = document.getElementById('admin-polls-list');
  if (!container) return;

  try {
    const list = await getPolls();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay encuestas.</div>`;
      return;
    }

    container.innerHTML = list.map(p => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'closed' ? 'bg-slate-800 text-slate-400' : 'bg-neon/15 text-neon'}">${p.status}</span>
          <h4 class="text-sm font-bold text-white mt-1">${p.question}</h4>
          <p class="text-xs text-slate-400">Opciones: ${(p.poll_options || []).map(o => `${o.option_text} (${o.votes_count || 0})`).join(' · ')}</p>
        </div>

        <div class="flex items-center gap-2">
          ${p.status === 'active' ? `
            <button data-close-poll="${p.id}" class="btn-secondary text-xs py-1.5 px-3">Cerrar</button>
          ` : ''}
          <button data-delete-poll="${p.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">Eliminar</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-close-poll]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-close-poll');
        await closePoll(id);
        showToast('Encuesta cerrada.', 'info');
        await loadPollsAdmin();
      });
    });

    container.querySelectorAll('[data-delete-poll]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta encuesta?')) return;
        const id = btn.getAttribute('data-delete-poll');
        await deletePoll(id);
        showToast('Encuesta eliminada.', 'info');
        await loadPollsAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function setupDebatesAdmin() {}

async function loadDebatesAdmin() {
  const container = document.getElementById('admin-debates-list');
  if (!container) return;

  try {
    const list = await getDebates();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay debates.</div>`;
      return;
    }

    container.innerHTML = list.map(d => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-xs text-slate-400">Autor: <strong class="text-white">${d.author_name}</strong> · ${new Date(d.created_at).toLocaleDateString('es-ES')}</span>
          <h4 class="text-sm font-bold text-white mt-1">${d.title}</h4>
          <p class="text-xs text-slate-400 line-clamp-1">${d.content}</p>
        </div>

        <button data-admin-del-debate="${d.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-debate]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este debate?')) return;
        const id = btn.getAttribute('data-admin-del-debate');
        await deleteDebate(id);
        showToast('Debate eliminado.', 'info');
        await loadDebatesAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function setupCommentsAdmin() {}

async function loadCommentsAdmin() {
  const container = document.getElementById('admin-comments-list');
  if (!container) return;

  try {
    const news = await getNews({ limit: 50 });
    let allComments = [];
    for (const n of news) {
      const comments = await getComments(n.id);
      comments.forEach(c => allComments.push({ ...c, newsTitle: n.title }));
    }

    if (allComments.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay comentarios en noticias.</div>`;
      return;
    }

    container.innerHTML = allComments.map(c => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-[11px] text-neon font-bold">En noticia: ${c.newsTitle}</span>
          <p class="text-xs text-slate-300 mt-1">"${c.content}"</p>
          <span class="text-[10px] text-slate-500">Por ${c.author_name} · ${new Date(c.created_at).toLocaleDateString('es-ES')}</span>
        </div>

        <button data-admin-del-comment="${c.id}" class="text-xs text-red-400 hover:underline font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-comment]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este comentario?')) return;
        const id = btn.getAttribute('data-admin-del-comment');
        await deleteComment(id);
        showToast('Comentario eliminado.', 'info');
        await loadCommentsAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function setupPorrasAdmin() {}

async function loadPorrasAdmin() {
  const container = document.getElementById('admin-porras-list');
  if (!container) return;

  try {
    const predictions = await getPredictions();
    if (predictions.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay predicciones registradas todavía.</div>`;
      return;
    }

    container.innerHTML = predictions.map(p => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4 text-xs">
        <div>
          <span class="font-bold text-white">${p.user_nickname}</span>
          <span class="text-slate-500">· Partido ID: ${p.match_id}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-bold text-neon tabular-nums">${p.predicted_home_score} - ${p.predicted_away_score}</span>
          <span class="text-slate-400">(+${p.points_awarded || 0} pts)</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

function setupTriviaAdmin() {
  const showBtn = document.getElementById('btn-show-create-trivia');
  const formBox = document.getElementById('trivia-form-box');
  const cancelBtn = document.getElementById('trivia-form-cancel');
  const form = document.getElementById('admin-trivia-form');

  showBtn?.addEventListener('click', () => {
    form?.reset();
    formBox?.classList.remove('hidden');
  });

  cancelBtn?.addEventListener('click', () => {
    formBox?.classList.add('hidden');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('trivia-q-input')?.value.trim();
    const optionA = document.getElementById('trivia-opt-a')?.value.trim();
    const optionB = document.getElementById('trivia-opt-b')?.value.trim();
    const optionC = document.getElementById('trivia-opt-c')?.value.trim();
    const optionD = document.getElementById('trivia-opt-d')?.value.trim();
    const correctOption = document.getElementById('trivia-correct-select')?.value;
    const points = parseInt(document.getElementById('trivia-points')?.value, 10);
    const explanation = document.getElementById('trivia-explanation')?.value.trim();

    try {
      await saveTriviaQuestion({
        question,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption,
        points,
        explanation
      });
      showToast('Pregunta de trivial creada.', 'success');
      formBox?.classList.add('hidden');
      await loadTriviaAdmin();
    } catch (err) {
      showToast(err.message || 'Error al guardar pregunta', 'error');
    }
  });
}

async function loadTriviaAdmin() {
  const container = document.getElementById('admin-trivia-list');
  if (!container) return;

  try {
    const list = await getTriviaQuestions();
    if (list.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">No hay preguntas de trivial.</div>`;
      return;
    }

    container.innerHTML = list.map(q => `
      <div class="fresh-card p-4 flex items-center justify-between gap-4">
        <div>
          <span class="text-xs text-neon font-bold">+${q.points || 10} pts · Correcta: Opción ${(q.correct_option || 'A').toUpperCase()}</span>
          <h4 class="text-sm font-bold text-white mt-1">${q.question}</h4>
          <p class="text-xs text-slate-400">A: ${q.option_a} | B: ${q.option_b} | C: ${q.option_c || '—'} | D: ${q.option_d || '—'}</p>
        </div>

        <button data-delete-trivia="${q.id}" class="text-xs text-red-400 hover:underline p-1 font-semibold">
          Eliminar
        </button>
      </div>
    `).join('');

    container.querySelectorAll('[data-delete-trivia]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        const id = btn.getAttribute('data-delete-trivia');
        await deleteTriviaQuestion(id);
        showToast('Pregunta eliminada.', 'info');
        await loadTriviaAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function setupMemesAdmin() {}

async function loadMemesAdmin() {
  const container = document.getElementById('admin-memes-list');
  if (!container) return;

  try {
    const list = await getMemes();
    if (list.length === 0) {
      container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-500">No hay memes.</div>`;
      return;
    }

    container.innerHTML = list.map(m => `
      <div class="fresh-card overflow-hidden">
        <div class="aspect-square bg-slate-900 overflow-hidden">
          <img src="${m.image_url}" class="w-full h-full object-cover" />
        </div>
        <div class="p-3 space-y-2">
          <h4 class="text-xs font-bold text-white truncate">${m.title}</h4>
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>❤️ ${m.likes_count || 0}</span>
            <button data-admin-del-meme="${m.id}" class="text-red-400 hover:underline font-bold">Eliminar</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-admin-del-meme]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este meme?')) return;
        const id = btn.getAttribute('data-admin-del-meme');
        await deleteMeme(id);
        showToast('Meme eliminado.', 'info');
        await loadMemesAdmin();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/* ==========================================================================
   SUPABASE CONFIG TAB
   ========================================================================== */
function setupSupabaseConfigTab() {
  const form = document.getElementById('supabase-config-form');
  const clearBtn = document.getElementById('clear-supabase-config-btn');
  const copySqlBtn = document.getElementById('copy-sql-btn');

  const config = getSupabaseConfig();
  const urlInput = document.getElementById('config-supabase-url');
  const keyInput = document.getElementById('config-supabase-key');
  const statusBadge = document.getElementById('supabase-status-badge');

  if (urlInput) urlInput.value = config.url || '';
  if (keyInput) keyInput.value = config.key || '';

  if (statusBadge) {
    if (config.url && config.key) {
      statusBadge.className = 'px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      statusBadge.innerText = 'Conectado a Cloud';
    } else {
      statusBadge.className = 'px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
      statusBadge.innerText = 'Almacenamiento Local Activo';
    }
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput?.value.trim() || '';
    const key = keyInput?.value.trim() || '';
    saveSupabaseConfig(url, key);
    showToast('Configuración de Supabase guardada.', 'success');
    setTimeout(() => window.location.reload(), 600);
  });

  clearBtn?.addEventListener('click', () => {
    if (confirm('¿Restablecer configuración de Supabase al almacenamiento local?')) {
      clearSupabaseConfig();
      showToast('Configuración restablecida.', 'info');
      setTimeout(() => window.location.reload(), 600);
    }
  });

  copySqlBtn?.addEventListener('click', () => {
    const preview = document.getElementById('sql-preview-box');
    if (preview) {
      navigator.clipboard.writeText(preview.innerText);
      showToast('Script SQL copiado al portapapeles.', 'success');
    }
  });
}

async function loadSupabaseConfigTab() {
  const preview = document.getElementById('sql-preview-box');
  if (!preview) return;

  try {
    const res = await fetch('/supabase/schema.sql');
    if (res.ok) {
      const sql = await res.text();
      preview.innerText = sql;
    }
  } catch (e) {
    console.error('Error loading schema.sql:', e);
  }
}
