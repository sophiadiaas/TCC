(async () => {
  const jogos = await Api.listar("jogos"),
    id = new URLSearchParams(location.search).get("id"),
    j = jogos.find((x) => x.id == id);
  if (!j) {
    q("lista-jogos").innerHTML = jogos.map(cardJogo).join("");
    return;
  }
  q("catalogo").hidden = true;
  q("detalhe").hidden = false;
  q("detalhe").innerHTML =
    `<div class="jogo-topo"><a href="jogos.html">← Conhecer o Jogo</a> → ${esc(j.nome)}</div>
    <div class="banner">${esc(j.titulo)}</div>
    <div class="jogo-box"><div class="jogo-lado"><span>Avaliação: ${"Catálogo da Arena"}</span><span>Gênero: ${esc(j.genero)}</span><span>Jogadores Online: ${"Consulte a comunidade"}</span><span>Plataformas: ${esc(j.plataformas)}</span></div>
    <div class="jogo-info"><h2>Detalhes do Jogo:</h2>${j.descricao.map((p) => `<p>${esc(p)}</p>`).join("")}<div><a class="btn btn-laranja" href="campeonatos.html">Ver campeonatos</a></div></div></div>`;
})();
function formJogo(j) {
  abrirModal(
    `<h2>${j ? "Editar" : "Adicionar"} jogo</h2><form id="jogo-form"><label>Nome<input name="nome" minlength="3" maxlength="60" required value="${esc(j?.nome || "")}"></label><label>Gênero<input name="genero" required value="${esc(j?.genero || "")}"></label><label>Descrição<textarea name="resumo" minlength="5" maxlength="2000" required>${esc(j?.resumo || "")}</textarea></label><label>Plataformas<input name="plataformas" required value="${esc(j?.plataformas || "")}"></label><button class="btn">Salvar</button><button type="button" class="btn" data-close-modal>Cancelar</button></form>`,
  );
  q("jogo-form").onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    if (j) await Api.atualizar("jogos", j.id, b);
    else await Api.criar("jogos", b);
    location.href = "jogos.html";
  };
}
(async () => {
  await Sessao.ready;
  const u = Sessao.usuario();
  if (!u) return;
  const jogos = await Api.listar("jogos"),
    bar = document.createElement("div");
  bar.className = "acoes";
  bar.innerHTML =
    '<button class="btn" id="adicionar-jogo">Adicionar jogo ao catálogo</button>';
  q("catalogo").prepend(bar);
  q("adicionar-jogo").onclick = () => formJogo();
  const id = new URLSearchParams(location.search).get("id"),
    j = jogos.find((g) => g.id == id);
  if (j && j.owner_id === u.id) {
    const actions = document.createElement("div");
    actions.className = "acoes";
    actions.innerHTML =
      '<button class="btn" id="editar-jogo">Editar jogo</button><button class="btn" id="excluir-jogo">Excluir jogo</button>';
    q("detalhe").append(actions);
    q("editar-jogo").onclick = () => formJogo(j);
    q("excluir-jogo").onclick = async () => {
      if (!confirmarExclusao()) return;
      await Api.remover("jogos", j.id);
      location.href = "jogos.html";
    };
  }
})();
