function renderHistoryMessage(message) {
  q("historico").innerHTML = `<tr><td colspan="4">${esc(message)}</td></tr>`;
}

(async () => {
  const stopLoading = startLoading(q("perfil-topo"), "Carregando perfil...");
  q("perfil-topo").setAttribute("aria-busy", "true");
  try {
    await Sessao.ready;
    if (!Sessao.usuario()) {
      q("perfil-topo").innerHTML =
        '<div class="container guest-prompt"><div><h2>Seu perfil</h2><p>Entre para consultar seu histórico e suas estatísticas.</p><div class="acoes"><a class="btn btn-laranja" href="login.html">Entrar</a><a class="btn btn-outline" href="cadastro.html">Criar conta</a></div></div></div>';
      renderState(
        q("kpis"),
        "empty",
        "Entre para consultar suas estatísticas.",
      );
      renderHistoryMessage("Faça login para ver seu histórico.");
      renderState(
        q("disputados"),
        "empty",
        "Seus campeonatos serão exibidos após entrar.",
      );
      return;
    }

    const user = await Api.request("perfil");
    const stats = user.stats;
    q("perfil-topo").innerHTML =
      `<div class="container"><span class="avatar" aria-hidden="true">${esc(iniciais(user.nome))}</span><div><h2>${esc(user.nome)}</h2><p>@${esc(user.usuario)} · ${esc(user.regiao)}</p><p>${esc(user.bio)}</p><button class="btn" id="editar-perfil">Editar perfil</button></div></div>`;
    q("kpis").innerHTML = [
      [stats.vitorias, "Vitórias"],
      [stats.derrotas, "Derrotas"],
      [stats.partidas, "Partidas"],
      [stats.pontos, "Pontuação"],
      [stats.ranking ? "#" + stats.ranking : "—", "Ranking geral"],
    ]
      .map(
        ([number, title]) => `<div class="kpi"><b>${number}</b>${title}</div>`,
      )
      .join("");
    q("historico").innerHTML =
      user.historico
        .map((match) => {
          const won = match.resultado === "Vitória";
          return `<tr><td>${esc(match.oponente)}</td><td><span class="resultado ${won ? "vit" : "der"}"><span class="resultado-icon" aria-hidden="true">${won ? "✓" : "—"}</span>${esc(match.resultado)}</span></td><td>${esc(match.jogo)}</td><td>${esc(match.completed_at ? new Date(match.completed_at).toLocaleDateString("pt-BR") : "Não agendada")}</td></tr>`;
        })
        .join("") || '<tr><td colspan="4">Nenhuma partida concluída.</td></tr>';
    q("disputados").innerHTML =
      user.campeonatos.map(cardCampeonato).join("") || "";
    if (!user.campeonatos.length)
      renderState(
        q("disputados"),
        "empty",
        "Nenhum campeonato disputado ainda.",
      );

    q("editar-perfil").onclick = () => {
      abrirModal(
        `<h2>Editar perfil</h2><form id="perfil-form"><label for="perfil-nome">Nome<input id="perfil-nome" name="nome" maxlength="80" required value="${esc(user.nome)}"></label><label for="perfil-bio">Bio<textarea id="perfil-bio" name="bio" maxlength="500">${esc(user.bio)}</textarea></label><label for="perfil-regiao">Região<select id="perfil-regiao" name="regiao"><option>Brasil</option><option>América Latina</option></select></label><label for="senha-atual">Senha atual (apenas para trocar senha)<input id="senha-atual" type="password" name="senha_atual" autocomplete="current-password"></label><label for="senha-nova">Nova senha (opcional, mínimo 8 caracteres)<input id="senha-nova" type="password" name="senha" autocomplete="new-password"></label><button class="btn" type="submit">Salvar</button><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button type="button" class="btn btn-outline" id="excluir-conta">Excluir minha conta</button></form>`,
      );
      q("perfil-form").elements.namedItem("regiao").value = user.regiao;
      q("perfil-form").onsubmit = async (event) => {
        event.preventDefault();
        await Api.atualizar(
          "usuarios",
          user.id,
          Object.fromEntries(new FormData(event.target)),
        );
        location.reload();
      };
      q("excluir-conta").onclick = async () => {
        if (
          !confirmarExclusao("Excluir permanentemente sua conta e publicações?")
        )
          return;
        await Api.remover("usuarios", user.id);
        location.href = "index.html";
      };
    };
  } catch (error) {
    renderState(
      q("perfil-topo"),
      "error",
      error.message || "Não foi possível carregar o perfil.",
      "Tentar novamente",
      () => location.reload(),
    );
    renderState(
      q("kpis"),
      "error",
      "As estatísticas não puderam ser carregadas.",
    );
    renderHistoryMessage("O histórico não pôde ser carregado.");
    renderState(
      q("disputados"),
      "error",
      "Os campeonatos não puderam ser carregados.",
      "Tentar novamente",
      () => location.reload(),
    );
  } finally {
    stopLoading();
    q("perfil-topo").setAttribute("aria-busy", "false");
  }
})();
