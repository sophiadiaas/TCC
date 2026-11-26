(async () => {
  await Sessao.ready;
  if (!Sessao.usuario()) {
    q("perfil-topo").innerHTML =
      '<div class="container"><h1>Seu perfil</h1><a href="login.html">Faça login para visualizar seu perfil.</a></div>';
    return;
  }
  const u = await Api.request("perfil"),
    s = u.stats;
  q("perfil-topo").innerHTML =
    `<div class="container"><span class="avatar">${esc(iniciais(u.nome))}</span><div><h1>${esc(u.nome)}</h1><p>@${esc(u.usuario)} · ${esc(u.regiao)}</p><p>${esc(u.bio)}</p><button class="btn" id="editar-perfil">Editar perfil</button></div></div>`;
  q("kpis").innerHTML = [
    [s.vitorias, "Vitórias"],
    [s.derrotas, "Derrotas"],
    [s.partidas, "Partidas"],
    [s.pontos, "Pontuação"],
    [s.ranking ? "#" + s.ranking : "—", "Ranking geral"],
  ]
    .map(([n, t]) => `<div class="kpi"><b>${n}</b>${t}</div>`)
    .join("");
  q("historico").innerHTML =
    u.historico
      .map(
        (p) =>
          `<tr><td>${esc(p.oponente)}</td><td class="${p.resultado === "Vitória" ? "vit" : "der"}">${p.resultado}</td><td>${esc(p.jogo)}</td><td>${esc(p.completed_at ? new Date(p.completed_at + "Z").toLocaleDateString("pt-BR") : "Não agendada")}</td></tr>`,
      )
      .join("") || '<tr><td colspan="4">Nenhuma partida concluída.</td></tr>';
  q("disputados").innerHTML =
    u.campeonatos.map(cardCampeonato).join("") ||
    "<p>Nenhum campeonato disputado ainda.</p>";
  q("editar-perfil").onclick = () => {
    abrirModal(
      `<h2>Editar perfil</h2><form id="perfil-form"><label>Nome<input name="nome" maxlength="80" required value="${esc(u.nome)}"></label><label>Bio<textarea name="bio" maxlength="500">${esc(u.bio)}</textarea></label><label>Região<select name="regiao"><option>Brasil</option><option>América Latina</option></select></label><label>Senha atual (apenas para trocar senha)<input type="password" name="senha_atual" autocomplete="current-password"></label><label>Nova senha (opcional, mínimo 8 caracteres)<input type="password" name="senha" autocomplete="new-password"></label><button class="btn">Salvar</button><button type="button" class="btn" data-close-modal>Cancelar</button><button type="button" class="btn" id="excluir-conta">Excluir minha conta</button></form>`,
    );
    q("perfil-form").elements.namedItem("regiao").value = u.regiao;
    q("perfil-form").onsubmit = async (e) => {
      e.preventDefault();
      await Api.atualizar(
        "usuarios",
        u.id,
        Object.fromEntries(new FormData(e.target)),
      );
      location.reload();
    };
    q("excluir-conta").onclick = async () => {
      if (
        !confirmarExclusao("Excluir permanentemente sua conta e publicações?")
      )
        return;
      await Api.remover("usuarios", u.id);
      location.href = "index.html";
    };
  };
})();
