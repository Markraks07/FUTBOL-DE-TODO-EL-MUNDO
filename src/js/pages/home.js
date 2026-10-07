/**
 * FUTBOL DE TODO EL MUNDO - Home Page Controller
 */
import { initNavigation } from '../navigation.js';
import { 
  getNews, 
  getMatches, 
  getStandings, 
  getPolls, 
  votePoll, 
  hasUserVoted,
  getDebates,
  getCurrentUser
} from '../supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initNavigation('inicio');
  await loadHomePageData();
});

async function loadHomePageData() {
  const user = await getCurrentUser();

  // 1. Featured News
  const newsContainer = document.getElementById('featured-news-container');
  if (newsContainer) {
    try {
      const newsList = await getNews({ limit: 4 });
      if (!newsList || newsList.length === 0) {
        newsContainer.innerHTML = `
          <div class="col-span-full empty-state">
            <div class="empty-state-icon">
              <svg class="w-7 h-7 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
            </div>
            <h3 class="text-white font-bold text-base mb-1">No hay noticias disponibles actualmente.</h3>
            <p class="text-xs text-slate-400 max-w-sm">La redacción de FUTBOL DE TODO EL MUNDO publicará pronto las últimas novedades de fichajes y resultados internacionales.</p>
          </div>
        `;
      } else {
        const [featured, ...rest] = newsList;
        let html = `
          <!-- Main Hero News Card -->
          <div class="lg:col-span-2">
            <a href="/noticia.html?id=${featured.id}" class="group block fresh-card overflow-hidden h-full flex flex-col border-neon/30">
              <div class="relative aspect-video w-full overflow-hidden bg-slate-900">
                ${featured.image_url 
                  ? `<img src="${featured.image_url}" alt="${featured.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />`
                  : `<div class="w-full h-full flex items-center justify-center bg-[#0c1220] text-slate-600"><svg class="w-12 h-12 text-neon/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`}
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4 space-y-2">
                  <div class="flex items-center gap-2 text-xs font-bold text-neon">
                    <span>${featured.category || 'Internacional'}</span>
                    <span aria-hidden="true" class="text-slate-400">·</span>
                    <span class="text-slate-300">${new Date(featured.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-black text-white group-hover:text-neon transition-colors leading-tight">
                    ${featured.title}
                  </h3>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col justify-between">
                <p class="text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-3">
                  ${featured.excerpt || (featured.content ? featured.content.substring(0, 140) + '...' : '')}
                </p>
                <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#1e2a45]">
                  <span>Por ${featured.author_name || 'FUTBOL DE TODO EL MUNDO'}</span>
                  <span class="text-neon font-bold flex items-center gap-1">Leer artículo &rarr;</span>
                </div>
              </div>
            </a>
          </div>

          <!-- Secondary Grid -->
          <div class="space-y-4">
            ${rest.map(n => `
              <a href="/noticia.html?id=${n.id}" class="group fresh-card p-3.5 flex gap-3.5 items-center">
                <div class="w-24 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                  ${n.image_url 
                    ? `<img src="${n.image_url}" alt="${n.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />`
                    : `<div class="w-full h-full flex items-center justify-center bg-[#0c1220] text-slate-600"><svg class="w-6 h-6 text-neon/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg></div>`}
                </div>
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-center gap-2 text-[11px] text-neon font-bold">
                    <span>${n.category || 'Fútbol'}</span>
                    <span class="text-slate-500">·</span>
                    <span class="text-slate-400">${new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h4 class="text-sm font-bold text-white group-hover:text-neon transition-colors line-clamp-2 leading-snug">
                    ${n.title}
                  </h4>
                </div>
              </a>
            `).join('')}
          </div>
        `;
        newsContainer.innerHTML = html;
      }
    } catch (err) {
      console.error(err);
      newsContainer.innerHTML = `<div class="p-6 text-center text-xs text-red-400">Error al cargar noticias.</div>`;
    }
  }

  // 2. Recent Matches
  const matchesContainer = document.getElementById('recent-matches-container');
  if (matchesContainer) {
    try {
      const matches = await getMatches();
      if (!matches || matches.length === 0) {
        matchesContainer.innerHTML = `
          <div class="empty-state py-8">
            <h4 class="text-white font-bold text-sm mb-1">No hay partidos registrados actualmente</h4>
            <p class="text-xs text-slate-400">Próximamente se mostrarán aquí los marcadores de las principales ligas mundiales.</p>
          </div>
        `;
      } else {
        const slice = matches.slice(0, 4);
        matchesContainer.innerHTML = slice.map(m => `
          <div class="fresh-card p-3.5 flex items-center justify-between gap-2">
            <div class="text-[11px] text-slate-400 font-mono flex flex-col">
              <span class="font-bold text-white">${m.competition || 'LaLiga'}</span>
              <span>${new Date(m.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div class="flex-1 px-3 flex items-center justify-center gap-3">
              <!-- Home -->
              <div class="flex items-center gap-2 justify-end text-right w-32 truncate">
                <span class="text-xs font-bold text-white truncate">${m.home_team}</span>
                ${m.home_shield ? `<img src="${m.home_shield}" class="w-5 h-5 object-contain" />` : `<span class="w-5 h-5 rounded-full bg-[#152037] text-[10px] flex items-center justify-center font-bold text-neon">⚽</span>`}
              </div>

              <!-- Score / Status -->
              <div class="px-2.5 py-1 rounded bg-[#060911] border border-[#1e2a45] min-w-[56px] text-center">
                ${m.status === 'finished' ? `
                  <span class="text-sm font-extrabold text-white tabular-nums">${m.home_score} - ${m.away_score}</span>
                  <span class="block text-[9px] text-slate-500 font-semibold uppercase">Final</span>
                ` : m.status === 'live' ? `
                  <span class="text-sm font-extrabold text-neon tabular-nums">${m.home_score ?? 0} - ${m.away_score ?? 0}</span>
                  <span class="block text-[9px] text-red-400 animate-pulse font-bold uppercase">En vivo</span>
                ` : `
                  <span class="text-xs font-bold text-slate-300">VS</span>
                  <span class="block text-[9px] text-slate-500 font-medium">Previo</span>
                `}
              </div>

              <!-- Away -->
              <div class="flex items-center gap-2 justify-start text-left w-32 truncate">
                ${m.away_shield ? `<img src="${m.away_shield}" class="w-5 h-5 object-contain" />` : `<span class="w-5 h-5 rounded-full bg-[#152037] text-[10px] flex items-center justify-center font-bold text-neon">⚽</span>`}
                <span class="text-xs font-bold text-white truncate">${m.away_team}</span>
              </div>
            </div>

            <a href="/porras.html" class="p-2 text-slate-400 hover:text-neon rounded-lg transition-colors" title="Pronosticar en Porras">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 3. Mini Standings Table
  const standingsContainer = document.getElementById('mini-standings-container');
  if (standingsContainer) {
    try {
      const standings = await getStandings();
      if (!standings || standings.length === 0) {
        standingsContainer.innerHTML = `
          <div class="empty-state py-8">
            <h4 class="text-white font-bold text-sm mb-1">No hay datos de clasificación actualmente</h4>
            <p class="text-xs text-slate-400">La tabla oficial se actualizará con cada jornada disputada.</p>
          </div>
        `;
      } else {
        const top5 = standings.slice(0, 5);
        standingsContainer.innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-[#1e2a45] text-slate-500 font-semibold uppercase text-[10px]">
                  <th class="py-2.5 px-2">#</th>
                  <th class="py-2.5 px-2">Equipo</th>
                  <th class="py-2.5 px-2 text-center">PJ</th>
                  <th class="py-2.5 px-2 text-center">DG</th>
                  <th class="py-2.5 px-2 text-right text-neon">PTS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#131f38]">
                ${top5.map((row, idx) => `
                  <tr class="hover:bg-[#131c30]/50 transition-colors">
                    <td class="py-2.5 px-2 font-bold ${idx < 4 ? 'text-neon' : 'text-slate-400'}">${row.position}</td>
                    <td class="py-2.5 px-2 font-semibold text-white flex items-center gap-2">
                      ${row.shield ? `<img src="${row.shield}" class="w-4 h-4 object-contain" />` : ''}
                      <span>${row.team}</span>
                    </td>
                    <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${row.pj}</td>
                    <td class="py-2.5 px-2 text-center text-slate-400 tabular-nums">${row.dg >= 0 ? `+${row.dg}` : row.dg}</td>
                    <td class="py-2.5 px-2 text-right font-extrabold text-neon tabular-nums">${row.points}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="mt-4 pt-3 border-t border-[#1e2a45] text-center">
            <a href="/clasificacion.html" class="text-xs font-bold text-neon hover:underline">Ver clasificación completa &rarr;</a>
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 4. Recent Member Debates
  const debatesContainer = document.getElementById('recent-debates-container');
  if (debatesContainer) {
    try {
      const debates = await getDebates();
      if (!debates || debates.length === 0) {
        debatesContainer.innerHTML = `
          <div class="empty-state py-8">
            <h4 class="text-white font-bold text-sm mb-1">No hay debates creados todavía</h4>
            <p class="text-xs text-slate-400 mb-3">Conviértete en Miembro e inicia la primera conversación.</p>
            <a href="/comunidad.html" class="btn-neon text-xs">Unirme a Miembros &rarr;</a>
          </div>
        `;
      } else {
        const slice = debates.slice(0, 3);
        debatesContainer.innerHTML = slice.map(d => `
          <a href="/comunidad.html" class="block fresh-card p-4 hover:border-neon/50 transition-colors">
            <div class="flex items-center gap-2.5 mb-2">
              <div class="w-6 h-6 rounded-full bg-[#152037] border border-[#1e2a45] flex items-center justify-center text-[10px] font-bold text-neon">
                ${(d.author_name || 'M').charAt(0).toUpperCase()}
              </div>
              <span class="text-xs font-bold text-slate-200">${d.author_name}</span>
              <span class="text-slate-500 text-xs">·</span>
              <span class="text-[11px] text-slate-400">${new Date(d.created_at).toLocaleDateString('es-ES')}</span>
            </div>
            <h4 class="text-sm font-bold text-white mb-1 leading-snug hover:text-neon transition-colors">${d.title}</h4>
            <p class="text-xs text-slate-400 line-clamp-2">${d.content}</p>
          </a>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  }
}
