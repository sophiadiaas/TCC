(async () => {
  const normalize = (value) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  q("tabela").innerHTML = '<tr><td colspan="6">Carregando ranking...</td></tr>';
  try {
    const [players, games] = await Promise.all([
      Api.listar("jogadores"),
      Api.listar("jogos"),
    ]);
    q("r-jogo").innerHTML = games
      .map((game) => `<option>${esc(game.nome)}</option>`)
      .join("");

    function render() {
      const selectedGame = q("r-jogo").value;
      const selectedRegion = q("r-regiao").value;
      const query = normalize(q("r-busca").value.trim());
      const ranked = players
        .filter(
          (player) =>
            player.jogo === selectedGame &&
            (!selectedRegion || player.regiao === selectedRegion),
        )
        .sort(
          (a, b) =>
            b.pontos - a.pontos ||
            b.vitorias - a.vitorias ||
            a.derrotas - b.derrotas ||
            a.id - b.id,
        )
        .map((player, index) => ({ ...player, pos: index + 1 }));

      q("podio").innerHTML = ranked.length
        ? ranked
            .slice(0, 3)
            .map(
              (player, index) =>
                `<div><span>${index + 1}º LUGAR</span><b>${esc(player.nome)}</b><small>${player.pontos} pontos</small></div>`,
            )
            .join("")
        : '<p class="state state-empty">O ranking deste jogo aparece após partidas concluídas.</p>';

      const visible = ranked.filter((player) =>
        normalize(player.nome).includes(query),
      );
      q("tabela").innerHTML = visible.length
        ? visible
            .map(
              (player) =>
                `<tr><td>${player.pos}</td><td>${esc(player.nome)}</td><td>${player.vitorias}</td><td>${player.derrotas}</td><td>${player.partidas}</td><td>${player.pontos}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="6">Nenhum jogador corresponde aos filtros.</td></tr>';
    }

    if (!games.length) {
      q("podio").innerHTML =
        '<p class="state state-empty">Ainda não há jogos no catálogo.</p>';
      q("tabela").innerHTML =
        '<tr><td colspan="6">Não há dados para exibir.</td></tr>';
      return;
    }
    ["r-jogo", "r-regiao"].forEach((id) =>
      q(id).addEventListener("change", render),
    );
    q("r-busca").addEventListener("input", render);
    render();
  } catch (error) {
    q("podio").innerHTML =
      `<p class="state state-error" role="alert">${esc(error.message)}</p>`;
    q("tabela").innerHTML =
      '<tr><td colspan="6">Não foi possível carregar o ranking.</td></tr>';
    toast(error.message || "Não foi possível carregar o ranking.", "erro");
  }
})();
