(async () => {
  const todos = await Api.listar("jogadores"),
    jogos = await Api.listar("jogos");
  q("r-jogo").innerHTML = jogos
    .map((j) => `<option>${esc(j.nome)}</option>`)
    .join("");
  function render() {
    const jg = q("r-jogo").value,
      rg = q("r-regiao").value,
      b = q("r-busca").value.toLowerCase();
    const base = todos
      .filter((p) => p.jogo === jg && (!rg || p.regiao === rg))
      .sort((a, b) => b.pontos - a.pontos);
    q("podio").innerHTML = base
      .slice(0, 3)
      .map(
        (p, i) =>
          `<div><span style="color:${["var(--ouro)", "var(--prata)", "var(--bronze)"][i]}">${i + 1}º LUGAR</span><b>${esc(p.nome)}</b></div>`,
      )
      .join("");
    const linhas = base
      .map((p, i) => ({ ...p, pos: i + 1 }))
      .filter((p) => p.nome.toLowerCase().includes(b));
    q("tabela").innerHTML = linhas.length
      ? linhas
          .map(
            (p) =>
              `<tr><td>${p.pos}</td><td>${esc(p.nome)}</td><td>${p.vitorias}</td><td>${p.derrotas}</td><td>${p.partidas}</td><td>${p.pontos}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6">Nenhum jogador encontrado.</td></tr>';
  }
  ["r-jogo", "r-temporada", "r-regiao"].forEach((i) =>
    q(i).addEventListener("change", render),
  );
  q("r-busca").addEventListener("input", render);
  render();
})();
