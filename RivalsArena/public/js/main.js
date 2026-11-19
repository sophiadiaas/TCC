// Dados persistentes vêm exclusivamente da API. A sessão usa cookie HttpOnly.
const Api = {
  async request(path, method = "GET", body) {
    const res = await fetch("/api/" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "RivalsArena",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = res.status === 204 ? null : await res.json();
    if (!res.ok)
      throw new Error(data?.error || "Não foi possível concluir a ação.");
    return data;
  },
  listar(c) {
    return this.request(c);
  },
  criar(c, b) {
    return this.request(c, "POST", b);
  },
  atualizar(c, id, b) {
    return this.request(c + "/" + id, "PUT", b);
  },
  remover(c, id) {
    return this.request(c + "/" + id, "DELETE");
  },
};
const Sessao = {
  _u: null,
  usuario() {
    return this._u;
  },
  async sair() {
    await Api.criar("auth/logout", {});
    location.href = "index.html";
  },
};
Sessao.ready = Api.request("auth/me")
  .then((u) => {
    Sessao._u = u;
    return u;
  })
  .catch(() => null);
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  toast(e.reason?.message || "Falha de conexão.", "erro");
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close-modal]")) fecharModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
  if (e.key === "Tab") {
    const modal = document.getElementById("modal");
    if (!modal) return;
    const nodes = [
      ...modal.querySelectorAll(
        "button:not(:disabled),a[href],input,select,textarea",
      ),
    ];
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
const q = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const iniciais = (n) =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function toast(msg, tipo) {
  const t = document.createElement("div");
  t.className = "toast " + (tipo || "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function abrirModal(html, ok) {
  fecharModal();
  const f = document.createElement("div");
  f.className = "modal-fundo";
  f.id = "modal";
  f.innerHTML = `<div class="modal ${ok ? "ok" : ""}" role="dialog" aria-modal="true" aria-label="Detalhes e formulário">${html}</div>`;
  f.addEventListener("click", (e) => {
    if (e.target === f) fecharModal();
  });
  document.body.appendChild(f);
  f.querySelector("input,select,textarea,button,a")?.focus();
}
function fecharModal() {
  const m = q("modal");
  if (m) m.remove();
}
function confirmarExclusao(msg) {
  return confirm(msg || "Tem certeza que deseja excluir este registro?");
}

function cardCampeonato(c) {
  return `<article class="card"><div class="card-img">${esc(c.titulo)}</div><div class="card-corpo"><h3>${esc(c.nome)}</h3><span class="tag">${esc(c.status)}</span><p>${c.inscritos}/${c.limite} times</p><a class="btn btn-laranja" href="campeonatos.html?id=${c.id}">Ver detalhes</a></div></article>`;
}
function cardJogo(j) {
  return `<article class="card"><div class="card-img">${esc(j.titulo)}</div><div class="card-corpo"><h3>${esc(j.nome)}</h3><span class="tag">${esc(j.tag)}</span><p>${esc(j.resumo)}</p><a class="btn btn-laranja" href="jogos.html?id=${j.id}">Conhecer o jogo</a></div></article>`;
}

function montarLayout() {
  const pag = document.body.dataset.pagina,
    u = Sessao.usuario();
  const links = [
    ["index", "Início"],
    ["campeonatos", "Campeonatos"],
    ["times", "Times"],
    ["ranking", "Ranking"],
    ["jogos", "Jogos"],
    ["comunidade", "Comunidades"],
    ["perfil", "Perfil"],
  ];
  const nav = q("navbar");
  if (nav) {
    nav.className = "navbar";
    nav.innerHTML = `<div class="container"><a href="index.html"><img src="assets/images/logo.png" alt="Rivals Arena"></a>
      <button class="menu-toggle" id="menu-toggle" aria-label="Abrir menu">☰</button>
      <nav class="nav-links">${links.map(([p, t]) => `<a href="${p}.html" class="${p === pag ? "ativo" : ""}">${t}</a>`).join("")}</nav>
      <div class="nav-auth">${u ? `<span>Olá, ${esc(u.usuario.toUpperCase())}</span><button class="btn" id="btn-sair">Sair</button>` : '<a class="btn" href="login.html">Login</a>'}</div></div>`;
    q("menu-toggle").onclick = () => nav.classList.toggle("aberto");
    const s = q("btn-sair");
    if (s) s.onclick = () => Sessao.sair();
  }
  const rod = q("footer");
  if (rod) {
    rod.className = "footer";
    rod.innerHTML = `
      <div class="redes" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.95 4.57a10 10 0 0 1-2.82.77 4.93 4.93 0 0 0 2.16-2.72 9.83 9.83 0 0 1-3.13 1.2 4.92 4.92 0 0 0-8.38 4.48A13.97 13.97 0 0 1 1.64 3.16a4.92 4.92 0 0 0 1.52 6.57 4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.82 4.94 4.94 0 0 1-2.22.08 4.92 4.92 0 0 0 4.59 3.42A9.88 9.88 0 0 1 0 19.53a13.94 13.94 0 0 0 7.55 2.21c9.06 0 14.01-7.5 14.01-14.01l-.02-.64a10.01 10.01 0 0 0 2.46-2.55z"/>
        </svg>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.07a12 12 0 1 0-13.88 11.85v-8.39H7.08v-3.46h3.04V9.43c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.52c-1.49 0-1.95.92-1.95 1.87v2.26h3.32l-.53 3.46h-2.79v8.39A12 12 0 0 0 24 12.07z"/>
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4.5"/>
          <circle cx="18" cy="6" r="1.3" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <nav aria-label="Links do rodapé">
        <ul>
          <li><a href="index.html">Início</a></li>
          <li><a href="privacidade.html">Política de privacidade</a></li>
          <li><a href="comunidade.html">Comunidade</a></li>
        </ul>
        <ul>
          <li><a href="ranking.html">Ranking</a></li>
          <li><a href="jogos.html">Jogos</a></li>
          <li><a href="perfil.html">Perfil</a></li>
        </ul>
      </nav>
      <small>© 2026 Rivals Arena - Entre na arena. Supere seus rivais.</small>`;
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  await Sessao.ready;
  montarLayout();
});
