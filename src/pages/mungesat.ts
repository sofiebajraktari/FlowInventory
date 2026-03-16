import { signOut } from '../lib/auth.js'

const logoSmall = `<svg class="w-8 h-8 text-pharm-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 12c0-1.2-.5-2.3-1.4-3.1l-2.1-2.1-2.1 2.1a4.5 4.5 0 01-6.4 0l-2.1-2.1-2.1 2.1A4.5 4.5 0 004.5 12a4.5 4.5 0 001.4 3.2l2.1 2.1 2.1-2.1a4.5 4.5 0 016.4 0l2.1 2.1 2.1-2.1a4.5 4.5 0 001.4-3.2z" /></svg>`
const iconLogout = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>`

export function renderMungesat(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mx-auto max-w-2xl">
      <header class="flex items-center justify-between gap-4 rounded-xl border border-pharm-border bg-pharm-card/80 px-4 py-3 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <a href="#/mungesat" class="flex items-center gap-2 text-white no-underline">
            ${logoSmall}
            <span class="font-bold text-lg tracking-tight">FlowInventory</span>
          </a>
          <span class="rounded-full bg-pharm-primary/20 px-2.5 py-0.5 text-xs font-medium text-pharm-muted">Punëtor</span>
        </div>
        <button type="button" id="btn-signout" class="flex items-center gap-2 rounded-lg border border-pharm-border px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
          ${iconLogout}
          Dil
        </button>
      </header>
      <main class="mt-6">
        <div class="rounded-2xl border border-pharm-border bg-pharm-card/60 p-6 backdrop-blur-sm">
          <h2 class="text-lg font-semibold text-white mb-1">Mungesat e sotme</h2>
          <p class="text-sm text-slate-400 mb-6">Shto mungesat e barnave pa sasi. Pronari do të verifikojë dhe gjenerojë porositë.</p>
          <div class="rounded-xl border border-dashed border-pharm-border bg-pharm-bg/50 p-8 text-center">
            <p class="text-slate-400 text-sm">Këtu do të shfaqet kërkami i barit dhe lista e mungesave. (Hapi tjetër)</p>
          </div>
        </div>
      </main>
    </div>
  `
  document.getElementById('btn-signout')!.addEventListener('click', () => signOut())
}
