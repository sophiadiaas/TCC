(async () => {
  q("lista-jogos").innerHTML = (await Api.listar("jogos"))
    .map(cardJogo)
    .join("");
  q("lista-campeonatos").innerHTML = (await Api.listar("campeonatos"))
    .map(cardCampeonato)
    .join("");
  const top = (await Api.listar("jogadores"))
    .filter((p) => p.jogo === "Capivarada")
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 3);
  q("mini-ranking").innerHTML =
    (top.length
      ? ""
      : "<p>O ranking aparece após as primeiras partidas concluídas.</p>") +
    `<div class="podio">${top.map((p, i) => `<div><span>${i + 1}º LUGAR</span><b>${esc(p.nome)}</b><p>${p.pontos} pontos</p></div>`).join("")}</div><a class="btn" href="ranking.html">Ver ranking completo</a>`;
})();
(async () => {
  const s = await Api.request("stats");
  for (const [key, value] of Object.entries(s))
    q("stat-" + key).textContent = value.toLocaleString("pt-BR");
})();
