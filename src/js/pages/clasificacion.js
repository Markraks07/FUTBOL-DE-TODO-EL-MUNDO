/**
 * FUTBOL DE TODO EL MUNDO - Clasificación Controller
 * Multi-Competition Isolation & Custom Qualification Zones
 */
import { initNavigation } from '../navigation.js';
import { getStandings, getCompetitions } from '../supabase.js';

let selectedCompetition = 'LaLiga';

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('clasificacion');
  
  // Check URL param if provided (?comp=Premier%20League)
  const urlParams = new URLSearchParams(window.location.search);
  const compParam = urlParams.get('comp');
  if (compParam) {
    selectedCompetition = compParam;
  }

  setupCompetitionTabs();
  await loadStandings();
});

function setupCompetitionTabs() {
  const tabButtons = document.querySelectorAll('.comp-tab-btn');
  tabButtons.forEach(btn => {
    const comp = btn.getAttribute('data-comp');
    if (comp === selectedCompetition) {
      btn.className = 'comp-tab-btn px-4 py-2 rounded-xl text-xs font-bold bg-neon text-black flex items-center gap-2 shadow-lg shadow-neon/10 shrink-0';
    } else {
      btn.className = 'comp-tab-btn px-4 py-2 rounded-xl text-xs font-bold bg-[#0c1220] border border-[#1e2a45] text-slate-300 hover:text-white shrink-0 flex items-center gap-2 transition-colors';
    }

    btn.addEventListener('click', async () => {
      selectedCompetition = comp;
      tabButtons.forEach(b => {
        b.className = 'comp-tab-btn px-4 py-2 rounded-xl text-xs font-bold bg-[#0c1220] border border-[#1e2a45] text-slate-300 hover:text-white shrink-0 flex items-center gap-2 transition-colors';
      });
      btn.className = 'comp-tab-btn px-4 py-2 rounded-xl text-xs font-bold bg-neon text-black flex items-center gap-2 shadow-lg shadow-neon/10 shrink-0';
      
      updateTitlesAndLegend();
      await loadStandings();
    });
  });

  updateTitlesAndLegend();
}

function updateTitlesAndLegend() {
  const badge = document.getElementById('competition-badge-label');
  const title = document.getElementById('standings-title');
  const legend = document.getElementById('standings-legend');

  const compNames = {
    'LaLiga': 'LaLiga EA Sports 🇪🇸',
    'Premier League': 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Bundesliga': 'Bundesliga 🇩🇪',
    'Serie A': 'Serie A Enilive 🇮🇹',
    'Ligue 1': 'Ligue 1 McDonald\'s 🇫🇷',
    'Selecciones': 'Ranking & Torneo de Selecciones 🌍'
  };

  if (badge) badge.innerText = compNames[selectedCompetition] || selectedCompetition;
  if (title) title.innerText = `Clasificación de ${selectedCompetition}`;

  if (legend) {
    if (selectedCompetition === 'Selecciones') {
      legend.innerHTML = `
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-neon"></span> Fase Final (1-4)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Clasificados (5-8)</span>
      `;
    } else if (selectedCompetition === 'Bundesliga') {
      legend.innerHTML = `
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#00d2ff]"></span> Champions League (1-4)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Europa League (5)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Conference (6)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Promoción (16)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Descenso (17-18)</span>
      `;
    } else if (selectedCompetition === 'Ligue 1') {
      legend.innerHTML = `
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#00d2ff]"></span> Champions League (1-3)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Pre-Champions (4)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Europa League (5)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Descenso (16-18)</span>
      `;
    } else {
      legend.innerHTML = `
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#00d2ff]"></span> Champions League (1-4)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Europa League (5-6)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Conference (7)</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> Descenso (18-20)</span>
      `;
    }
  }
}

