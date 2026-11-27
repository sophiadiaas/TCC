const Api = {
  async request(path, method = "GET", body) {
    const response = await fetch("/api/" + path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "RivalsArena",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 204) {
      if (!response.ok)
        throw Object.assign(new Error("Não foi possível concluir a ação."), {
          status: response.status,
        });
      return null;
    }
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw Object.assign(
        new Error(error?.error || "Não foi possível concluir a ação."),
        { status: response.status },
      );
    }
    return response.json();
  },
  listar(collection) {
    return this.request(collection);
  },
  criar(collection, body) {
    return this.request(collection, "POST", body);
  },
  atualizar(collection, id, body) {
    return this.request(collection + "/" + id, "PUT", body);
  },
  remover(collection, id) {
    return this.request(collection + "/" + id, "DELETE");
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
  .then((user) => {
    Sessao._u = user;
    return user;
  })
  .catch((error) => {
    if (error.status !== 401)
      toast(error.message || "Falha de conexão.", "erro");
    return null;
  });

const q = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
const iniciais = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function toast(message, type) {
  const element = document.createElement("div");
  element.className = "toast " + (type || "");
  element.textContent = message;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 3200);
}

function abrirModal(html, success) {
  fecharModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-fundo";
  backdrop.id = "modal";
  backdrop.innerHTML = `<div class="modal ${success ? "ok" : ""}" role="dialog" aria-modal="true" aria-label="Detalhes e formulário">${html}</div>`;
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) fecharModal();
  });
  document.body.appendChild(backdrop);
  backdrop.querySelector("input,select,textarea,button,a")?.focus();
}

function fecharModal() {
  q("modal")?.remove();
}

function confirmarExclusao(message) {
  return confirm(message || "Tem certeza que deseja excluir este registro?");
}

function cardCampeonato(championship) {
  return `<article class="card"><div class="card-img">${esc(championship.titulo)}</div><div class="card-corpo"><h3>${esc(championship.nome)}</h3><span class="tag">${esc(championship.status)}</span><p>${championship.inscritos}/${championship.limite} times</p><a class="btn btn-laranja" href="campeonatos.html?id=${championship.id}">Ver detalhes</a></div></article>`;
}

function cardJogo(game) {
  return `<article class="card"><div class="card-img">${esc(game.titulo)}</div><div class="card-corpo"><h3>${esc(game.nome)}</h3><span class="tag">${esc(game.tag)}</span><p>${esc(game.resumo)}</p><a class="btn btn-laranja" href="jogos.html?id=${game.id}">Conhecer o jogo</a></div></article>`;
}

function montarLayout() {
  const page = document.body.dataset.pagina;
  const user = Sessao.usuario();
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
      <nav class="nav-links">${links.map(([slug, label]) => `<a href="${slug}.html" class="${slug === page ? "ativo" : ""}">${label}</a>`).join("")}</nav>
      <div class="nav-auth">${user ? `<span>Olá, ${esc(user.usuario.toUpperCase())}</span><button class="btn" id="btn-sair">Sair</button>` : '<a class="btn" href="login.html">Login</a>'}</div></div>`;
    q("menu-toggle").onclick = () => nav.classList.toggle("aberto");
    const logout = q("btn-sair");
    if (logout) logout.onclick = () => Sessao.sair();
  }
  const footer = q("footer");
  if (footer) {
    footer.className = "footer";
    footer.innerHTML = `<div class="container footer-inner">
      <a class="brand" href="index.html" aria-label="Rivals Arena, voltar ao início">Rivals<br>Arena</a>
      <ul class="footer-links">
        <li><a href="index.html">Início</a></li>
        <li><a href="campeonatos.html">Campeonatos</a></li>
        <li><a href="times.html">Times</a></li>
        <li><a href="jogos.html">Jogos</a></li>
        <li><a href="ranking.html">Ranking</a></li>
        <li><a href="comunidade.html">Comunidade</a></li>
        <li><a href="perfil.html">Perfil</a></li>
        <li><a href="privacidade.html">Política de privacidade</a></li>
      </ul>
      <div class="social" aria-hidden="true">
        <a href="#"><svg viewBox="0 0 24 24"><path d="M22 5.9c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.7 11.7 0 0 1 3.3 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1.5 1.6 2 2.8 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.8C15.8 20.2 20 13.9 20 8.5V8c.8-.6 1.5-1.3 2-2.1z"/></svg></a>
        <a href="#"><svg viewBox="0 0 24 24"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/></svg></a>
        <a href="#"><svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 4 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm6.4-1.6a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg></a>
      </div>
      <p class="copy">© 2026 Rivals Arena</p>
    </div>`;
  }
}

function filtrarLista() {
  const search = q("busca");
  const empty = q("vazio");
  if (!search || !empty) return;
  const normalize = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f#]/g, "")
      .trim();
  const query = normalize(search.value);
  const active =
    document.querySelector(".filter.is-on")?.dataset.filter || "all";
  const rows = [...document.querySelectorAll("#lista .row")];
  let visible = 0;
  rows.forEach((row) => {
    const matches =
      (active === "all" || row.dataset.status === active) &&
      normalize(row.dataset.name).includes(query);
    row.hidden = !matches;
    if (matches) visible++;
  });
  empty.hidden = visible > 0;
}

const toggle = document.querySelector(".nav-toggle");
const menu = q("menu");
if (toggle && menu) {
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  menu.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
    }),
  );

  const links = [...menu.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) =>
            link.classList.toggle(
              "active",
              link.getAttribute("href") === "#" + entry.target.id,
            ),
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => spy.observe(section));
  }
}

document.querySelectorAll(".filter").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle("is-on", active);
      filter.setAttribute("aria-pressed", active);
    });
    filtrarLista();
  }),
);
q("busca")?.addEventListener("input", filtrarLista);
document.querySelectorAll(".hero-logo").forEach((image) => {
  image.addEventListener("error", () => {
    image.style.display = "none";
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) fecharModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") fecharModal();
  if (event.key !== "Tab") return;
  const modal = q("modal");
  if (!modal) return;
  const nodes = [
    ...modal.querySelectorAll(
      "button:not(:disabled),a[href],input,select,textarea",
    ),
  ];
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  toast(event.reason?.message || "Falha de conexão.", "erro");
});
document.addEventListener("DOMContentLoaded", async () => {
  await Sessao.ready;
  montarLayout();
  const greeting = document.querySelector(".user");
  if (greeting) {
    const user = Sessao.usuario();
    greeting.textContent = user ? `Olá, ${user.nome}` : "Olá, visitante";
    if (menu) {
      if (user) {
        const item = document.createElement("li");
        const logout = document.createElement("a");
        logout.href = "#";
        logout.textContent = "Sair";
        logout.addEventListener("click", async (event) => {
          event.preventDefault();
          await Sessao.sair();
        });
        item.appendChild(logout);
        menu.appendChild(item);
      } else {
        for (const [label, href] of [
          ["Entrar", "login.html"],
          ["Cadastrar", "cadastro.html"],
        ]) {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = href;
          link.textContent = label;
          item.appendChild(link);
          menu.appendChild(item);
        }
      }
    }
  }
});
