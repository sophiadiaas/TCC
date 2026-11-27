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
  _status: "checking",
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
    Sessao._status = user ? "authenticated" : "anonymous";
    return user;
  })
  .catch((error) => {
    Sessao._status = error.status === 401 ? "anonymous" : "unavailable";
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
  element.setAttribute("role", type === "erro" ? "alert" : "status");
  element.setAttribute("aria-live", type === "erro" ? "assertive" : "polite");
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 3200);
}

function renderState(target, type, message, actionLabel, onAction) {
  const state = document.createElement("div");
  state.className = `state state-${type}`;
  state.setAttribute("role", type === "error" ? "alert" : "status");
  state.setAttribute("aria-live", type === "error" ? "assertive" : "polite");

  const icon = document.createElement("span");
  icon.className = `state-icon state-icon-${type}`;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = type === "error" ? "!" : type === "empty" ? "i" : "";

  const copy = document.createElement("span");
  copy.className = "state-copy";
  copy.textContent = message;
  state.append(icon, copy);

  if (actionLabel && onAction) {
    const action = document.createElement("button");
    action.className = "btn btn-outline state-action";
    action.type = "button";
    action.textContent = actionLabel;
    action.addEventListener("click", onAction);
    state.append(action);
  }

  target.replaceChildren(state);
  return state;
}

function startLoading(target, message) {
  const state = renderState(target, "loading", message);
  const timeout = setTimeout(() => {
    if (!state.isConnected) return;
    const hint = document.createElement("small");
    hint.className = "state-hint";
    hint.textContent = "A solicitação está levando mais tempo que o esperado.";
    state.append(hint);
  }, 5000);
  return () => clearTimeout(timeout);
}

function statusCampeonato(championship) {
  return (
    {
      open: "Inscrições abertas",
      running: "Em andamento",
      finished: "Finalizado",
    }[championship.status_code] ||
    championship.status ||
    "Status não informado"
  );
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
  const startsAt = championship.inicio || championship.starts_at;
  const startLabel = startsAt
    ? new Date(startsAt).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Data a definir";
  const statusClass =
    { open: "open", running: "running", finished: "finished" }[
      championship.status_code
    ] || "unknown";
  return `<article class="card"><div class="card-img">${esc(championship.jogo || championship.titulo || championship.nome)}</div><div class="card-corpo"><div class="card-heading"><h3>${esc(championship.nome)}</h3><span class="tag tag-status status-${statusClass}">${esc(statusCampeonato(championship))}</span></div><div class="card-meta"><span><strong>Jogo:</strong> ${esc(championship.jogo || "—")}</span><span><strong>Início:</strong> ${esc(startLabel)}</span><span><strong>Times:</strong> ${championship.inscritos}/${championship.limite}</span></div><a class="btn btn-laranja" href="campeonatos.html?id=${championship.id}">Ver detalhes e inscrição</a></div></article>`;
}

function cardJogo(game) {
  return `<article class="card"><div class="card-img">${esc(game.titulo || game.nome)}</div><div class="card-corpo"><h3>${esc(game.nome)}</h3><span class="tag">${esc(game.genero || game.tag || "Jogo da Arena")}</span><p>${esc(game.resumo || game.description || "")}</p><p class="card-meta">${esc(game.plataformas || "")}</p><a class="btn btn-laranja" href="jogos.html?id=${game.id}">Conhecer o jogo</a></div></article>`;
}

