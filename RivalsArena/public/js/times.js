let times = [],
  jogos = [];
const options = () =>
  jogos
    .filter(jogoDisponivel)
    .map((j) => `<option value="${j.id}">${esc(j.nome)}</option>`)
    .join("");
async function carregarTimes() {
  const stopLoading = startLoading(q("times"), "Carregando times...");
  q("times").setAttribute("aria-busy", "true");
  try {
    times = await Api.listar("times");
    const u = Sessao.usuario();
    q("times").innerHTML =
      times
        .map(
          (t) =>
            `<article class="card"><div class="card-img">${esc(t.nome)}</div><div class="card-corpo"><div class="card-heading"><h3>${esc(t.nome)}</h3><span class="tag">${esc(t.jogo)}${jogoDisponivel(t.jogo) ? "" : " · Em breve"}</span></div><p>${esc(t.description || "Sem descrição.")}</p><p><strong>Elenco:</strong> ${t.membros.map((m) => esc(m.usuario)).join(", ") || "Nenhum integrante"}</p><p>${t.locked ? "Elenco bloqueado por inscrição" : "Elenco aberto (até 8 membros)"}</p>${
              u
                ? `<div class="acoes">${t.captain_id === u.id ? `<button class="btn" data-edit="${t.id}">Editar time</button><button class="btn btn-outline" data-delete="${t.id}">Excluir time</button>` : t.membros.some((m) => m.id === u.id) ? `<button class="btn btn-outline" data-leave="${t.id}">Sair do time</button>` : `<button class="btn" data-join="${t.id}">Entrar no time</button>`}</div>${
                    t.captain_id === u.id
                      ? t.membros
                          .filter((m) => m.id !== u.id)
                          .map(
                            (m) =>
                              `<button class="link-btn" data-kick="${t.id}" data-user="${m.id}">Remover ${esc(m.usuario)}</button>`,
                          )
                          .join("")
                      : ""
                  }`
                : ""
            }</div></article>`,
        )
        .join("") || "";
    if (!times.length)
      renderState(
        q("times"),
        "empty",
        "Ainda não há times cadastrados.",
        undefined,
        undefined,
        { mascot: true },
      );
  } catch (error) {
    renderState(
      q("times"),
      "error",
      error.message || "Não foi possível carregar os times.",
      "Tentar novamente",
      carregarTimes,
    );
  } finally {
    stopLoading();
    q("times").setAttribute("aria-busy", "false");
  }
}
function timeForm(t) {
  abrirModal(
    `<h2>${t ? "Editar" : "Criar"} time</h2><p>Times têm entrada livre. O capitão pode remover membros antes da inscrição.</p><form id="time-form"><label for="time-nome">Nome<input id="time-nome" name="nome" required minlength="3" maxlength="60" value="${esc(t?.nome || "")}"></label>${t ? "" : `<label for="time-jogo">Jogo<select id="time-jogo" name="game_id">${options()}</select></label>`}<label for="time-descricao">Descrição<textarea id="time-descricao" name="description" maxlength="500">${esc(t?.description || "")}</textarea></label><button class="btn" type="submit">Salvar</button><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button></form>`,
  );
  q("time-form").onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    if (t) await Api.atualizar("times", t.id, b);
    else await Api.criar("times", b);
    fecharModal();
    await carregarTimes();
  };
}
q("times").onclick = async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const id = Number(Object.values(b.dataset)[0]);
  if (b.dataset.edit) return timeForm(times.find((t) => t.id === id));
  if (b.dataset.delete) {
    if (!confirmarExclusao()) return;
    await Api.remover("times", id);
  }
  if (b.dataset.join) await Api.criar(`times/${id}/membros`, {});
  if (b.dataset.leave)
    await Api.request(`times/${id}/membros/${Sessao.usuario().id}`, "DELETE");
  if (b.dataset.kick)
    await Api.request(`times/${id}/membros/${b.dataset.user}`, "DELETE");
  await carregarTimes();
};
async function iniciarTimes() {
  const stopSessionLoading = startLoading(
    q("times"),
    "Preparando a página de times...",
  );
  q("times").setAttribute("aria-busy", "true");
  try {
    await Sessao.ready;
    jogos = await Api.listar("jogos");
    q("time-acoes").innerHTML = Sessao.usuario()
      ? '<button class="btn" id="novo-time">Criar time</button><p class="ajuda">Capitães organizam o elenco; integrantes podem entrar ou sair antes da inscrição em campeonatos.</p>'
      : '<div class="state guest-prompt"><p>Entre para criar um time ou solicitar entrada em uma equipe.</p><div class="acoes"><a class="btn btn-laranja" href="login.html">Entrar</a><a class="btn btn-outline" href="cadastro.html">Criar conta</a></div></div>';
    if (q("novo-time")) q("novo-time").onclick = () => timeForm();
    await carregarTimes();
  } catch (error) {
    renderState(
      q("times"),
      "error",
      error.message || "Não foi possível abrir os times.",
      "Tentar novamente",
      () => location.reload(),
    );
  } finally {
    stopSessionLoading();
    q("times").setAttribute("aria-busy", "false");
  }
}
iniciarTimes();
