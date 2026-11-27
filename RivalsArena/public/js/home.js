if (q("lista-jogos")) {
  (async () => {
    q("lista-jogos").innerHTML = (await Api.listar("jogos"))
      .map(cardJogo)
      .join("");
    q("lista-campeonatos").innerHTML = (await Api.listar("campeonatos"))
      .map(cardCampeonato)
      .join("");
    const top = (await Api.listar("jogadores"))
      .filter((player) => player.jogo === "Capivarada")
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 3);
    q("mini-ranking").innerHTML =
      (top.length
        ? ""
        : "<p>O ranking aparece após as primeiras partidas concluídas.</p>") +
      `<div class="podio">${top.map((player, index) => `<div><span>${index + 1}º LUGAR</span><b>${esc(player.nome)}</b><p>${player.pontos} pontos</p></div>`).join("")}</div><a class="btn" href="ranking.html">Ver ranking completo</a>`;
  })();
  (async () => {
    const stats = await Api.request("stats");
    for (const [key, value] of Object.entries(stats))
      q("stat-" + key).textContent = value.toLocaleString("pt-BR");
  })();
}

if (q("lista-itens")) {
  (async () => {
    try {
      const [stats, championships, games] = await Promise.all([
        Api.request("stats"),
        Api.listar("campeonatos"),
        Api.listar("jogos"),
      ]);

      for (const [key, value] of Object.entries(stats)) {
        const element = q("stat-" + key);
        if (element) element.textContent = value.toLocaleString("pt-BR");
      }

      const counts = {
        all: championships.length,
        open: 0,
        running: 0,
        finished: 0,
      };
      championships.forEach((championship) => {
        counts[championship.status_code]++;
      });
      document.querySelectorAll("[data-count-for]").forEach((element) => {
        element.textContent = counts[element.dataset.countFor] ?? 0;
      });

      const featured =
        championships.find(
          (championship) => championship.status_code === "open",
        ) || championships[0];
      if (featured) {
        q("destaque-dot").className =
          `dot dot-${{ open: "open", running: "live", finished: "done" }[featured.status_code]}`;
        q("destaque-nome").textContent = featured.nome;
        q("destaque-status").textContent = featured.status;
        q("destaque-inscritos").textContent = featured.inscritos;
        q("destaque-limite").textContent = featured.limite;
        q("destaque-vagas").textContent = Math.max(
          featured.limite - featured.inscritos,
          0,
        );
        const percent = featured.limite
          ? Math.min(100, (featured.inscritos / featured.limite) * 100)
          : 0;
        q("destaque-barra").style.width = `${percent}%`;
        q("destaque-detalhe").href = `campeonatos.html?id=${featured.id}`;
      } else {
        q("destaque-dot").className = "dot";
        q("destaque-nome").textContent = "Nenhum campeonato cadastrado";
        q("destaque-status").textContent = "Seja o primeiro organizador";
        q("destaque-inscritos").textContent = "0";
        q("destaque-limite").textContent = "0";
        q("destaque-vagas").textContent = "0";
        q("destaque-barra").style.width = "0%";
        q("destaque-detalhe").href = "campeonatos.html";
      }

      q("lista-itens").innerHTML = championships
        .map((championship) => {
          const percentage = championship.limite
            ? Math.min(
                100,
                (championship.inscritos / championship.limite) * 100,
              )
            : 0;
          const statusClass = {
            open: "open",
            running: "live",
            finished: "done",
          }[championship.status_code];
          return `<article class="row" data-status="${statusClass}" data-name="${esc(championship.nome)}"><div class="thumb">${esc(championship.nome.slice(0, 12))}</div><h3>${esc(championship.nome)}</h3><p class="status"><span class="dot dot-${statusClass}"></span>${esc(championship.status)}</p><div class="people"><span>${championship.inscritos}/${championship.limite}</span><div class="bar"><span style="width:${percentage}%"></span></div></div><a class="btn btn-primary btn-sm" href="campeonatos.html?id=${championship.id}">Ver detalhes</a></article>`;
        })
        .join("");
      q("busca").dispatchEvent(new Event("input"));

      q("jogos-reais").innerHTML = games
        .map(
          (game) =>
            `<article class="game"><div class="game-banner"><span>${esc(game.nome)}</span></div><div class="game-info"><h3>${esc(game.nome)}</h3><p>${esc(game.resumo)}</p><a class="btn btn-primary btn-sm" href="jogos.html?id=${game.id}">Conhecer o jogo</a></div></article>`,
        )
        .join("");
    } catch (error) {
      const empty = q("vazio");
      empty.hidden = false;
      empty.textContent = `Não foi possível carregar os dados: ${error.message}`;
      toast(error.message || "Falha ao carregar os dados.", "erro");
    }
  })();
}