function montarLayout() {
  const page =
    document.body.dataset.pagina ||
    location.pathname
      .split("/")
      .pop()
      .replace(/\.html$/, "");
  const user = Sessao.usuario();
  const explorePages = ["times", "ranking"];
  const activeLink = (slug) =>
    page === slug
      ? ' class="nav-link ativo" aria-current="page"'
      : ' class="nav-link"';
  const nav = q("navbar");
  if (nav) {
    nav.className = "navbar";
    const account = user
      ? `<div class="account-area"><button class="account-trigger" id="account-toggle" type="button" aria-expanded="false" aria-controls="account-menu" aria-label="Menu da conta de ${esc(user.usuario)}"><span class="account-avatar" aria-hidden="true">${esc(iniciais(user.nome || user.usuario))}</span><span class="account-name">${esc(user.nome || user.usuario)}</span><span class="menu-caret" aria-hidden="true">▾</span></button><div class="account-menu" id="account-menu" hidden><a href="perfil.html"${page === "perfil" ? ' aria-current="page"' : ""}>Meu perfil</a><button type="button" id="btn-sair">Sair</button></div></div>`
      : Sessao._status === "anonymous"
        ? '<a class="nav-login" href="login.html">Entrar</a><a class="btn nav-signup" href="cadastro.html">Criar conta</a>'
        : '<button class="nav-status" id="retry-session" type="button">Conta indisponível · tentar novamente</button>';
    nav.innerHTML = `<div class="container"><a class="navbar-brand"${page === "index" ? ' aria-current="page"' : ""} href="index.html" aria-label="Rivals Arena, página inicial"><img src="assets/images/logo.png" alt=""></a>
      <button class="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-label="Abrir navegação" aria-controls="primary-nav"><span aria-hidden="true">☰</span></button>
      <nav class="primary-nav nav-links" id="primary-nav" aria-label="Navegação principal"><a href="campeonatos.html"${activeLink("campeonatos")}>Campeonatos</a><a href="jogos.html"${activeLink("jogos")}>Jogos</a><a href="comunidade.html"${activeLink("comunidade")}>Comunidade</a><div class="nav-dropdown${explorePages.includes(page) ? " ativo" : ""}"><button class="nav-dropdown-toggle" id="explore-toggle" type="button" aria-expanded="false" aria-controls="explore-menu"${explorePages.includes(page) ? ' aria-current="location"' : ""}>Explorar <span class="menu-caret" aria-hidden="true">▾</span></button><div class="nav-dropdown-menu" id="explore-menu" hidden><a href="times.html"${activeLink("times")}>Times</a><a href="ranking.html"${activeLink("ranking")}>Ranking</a></div></div></nav>
      <div class="nav-auth">${account}</div></div>`;
    nav.removeAttribute("aria-busy");

    const mobileToggle = q("menu-toggle");
    const exploreToggle = q("explore-toggle");
    const exploreMenu = q("explore-menu");
    const accountToggle = q("account-toggle");
    const accountMenu = q("account-menu");
    const setExploreOpen = (open, focusItem) => {
      exploreMenu.hidden = !open;
      exploreToggle.setAttribute("aria-expanded", String(open));
      nav.querySelector(".nav-dropdown").classList.toggle("is-open", open);
      if (focusItem) {
        const items = exploreMenu.querySelectorAll("a");
        items[focusItem === "last" ? items.length - 1 : 0]?.focus();
      }
    };
    const setAccountOpen = (open) => {
      if (!accountMenu) return;
      accountMenu.hidden = !open;
      accountToggle.setAttribute("aria-expanded", String(open));
    };
    const setMobileOpen = (open) => {
      nav.classList.toggle("aberto", open);
      mobileToggle.setAttribute("aria-expanded", String(open));
      mobileToggle.setAttribute(
        "aria-label",
        open ? "Fechar navegação" : "Abrir navegação",
      );
    };

    mobileToggle.addEventListener("click", () => {
      const open = !nav.classList.contains("aberto");
      setExploreOpen(false);
      setAccountOpen(false);
      setMobileOpen(open);
    });
    exploreToggle.addEventListener("click", () => {
      const open = exploreMenu.hidden;
      setAccountOpen(false);
      setExploreOpen(open);
    });
    exploreToggle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      setAccountOpen(false);
      setExploreOpen(true, event.key === "ArrowUp" ? "last" : "first");
    });
    if (accountToggle) {
      accountToggle.addEventListener("click", () => {
        const open = accountMenu.hidden;
        setExploreOpen(false);
        setAccountOpen(open);
      });
    }
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a") && nav.classList.contains("aberto"))
        setMobileOpen(false);
    });
    document.addEventListener("click", (event) => {
      if (nav.contains(event.target)) return;
      setExploreOpen(false);
      setAccountOpen(false);
      setMobileOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!exploreMenu.hidden) {
        setExploreOpen(false);
        exploreToggle.focus();
      } else if (accountMenu && !accountMenu.hidden) {
        setAccountOpen(false);
        accountToggle.focus();
      } else if (nav.classList.contains("aberto")) {
        setMobileOpen(false);
        mobileToggle.focus();
      }
    });
    const logout = q("btn-sair");
    if (logout) logout.onclick = () => Sessao.sair();
    const retrySession = q("retry-session");
    if (retrySession) retrySession.onclick = () => location.reload();
  }
  const footer = q("footer");
  if (footer) {
    footer.className = "footer";
    footer.innerHTML = `<div class="container footer-inner">
      <a class="brand" href="index.html" aria-label="Rivals Arena, voltar ao início">Rivals<br>Arena</a>
      <div class="footer-groups">
        <section><h2>Navegue</h2><ul class="footer-links">
          <li><a href="campeonatos.html">Campeonatos</a></li>
          <li><a href="jogos.html">Jogos</a></li>
          <li><a href="comunidade.html">Comunidade</a></li>
          <li><a href="times.html">Times</a></li>
          <li><a href="ranking.html">Ranking</a></li>
          <li><a href="perfil.html">Meu perfil</a></li>
        </ul></section>
        <section><h2>Institucional</h2><ul class="footer-links">
          <li><a href="privacidade.html">Privacidade e uso</a></li>
        </ul></section>
        <section><h2>Desenvolvedores</h2><ul class="footer-links">
          <li><a href="api.html">Documentação da API</a></li>
        </ul></section>
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
});
