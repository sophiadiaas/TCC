let lista = [],
  jogos = [];
async function carregar() {
  const stopLoading = startLoading(q("lista"), "Carregando campeonatos...");
  q("lista").setAttribute("aria-busy", "true");
  try {
    lista = await Api.listar("campeonatos");
    filtrar();
  } catch (error) {
    renderState(
      q("lista"),
      "error",
      error.message || "Não foi possível carregar campeonatos.",
      "Tentar novamente",
      carregar,
    );
  } finally {
    stopLoading();
    q("lista").setAttribute("aria-busy", "false");
  }
}
function filtrar() {
  const j = q("f-jogo").value,
    s = q("f-status").value,
    d = q("f-data").value,
    p = q("f-part").value;
  const r = lista.filter(
    (c) =>
      (!j || c.jogo === j) &&
      (!s || c.status_code === s) &&
      (!d || c.inicio >= d) &&
      (!p || (p === "32" ? c.limite <= 32 : c.limite <= Number(p))),
  );
  q("lista").innerHTML = r.map(cardCampeonato).join("") || "";
  if (!r.length) {
    renderState(
      q("lista"),
      "empty",
      "Nenhum campeonato corresponde aos filtros.",
      "Limpar filtros",
      () => {
        ["f-jogo", "f-status", "f-data", "f-part"].forEach((id) => {
          q(id).value = "";
        });
        filtrar();
      },
    );
  }
}
function campeonatoForm(c) {
  const localDate = c
    ? new Date(
        Date.parse(c.starts_at) -
          new Date(c.starts_at).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  abrirModal(
    `<h2>${c ? "Editar" : "Criar"} campeonato</h2><form id="camp-form"><label for="camp-nome">Nome<input id="camp-nome" name="nome" required minlength="3" maxlength="100" value="${esc(c?.nome || "")}"></label><label for="camp-jogo">Jogo<select id="camp-jogo" name="game_id">${jogos.map((j) => `<option value="${j.id}" ${j.id === c?.game_id ? "selected" : ""}>${esc(j.nome)}</option>`).join("")}</select></label><label for="camp-limite">Limite de times (2–64)<input id="camp-limite" type="number" name="capacity" min="2" max="64" value="${c?.capacity || 8}" required></label><label for="camp-jogadores">Jogadores por time (1–8)<input id="camp-jogadores" type="number" name="team_size" min="1" max="8" value="${c?.team_size || 1}" required></label><label for="camp-inicio">Início (seu horário local)<input id="camp-inicio" type="datetime-local" name="starts_at" value="${localDate}" required></label><p>As inscrições encerram no horário de início. A partir dele, o organizador pode gerar a chave com pelo menos dois times.</p><button class="btn" type="submit">Salvar</button><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button></form>`,
  );
  q("camp-form").onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    b.starts_at = new Date(b.starts_at).toISOString();
    if (c) await Api.atualizar("campeonatos", c.id, b);
    else await Api.criar("campeonatos", b);
    fecharModal();
    await carregar();
  };
}
async function abrirInscricao(id) {
  const c = await Api.request("campeonatos/" + id),
    u = Sessao.usuario(),
    owned = u?.id === c.owner_id;
  const teams = u
    ? (await Api.listar("times")).filter(
        (t) => t.captain_id === u.id && t.game_id === c.game_id,
      )
    : [];
  abrirModal(
    `<h2>${esc(c.nome)}</h2><p>${esc(c.jogo)} · ${esc(statusCampeonato(c))} · ${c.inscritos}/${c.limite} times</p><p>Início: ${esc(new Date(c.starts_at).toLocaleString("pt-BR"))} · ${c.team_size} jogador(es) por time</p><div class="acoes">${owned && c.status_code === "open" ? '<button class="btn" id="editar-camp">Editar</button><button class="btn btn-outline" id="apagar-camp">Excluir</button><button class="btn" id="iniciar-camp">Iniciar e gerar chave</button>' : ""}<button class="btn btn-outline" data-close-modal>Fechar</button></div><h3>Inscrições</h3><div>${c.inscricoes.map((r) => `<p>${esc(r.nome)} ${u && (owned || r.captain_id === u.id) && c.status_code === "open" ? `<button class="link-btn" data-cancel="${r.id}">Cancelar inscrição</button>${r.captain_id === u.id ? `<button class="link-btn" data-swap="${r.id}">Trocar time</button>` : ""}` : ""}</p>`).join("") || "Nenhum time inscrito."}</div>${c.status_code === "open" ? (u ? `<form id="inscrever"><label for="inscrever-time">Seu time<select id="inscrever-time" name="team_id" required>${teams.map((t) => `<option value="${t.id}">${esc(t.nome)} (${t.membros.length} jogadores)</option>`).join("")}</select></label><button class="btn" ${teams.length ? "" : "disabled"}>Inscrever time</button></form><a href="times.html">Criar ou organizar um time</a>` : '<a href="login.html">Entre para participar</a>') : ""}<h3>Chaveamento</h3><a href="partidas.html?campeonato=${c.id}">Abrir chave e acompanhar transmissões →</a><p>${c.partidas.length ? "Chave gerada." : "A chave será gerada pelo organizador após o início."}</p>`,
  );
  if (q("editar-camp")) q("editar-camp").onclick = () => campeonatoForm(c);
  if (q("apagar-camp"))
    q("apagar-camp").onclick = async () => {
      if (!confirmarExclusao("Excluir o campeonato e suas inscrições?")) return;
      await Api.remover("campeonatos", id);
      fecharModal();
      await carregar();
    };
  if (q("iniciar-camp"))
    q("iniciar-camp").onclick = async () => {
      await Api.criar(`campeonatos/${id}/iniciar`, {});
      location.href = `partidas.html?campeonato=${id}`;
    };
  if (q("inscrever"))
    q("inscrever").onsubmit = async (e) => {
      e.preventDefault();
      await Api.criar("inscricoes", {
        tournament_id: id,
        team_id: e.target.elements.namedItem("team_id").value,
      });
      toast("Time inscrito!");
      await carregar();
      await abrirInscricao(id);
    };
  q("modal").addEventListener("click", async (e) => {
    if (e.target.dataset.cancel) {
      await Api.remover("inscricoes", e.target.dataset.cancel);
      await carregar();
      await abrirInscricao(id);
    }
    if (e.target.dataset.swap) {
      const newTeam = prompt(
        "ID do novo time: " +
          teams.map((t) => `${t.id} = ${t.nome}`).join(", "),
      );
      if (newTeam) {
        await Api.atualizar("inscricoes", e.target.dataset.swap, {
          team_id: Number(newTeam),
        });
        await abrirInscricao(id);
      }
    }
  });
}
(async () => {
  const stopSessionLoading = startLoading(
    q("lista"),
    "Preparando a página de campeonatos...",
  );
  q("lista").setAttribute("aria-busy", "true");
  try {
    await Sessao.ready;
    jogos = await Api.listar("jogos");
    q("f-jogo").innerHTML =
      '<option value="">Todos os jogos</option>' +
      jogos.map((j) => `<option>${esc(j.nome)}</option>`).join("");
    ["f-jogo", "f-status", "f-data", "f-part"].forEach((i) =>
      q(i).addEventListener("change", filtrar),
    );
    const bar = document.createElement("div");
    bar.className = "acoes page-actions";
    bar.innerHTML = Sessao.usuario()
      ? '<button class="btn" id="criar-camp">Criar campeonato</button>'
      : '<a class="btn btn-outline" href="login.html">Entre para organizar um campeonato</a>';
    q("lista").parentElement.insertBefore(
      bar,
      q("lista").parentElement.querySelector(".filtros"),
    );
    if (q("criar-camp")) q("criar-camp").onclick = () => campeonatoForm();
    await carregar();
    const id = new URLSearchParams(location.search).get("id");
    if (id) await abrirInscricao(id);
  } catch (error) {
    renderState(
      q("lista"),
      "error",
      error.message || "Não foi possível abrir campeonatos.",
      "Tentar novamente",
      () => location.reload(),
    );
  } finally {
    stopSessionLoading();
    q("lista").setAttribute("aria-busy", "false");
  }
})();
