let times = [],
  jogos = [];
const options = () =>
  jogos.map((j) => `<option value="${j.id}">${esc(j.nome)}</option>`).join("");
async function carregarTimes() {
  times = await Api.listar("times");
  const u = Sessao.usuario();
  q("times").innerHTML =
    times
      .map(
        (t) =>
          `<article class="card"><div class="card-img">${esc(t.nome)}</div><div class="card-corpo"><h3>${esc(t.jogo)}</h3><p>${esc(t.description)}</p><p>Elenco: ${t.membros.map((m) => esc(m.usuario)).join(", ")}</p><p>${t.locked ? "Elenco bloqueado por inscrição" : "Elenco aberto (até 8 membros)"}</p>${
            u
              ? `<div class="acoes">${t.captain_id === u.id ? `<button class="btn" data-edit="${t.id}">Editar</button><button class="btn" data-delete="${t.id}">Excluir</button>` : t.membros.some((m) => m.id === u.id) ? `<button class="btn" data-leave="${t.id}">Sair do time</button>` : `<button class="btn" data-join="${t.id}">Entrar no time</button>`}</div>${
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
      .join("") || "<p>Nenhum time cadastrado. Crie o primeiro!</p>";
}
function timeForm(t) {
  abrirModal(
    `<h2>${t ? "Editar" : "Criar"} time</h2><p>Times têm entrada livre. O capitão pode remover membros antes da inscrição.</p><form id="time-form"><label>Nome<input name="nome" required minlength="3" maxlength="60" value="${esc(t?.nome || "")}"></label>${t ? "" : `<label>Jogo<select name="game_id">${options()}</select></label>`}<label>Descrição<textarea name="description" maxlength="500">${esc(t?.description || "")}</textarea></label><button class="btn">Salvar</button><button type="button" class="btn" data-close-modal>Cancelar</button></form>`,
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
(async () => {
  await Sessao.ready;
  jogos = await Api.listar("jogos");
  q("time-acoes").innerHTML = Sessao.usuario()
    ? '<button class="btn" id="novo-time">Criar time</button><p class="ajuda">Para jogar solo, crie um time só com você. Para equipes, peça aos colegas para entrar no seu time.</p>'
    : '<p><a href="login.html">Faça login</a> para criar ou entrar em um time.</p>';
  if (q("novo-time")) q("novo-time").onclick = () => timeForm();
  await carregarTimes();
})();
