/**
 * FUTBOL DE TODO EL MUNDO - Global Navigation, Header, Mobile Tab Bar & Footer
 */
import { getCurrentUser, signOutUser } from './supabase.js';

export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="w-5 h-5 text-[#00d2ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
  } else {
    iconSvg = `<svg class="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span class="leading-snug">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export async function initNavigation(activePage = 'inicio') {
  const user = await getCurrentUser();
  const isAdmin = user && (user.profile?.role === 'admin' || user.email?.includes('admin'));

  // Header Zone
  const header = document.querySelector('header');
  if (header) {
    header.className = 'sticky top-0 z-40 bg-[#060911]/90 backdrop-blur-md border-b border-[#1e2a45]';
    header.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Zone 1: Official Brand Logo -->
        <a href="/index.html" class="flex items-center hover:opacity-90 transition-opacity shrink-0 py-1" aria-label="FUTBOL DE TODO EL MUNDO">
          <img 
            src="/logo.png" 
            alt="FUTBOL DE TODO EL MUNDO" 
            class="h-11 sm:h-13 w-auto object-contain shrink-0 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" 
          />
        </a>

        <!-- Zone 2: Navigation Links -->
        <nav class="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-300">
          <a href="/index.html" class="hover:text-neon transition-colors ${activePage === 'inicio' ? 'text-neon font-bold' : ''}">Inicio</a>
          <a href="/noticias.html" class="hover:text-neon transition-colors ${activePage === 'noticias' ? 'text-neon font-bold' : ''}">Noticias</a>
          <a href="/resultados.html" class="hover:text-neon transition-colors ${activePage === 'resultados' ? 'text-neon font-bold' : ''}">Resultados</a>
          <a href="/clasificacion.html" class="hover:text-neon transition-colors ${activePage === 'clasificacion' ? 'text-neon font-bold' : ''}">Clasificación</a>
          
          <!-- MIEMBROS PAGE -->
          <a href="/comunidad.html" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0e1935] border border-neon/30 text-neon hover:border-neon hover:bg-neon/10 transition-all ${activePage === 'comunidad' ? 'border-neon font-bold shadow-neon-sm' : ''}">
            <span class="w-2 h-2 rounded-full bg-neon animate-pulse"></span>
            <span>MIEMBROS</span>
          </a>

          <a href="/porras.html" class="hover:text-neon transition-colors ${activePage === 'porras' ? 'text-neon font-bold' : ''}">Porras</a>
          
          <div class="relative group">
            <button class="flex items-center gap-1 hover:text-neon transition-colors focus:outline-none">
              <span>Más</span>
              <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div class="absolute left-0 top-full pt-2 hidden group-hover:block w-48 z-50">
              <div class="bg-[#0c1220] border border-[#1e2a45] rounded-xl shadow-2xl py-2 px-1">
                <a href="/encuestas.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#131c30] hover:text-neon transition-colors ${activePage === 'encuestas' ? 'text-neon' : ''}">Encuestas</a>
                <a href="/trivial.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#131c30] hover:text-neon transition-colors ${activePage === 'trivial' ? 'text-neon' : ''}">Trivial Internacional</a>
                <a href="/memes.html" class="block px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#131c30] hover:text-neon transition-colors ${activePage === 'memes' ? 'text-neon' : ''}">Memes & Humor</a>
              </div>
            </div>
          </div>
        </nav>

        <!-- Zone 3: Primary Actions (WhatsApp & User Account) -->
        <div class="flex items-center gap-2.5">
          <!-- WhatsApp Channel Badge -->
          <a 
            href="https://whatsapp.com/channel/0029VbDJlmw1SWtAS47nAH0m" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-bold transition-all"
            title="Canal oficial de WhatsApp"
          >
            <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.182-.077.357.101.174.45 1.054 1.139 1.668.889.792 1.637 1.036 1.869 1.152.231.116.368.101.505-.058.138-.159.592-.694.751-.932.159-.238.318-.202.534-.116.217.087 1.372.646 1.609.764.238.118.397.176.455.275.058.099.058.577-.086.982zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2 22l4.966-1.301C8.423 21.534 10.156 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            <span>Canal WhatsApp</span>
          </a>

          ${user ? `
            ${isAdmin ? `
              <a href="/admin.html" title="Panel de Administración" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neon bg-[#0d162d] border border-neon/40 rounded-xl hover:bg-neon hover:text-black transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                <span class="hidden sm:inline">Admin</span>
              </a>
            ` : ''}

            <a href="/perfil.html" class="flex items-center gap-2 p-1 pl-2.5 bg-[#0d1527] border border-[#1e2a45] hover:border-neon/50 rounded-xl transition-all">
              <span class="text-xs font-semibold text-slate-200 truncate max-w-[100px] hidden sm:inline">${user.profile?.nickname || 'Miembro'}</span>
              <div class="w-8 h-8 rounded-lg overflow-hidden bg-[#152037] border border-[#1e2a45] flex items-center justify-center text-neon font-bold text-xs">
                ${user.profile?.avatar_url 
                  ? `<img src="${user.profile.avatar_url}" class="w-full h-full object-cover" />`
                  : (user.profile?.nickname || 'M').charAt(0).toUpperCase()}
              </div>
            </a>
            <button id="nav-logout-btn" title="Cerrar sesión" class="p-2 text-slate-400 hover:text-red-400 hover:bg-[#131c30] rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          ` : `
            <a href="/login.html" class="btn-neon text-xs py-2 px-4 shadow-neon-sm">
              Acceso Miembros
            </a>
          `}
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOutUser();
        showToast('Sesión cerrada correctamente.', 'info');
        setTimeout(() => window.location.href = '/index.html', 500);
      });
    }
  }

  // Mobile Bottom Tab Bar
  let bottomBar = document.getElementById('mobile-bottom-bar');
  if (!bottomBar) {
    bottomBar = document.createElement('div');
    bottomBar.id = 'mobile-bottom-bar';
    document.body.appendChild(bottomBar);
  }
  bottomBar.className = 'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060911]/95 backdrop-blur-lg border-t border-[#1e2a45] px-2 py-1.5';
  bottomBar.innerHTML = `
    <div class="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
      <a href="/index.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'inicio' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        <span class="text-[10px] font-semibold mt-1">Inicio</span>
      </a>

      <a href="/noticias.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'noticias' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Noticias</span>
      </a>

      <a href="/resultados.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'resultados' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Partidos</span>
      </a>

      <a href="/comunidad.html" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'comunidad' ? 'text-neon font-bold' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>
        <span class="text-[10px] font-semibold mt-1">Miembros</span>
      </a>

      <a href="${user ? '/perfil.html' : '/login.html'}" class="flex flex-col items-center justify-center min-h-[48px] w-full ${activePage === 'perfil' || activePage === 'login' ? 'text-neon' : 'text-slate-400 hover:text-slate-200'}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <span class="text-[10px] font-semibold mt-1">${user ? 'Perfil' : 'Entrar'}</span>
      </a>
    </div>
  `;

  // Global Footer
  const footer = document.querySelector('footer');
  if (footer) {
    footer.className = 'bg-[#04060d] border-t border-[#1e2a45] pt-12 pb-24 lg:pb-12 text-slate-400 text-sm';
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <!-- Col 1: Identity & International Football Info -->
          <div class="md:col-span-5 space-y-4">
            <div class="flex items-center">
              <img src="/logo.png" alt="FUTBOL DE TODO EL MUNDO" class="h-14 sm:h-16 w-auto max-w-[220px] object-contain" />
            </div>

            <p class="text-slate-300 text-sm leading-relaxed">
              🌍 <strong>FUTBOL DE TODO EL MUNDO</strong><br />
              🚨 Resultados en directo | Fichajes | Rumores<br />
              🏆 LaLiga, Premier League, Bundesliga, Serie A, Ligue 1 y Selecciones.
            </p>

            <div class="p-3.5 rounded-xl bg-[#0c1220] border border-[#1e2a45] space-y-2">
              <div class="flex items-center gap-2 text-neon font-bold text-xs uppercase tracking-wider">
                <span>⚽ COBERTURA INTERNACIONAL</span>
              </div>
              <p class="text-xs text-slate-300 leading-normal">
                Sigue al minuto los marcadores, la actualidad del mercado de traspasos y los grandes torneos internacionales.
              </p>
            </div>
          </div>

          <!-- Col 2: Navigation Links -->
          <div class="md:col-span-3 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Explorar</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="/noticias.html" class="hover:text-neon transition-colors">Noticias de Fútbol</a></li>
              <li><a href="/resultados.html" class="hover:text-neon transition-colors">Resultados & Partidos</a></li>
              <li><a href="/clasificacion.html" class="hover:text-neon transition-colors">Clasificaciones</a></li>
              <li><a href="/comunidad.html" class="hover:text-neon transition-colors font-semibold text-neon">Zona de MIEMBROS</a></li>
              <li><a href="/porras.html" class="hover:text-neon transition-colors">Porras de la Jornada</a></li>
            </ul>
          </div>

          <!-- Col 3: Interactive Features -->
          <div class="md:col-span-2 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Participa</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="/trivial.html" class="hover:text-neon transition-colors">Trivial Mundial</a></li>
              <li><a href="/encuestas.html" class="hover:text-neon transition-colors">Encuestas</a></li>
              <li><a href="/memes.html" class="hover:text-neon transition-colors">Memes Futboleros</a></li>
              <li><a href="/perfil.html" class="hover:text-neon transition-colors">Mi Perfil</a></li>
            </ul>
          </div>

          <!-- Col 4: Community Badge -->
          <div class="md:col-span-2 space-y-3">
            <h4 class="text-white font-bold text-xs uppercase tracking-wider">Comunidad</h4>
            <div class="p-3 bg-[#0c1220] rounded-xl border border-[#1e2a45] space-y-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-neon shadow-neon-sm"></span>
                <span class="text-xs font-semibold text-white">Canal Oficial</span>
              </div>
              <p class="text-[11px] text-slate-400">
                La mayor comunidad de información futbolística internacional.
              </p>
            </div>
          </div>
        </div>

        <!-- WhatsApp Channel Banner (Explicito de la consigna) -->
        <div class="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d2a20] via-[#0c1220] to-[#0c1220] border border-[#25D366]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div class="flex items-center gap-3.5 text-center sm:text-left">
            <div class="w-11 h-11 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366] shrink-0">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </div>
            <div>
              <h4 class="text-white font-bold text-sm">Canal Oficial de WhatsApp ⚽</h4>
              <p class="text-xs text-slate-300">Recibe resultados al instante, fichajes y exclusivas del fútbol internacional.</p>
            </div>
          </div>
          <a 
            href="https://whatsapp.com/channel/0029VbDJlmw1SWtAS47nAH0m" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-black font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 shrink-0"
          >
            <span>Seguir canal de WhatsApp</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        </div>

        <!-- Copyright & Developer Credit (Webs HuMar) -->
        <div class="border-t border-[#1e2a45] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© ${new Date().getFullYear()} FUTBOL DE TODO EL MUNDO. Todos los derechos reservados.</p>
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Desarrollado por</span>
            <a 
              href="https://webshumar.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0e172a] border border-neon/40 text-neon font-bold hover:bg-neon hover:text-black transition-all shadow-sm"
            >
              <span>Webs HuMar</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }
}
