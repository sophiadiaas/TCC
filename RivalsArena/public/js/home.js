async function carregarInicio() {
  const stopLoadingChampionships = startLoading(
    q("lista-itens"),
    "Carregando campeonatos...",
  );
  const stopLoadingGames = startLoading(
    q("jogos-reais"),
    "Carregando jogos...",
  );
  q("lista-itens").setAttribute("aria-busy", "true");
  q("jogos-reais").setAttribute("aria-busy", "true");

  try {
    const [stats, championships, games] = await Promise.all([
      Api.request("stats"),
      Api.listar("campeonatos"),
      Api.listar("jogos"),
    ]);

    for (const [key, value] of Object.entries(stats)) {
      const element = q("stat-" + key);
      if (element)
        element.textContent = (
          key === "jogos" ? games.filter(jogoDisponivel).length : value
        ).toLocaleString("pt-BR");
    }

    const counts = {
      all: championships.length,
      open: 0,
      running: 0,
      finished: 0,
    };
    championships.forEach((championship) => {
      if (
        Object.prototype.hasOwnProperty.call(counts, championship.status_code)
      )
        counts[championship.status_code]++;
    });
    document.querySelectorAll("[data-count-for]").forEach((element) => {
      element.textContent = counts[element.dataset.countFor] ?? 0;
    });

    q("lista-itens").innerHTML = championships
      .map((championship) => {
        const percentage = championship.limite
          ? Math.min(100, (championship.inscritos / championship.limite) * 100)
          : 0;
        const statusClass =
          { open: "open", running: "live", finished: "done" }[
            championship.status_code
          ] || "";
        return `<article class="row" data-status="${statusClass}" data-name="${esc(championship.nome)}"><div class="thumb">${esc(championship.nome.slice(0, 12))}</div><h3>${esc(championship.nome)}</h3><p class="status"><span class="dot${statusClass ? " dot-" + statusClass : ""}" aria-hidden="true"></span>${esc(statusCampeonato(championship))}</p><div class="people"><span>${championship.inscritos}/${championship.limite} times</span><div class="bar" role="progressbar" aria-label="Inscrições preenchidas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentage)}"><span style="width:${percentage}%"></span></div></div><a class="btn btn-primary btn-sm" href="campeonatos.html?id=${championship.id}">Ver detalhes</a></article>`;
      })
      .join("");
    q("busca").dispatchEvent(new Event("input"));

    q("jogos-reais").innerHTML = games
      .map((game) => {
        const available = jogoDisponivel(game);
        const cover = imagemCapaJogo(game);
        const description = available
          ? game.resumo || game.description || "Descrição indisponível."
          : "Este jogo estará disponível em breve na Rivals Arena.";
        const action = available
          ? `<a class="btn btn-primary btn-sm" href="jogos.html?id=${game.id}">Conhecer o jogo</a>`
          : '<span class="tag tag-status status-unknown game-status">Em breve</span>';
        const artwork = cover
          ? `<img src="${cover}" alt="Capa de ${esc(game.nome)}" loading="lazy" decoding="async">`
          : `<span>${esc(game.nome)}</span>`;
        return `<article class="game${available ? "" : " game-upcoming"}"><div class="game-banner">${artwork}</div><div class="game-info"><h3>${esc(game.nome)}</h3><p>${esc(description)}</p>${action}</div></article>`;
      })
      .join("");
    if (!games.length)
      renderState(
        q("jogos-reais"),
        "empty",
        "O catálogo ainda não possui jogos.",
      );
  } catch (error) {
    const message = error.message || "Não foi possível carregar os dados.";
    ["usuarios", "campeonatos", "partidas", "jogos"].forEach((key) => {
      const element = q("stat-" + key);
      if (element) element.textContent = "—";
    });
    document.querySelectorAll("[data-count-for]").forEach((element) => {
      element.textContent = "—";
    });
    q("vazio").hidden = true;
    renderState(
      q("lista-itens"),
      "error",
      message,
      "Tentar novamente",
      carregarInicio,
    );
    renderState(
      q("jogos-reais"),
      "error",
      message,
      "Tentar novamente",
      carregarInicio,
    );
  } finally {
    stopLoadingChampionships();
    stopLoadingGames();
    q("lista-itens").setAttribute("aria-busy", "false");
    q("jogos-reais").setAttribute("aria-busy", "false");
    q("estatisticas").setAttribute("aria-busy", "false");
  }
}

if (q("lista-itens")) carregarInicio();