async function loadStandings() {
  const tbody = document.getElementById('standings-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="10" class="py-12 text-center text-xs text-slate-500">Cargando clasificación de ${selectedCompetition}...</td></tr>`;

  try {
    const list = await getStandings(selectedCompetition);
    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="p-8">
            <div class="empty-state py-8">
              <h3 class="text-white font-bold text-base mb-1">No hay datos de clasificación para ${selectedCompetition}</h3>
              <p class="text-xs text-slate-400 max-w-sm">La tabla oficial se actualizará con los partidos y resultados registrados en FUTBOL DE TODO EL MUNDO.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((row) => {
      let zoneIndicator = 'border-l-2 border-transparent';
      let posColor = 'text-slate-300 font-bold';

      if (selectedCompetition === 'Selecciones') {
        if (row.position <= 4) {
          zoneIndicator = 'border-l-2 border-neon bg-neon/5';
          posColor = 'text-neon font-black';
        } else if (row.position <= 8) {
          zoneIndicator = 'border-l-2 border-emerald-500 bg-emerald-500/5';
          posColor = 'text-emerald-400 font-black';
        }
      } else if (selectedCompetition === 'Bundesliga') {
        if (row.position <= 4) {
          zoneIndicator = 'border-l-2 border-blue-500 bg-blue-500/5';
          posColor = 'text-blue-400 font-black';
        } else if (row.position === 5) {
          zoneIndicator = 'border-l-2 border-orange-500 bg-orange-500/5';
          posColor = 'text-orange-400 font-black';
        } else if (row.position === 6) {
          zoneIndicator = 'border-l-2 border-emerald-500 bg-emerald-500/5';
          posColor = 'text-emerald-400 font-black';
        } else if (row.position === 16) {
          zoneIndicator = 'border-l-2 border-amber-500 bg-amber-500/5';
          posColor = 'text-amber-400 font-black';
        } else if (row.position >= 17) {
          zoneIndicator = 'border-l-2 border-red-500 bg-red-500/5';
          posColor = 'text-red-400 font-black';
        }
      } else {
        if (row.position <= 4) {
          zoneIndicator = 'border-l-2 border-blue-500 bg-blue-500/5';
          posColor = 'text-blue-400 font-black';
        } else if (row.position <= 6) {
          zoneIndicator = 'border-l-2 border-orange-500 bg-orange-500/5';
          posColor = 'text-orange-400 font-black';
        } else if (row.position === 7) {
          zoneIndicator = 'border-l-2 border-emerald-500 bg-emerald-500/5';
          posColor = 'text-emerald-400 font-black';
        } else if (row.position >= 18) {
          zoneIndicator = 'border-l-2 border-red-500 bg-red-500/5';
          posColor = 'text-red-400 font-black';
        }
      }

      return `
        <tr class="hover:bg-[#151824] transition-colors ${zoneIndicator}">
          <td class="py-3 px-3 sm:px-4 text-center ${posColor} tabular-nums">${row.position}</td>
          <td class="py-3 px-3 sm:px-4 font-bold text-white flex items-center gap-3">
            ${row.shield ? `
              <img src="${row.shield}" alt="${row.team}" class="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=60&auto=format&fit=crop&q=80';" />
            ` : `
              <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1b202d] border border-[#262c3e] flex items-center justify-center text-[10px] font-bold text-neon shrink-0">⚽</div>
            `}
            <span class="truncate">${row.team}</span>
          </td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-300 tabular-nums">${row.pj}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pg}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pe}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums">${row.pp}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums hidden md:table-cell">${row.gf}</td>
          <td class="py-3 px-2 sm:px-3 text-center text-slate-400 tabular-nums hidden md:table-cell">${row.gc}</td>
          <td class="py-3 px-2 sm:px-3 text-center font-semibold ${row.dg > 0 ? 'text-neon' : row.dg < 0 ? 'text-red-400' : 'text-slate-400'} tabular-nums">
            ${row.dg > 0 ? `+${row.dg}` : row.dg}
          </td>
          <td class="py-3 px-3 sm:px-4 text-right font-black text-neon text-sm sm:text-base tabular-nums">${row.points}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-xs text-red-400">Error al cargar la clasificación de ${selectedCompetition}.</td></tr>`;
  }
}
