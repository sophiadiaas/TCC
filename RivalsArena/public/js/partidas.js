const tid = Number(new URLSearchParams(location.search).get("campeonato"));
let campeonato;
async function render() {
  campeonato = await Api.request("campeonatos/" + tid);
  q("titulo-chave").textContent = campeonato.nome;
  const matches = campeonato.partidas,
    u = Sessao.usuario();
  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  q("chave").innerHTML = rounds.length
    ? rounds
        .map(
          (r) =>
            `<section class="round"><h2>${r === Math.max(...rounds) ? "Final" : "Rodada " + r}</h2>${matches
              .filter((m) => m.round === r)
              .map(
                (m) =>
                  `<article class="match"><small>Partida #${m.id} · ${{ waiting: "Aguardando classificados", ready: "Pronta", done: "Encerrada", bye: "Avanço automático" }[m.status]}</small><p class="${m.winner_id === m.team_a && m.team_a ? "winner" : ""}">${esc(m.nome_a || "A definir")} <b>${m.score_a ?? "—"}</b></p><p class="${m.winner_id === m.team_b && m.team_b ? "winner" : ""}">${esc(m.nome_b || "A definir")} <b>${m.score_b ?? "—"}</b></p>${m.scheduled_at ? `<small>${esc(new Date(m.scheduled_at).toLocaleString("pt-BR"))}</small>` : ""}${m.stream_url ? `<a href="${esc(m.stream_url)}" target="_blank" rel="noopener noreferrer">Assistir transmissão ↗</a>` : ""}${u?.id === campeonato.owner_id && ["ready", "waiting"].includes(m.status) ? `<button class="btn" data-schedule="${m.id}">Agendar / transmissão</button>${m.status === "ready" ? `<button class="btn" data-result="${m.id}">Registrar resultado</button>` : ""}` : ""}</article>`,
              )
              .join("")}</section>`,
        )
        .join("")
    : '<p class="state state-empty">A chave ainda não foi gerada. Volte aos <a href="campeonatos.html">detalhes do campeonato</a>.</p>';
  q("voltar-camp").href = "campeonatos.html?id=" + tid;
  let reset = q("reset-chave");
  if (reset) reset.remove();
  if (
    u?.id === campeonato.owner_id &&
    matches.length &&
    !matches.some((m) => m.status === "done")
  ) {
    reset = document.createElement("button");
    reset.id = "reset-chave";
    reset.className = "btn";
    reset.textContent = "Desfazer chave e reabrir inscrições";
    q("chave").before(reset);
    reset.onclick = () => {
      abrirModal(
        '<h2>Reabrir campeonato</h2><p>Toda a chave sem resultados será removida. As inscrições serão mantidas.</p><form id="reset-form"><label>Novo início (horário local)<input type="datetime-local" name="starts_at" required></label><button class="btn">Reabrir</button><button type="button" class="btn" data-close-modal>Cancelar</button></form>',
      );
      q("reset-form").onsubmit = async (e) => {
        e.preventDefault();
        await Api.request("partidas/" + matches[0].id, "DELETE", {
          starts_at: new Date(
            e.target.elements.namedItem("starts_at").value,
          ).toISOString(),
        });
        location.href = "campeonatos.html?id=" + tid;
      };
    };
  }
}
q("chave").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const m = campeonato.partidas.find(
    (x) => x.id == (b.dataset.result || b.dataset.schedule),
  );
  if (!m) return;
  const result = !!b.dataset.result;
  abrirModal(
    `<h2>${result ? "Registrar resultado" : "Agendar partida"}</h2><p>${esc(m.nome_a || "A definir")} × ${esc(m.nome_b || "A definir")}</p>${result ? "<p>Confira o placar: resultados confirmados são definitivos e classificam o vencedor.</p>" : ""}<form id="match-form">${result ? '<label>Placar A<input name="score_a" type="number" min="0" max="999" required></label><label>Placar B<input name="score_b" type="number" min="0" max="999" required></label>' : `<label>Data e horário local (opcional)<input name="scheduled_at" type="datetime-local"></label><label>URL HTTPS da transmissão<input type="url" name="stream_url" value="${esc(m.stream_url)}" placeholder="https://www.twitch.tv/canal"></label>`}<button class="btn">Confirmar</button><button type="button" class="btn" data-close-modal>Cancelar</button></form>`,
  );
  if (!result && m.scheduled_at)
    q("match-form").elements.namedItem("scheduled_at").value = new Date(
      Date.parse(m.scheduled_at) -
        new Date(m.scheduled_at).getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  q("match-form").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (result) {
      if (!confirm("Confirmar o resultado definitivo?")) return;
      await Api.criar(`partidas/${m.id}/resultado`, data);
    } else {
      if (data.scheduled_at)
        data.scheduled_at = new Date(data.scheduled_at).toISOString();
      await Api.atualizar("partidas", m.id, data);
    }
    fecharModal();
    await render();
  };
};
(async () => {
  await Sessao.ready;
  if (!tid) {
    q("chave").innerHTML =
      '<p class="state state-empty">Para ver partidas e resultados, escolha um <a href="campeonatos.html">campeonato</a>.</p>';
    return;
  }
  try {
    await render();
  } catch (error) {
    q("chave").innerHTML =
      `<p class="state state-error" role="alert">${esc(error.message)}</p>`;
    toast(error.message || "Não foi possível carregar o chaveamento.", "erro");
  }
})();
