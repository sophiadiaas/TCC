function domain(db) {
  const all = async (sql, ...args) => (await db.query(sql, args)).rows;
  const one = async (sql, ...args) =>
    (await db.query(sql, args)).rows[0] || null;
  const run = async (sql, ...args) => {
    const result = await db.query(sql, args);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows[0]?.id,
    };
  };
  const fail = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
  };
  const required = async (table, id) =>
    (await one(`SELECT * FROM ${table} WHERE id=?`, Number(id) || 0)) ||
    fail("Registro não encontrado.", 404);
  const owner = (actual, id) => {
    if (actual !== id) fail("Você não tem permissão para esta ação.", 403);
  };
  const tx = (fn) => db.transaction(fn);
  const text = (v, label, min = 1, max = 120) => {
    if (typeof v !== "string" || v.trim().length < min || v.trim().length > max)
      fail(`${label}: informe de ${min} a ${max} caracteres.`);
    return v.trim();
  };
  const integer = (v, label, min, max) => {
    if (
      !Number.isInteger(Number(v)) ||
      v === "" ||
      v === null ||
      v === undefined ||
      Number(v) < min ||
      Number(v) > max
    )
      fail(`${label}: valor entre ${min} e ${max}.`);
    return Number(v);
  };
  const date = (v) => {
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        v,
      ) ||
      !Number.isFinite(Date.parse(v))
    )
      fail("Data e horário inválidos.");
    const [year, month, day] = v.slice(0, 10).split("-").map(Number);
    const calendar = new Date(0);
    calendar.setUTCFullYear(year, month - 1, day);
    if (
      calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day
    )
      fail("Data de calendário inválida.");
    return new Date(v).toISOString();
  };
  const editable = (t) => {
    if (t.status !== "open")
      fail(
        "Campeonato iniciado: estrutura e inscrições estão bloqueadas.",
        409,
      );
  };
  const rosterLocked = async (id) =>
    !!(await one(
      "SELECT 1 FROM registrations r JOIN tournaments t ON t.id=r.tournament_id WHERE r.team_id=? AND t.status IN ('open','running')",
      id,
    ));

  async function register(tournamentId, teamId, userId) {
    return tx(async () => {
      const t = await required("tournaments", tournamentId),
        team = await required("teams", teamId);
      editable(t);
      owner(team.captain_id, userId);
      if (Date.parse(t.starts_at) <= Date.now())
        fail("Prazo de inscrição encerrado.", 409);
      if (t.game_id !== team.game_id)
        fail("O time deve jogar a modalidade do campeonato.");
      if (
        await one(
          "SELECT id FROM registrations WHERE tournament_id=? AND team_id=?",
          t.id,
          team.id,
        )
      )
        fail("Time já inscrito.", 409);
      if (
        (
          await one(
            "SELECT COUNT(*) n FROM registrations WHERE tournament_id=?",
            t.id,
          )
        ).n >= t.capacity
      )
        fail("Campeonato lotado.", 409);
      const members = await all(
        "SELECT user_id FROM team_members WHERE team_id=?",
        team.id,
      );
      if (members.length !== t.team_size)
        fail(`O time deve ter exatamente ${t.team_size} jogador(es).`);
      for (const m of members)
        if (
          await one(
            "SELECT 1 FROM registration_players rp JOIN registrations r ON r.id=rp.registration_id WHERE r.tournament_id=? AND rp.user_id=?",
            t.id,
            m.user_id,
          )
        )
          fail(
            "Um jogador já está inscrito neste campeonato por outro time.",
            409,
          );
      const result = await run(
        "INSERT INTO registrations(tournament_id,team_id) VALUES(?,?) RETURNING id",
        t.id,
        team.id,
      );
      const id = Number(result.lastInsertRowid);
      for (const m of members)
        await run(
          "INSERT INTO registration_players VALUES(?,?)",
          id,
          m.user_id,
        );
      return required("registrations", id);
    });
  }

  async function advance(tid) {
    const rows = await all(
      "SELECT * FROM matches WHERE tournament_id=? ORDER BY round,position",
      tid,
    );
    for (const m of rows) {
      if (["done", "bye"].includes(m.status)) continue;
      let a = m.team_a,
        b = m.team_b,
        known = m.round === 1;
      if (m.round > 1) {
        const sources = await all(
          "SELECT * FROM matches WHERE tournament_id=? AND round=? AND position IN (?,?) ORDER BY position",
          tid,
          m.round - 1,
          m.position * 2 - 1,
          m.position * 2,
        );
        known =
          sources.length === 2 &&
          sources.every((s) => ["done", "bye"].includes(s.status));
        if (known) {
          a = sources[0].winner_id;
          b = sources[1].winner_id;
        }
      }
      if (!known) continue;
      await run(
        "UPDATE matches SET team_a=?,team_b=?,status=?,winner_id=? WHERE id=?",
        a,
        b,
        a && b ? "ready" : "bye",
        a && b ? null : a || b || null,
        m.id,
      );
    }
    const final = await one(
      "SELECT * FROM matches WHERE tournament_id=? ORDER BY round DESC LIMIT 1",
      tid,
    );
    if (final && ["done", "bye"].includes(final.status))
      await run("UPDATE tournaments SET status='finished' WHERE id=?", tid);
  }

  async function start(id, userId) {
    return tx(async () => {
      const t = await required("tournaments", id);
      owner(t.owner_id, userId);
      editable(t);
      if (Date.parse(t.starts_at) > Date.now())
        fail("Aguarde a data e o horário de início.", 409);
      const teams = await all(
        "SELECT team_id FROM registrations WHERE tournament_id=? ORDER BY id",
        t.id,
      );
      if (teams.length < 2) fail("São necessários pelo menos dois times.", 409);
      const size = 2 ** Math.ceil(Math.log2(teams.length)),
        rounds = Math.log2(size);
      let index = 0;
      const byes = size - teams.length;
      for (let p = 1; p <= size / 2; p++) {
        const a = teams[index++]?.team_id || null;
        const b = p <= byes ? null : teams[index++]?.team_id || null;
        await run(
          "INSERT INTO matches(tournament_id,round,position,team_a,team_b) VALUES(?,1,?,?,?)",
          t.id,
          p,
          a,
          b,
        );
      }
      for (let r = 2; r <= rounds; r++)
        for (let p = 1; p <= size / 2 ** r; p++)
          await run(
            "INSERT INTO matches(tournament_id,round,position) VALUES(?,?,?)",
            t.id,
            r,
            p,
          );
      await run("UPDATE tournaments SET status='running' WHERE id=?", t.id);
      await advance(t.id);
      return all(
        "SELECT * FROM matches WHERE tournament_id=? ORDER BY round,position",
        t.id,
      );
    });
  }

  async function result(id, body, userId) {
    return tx(async () => {
      const m = await required("matches", id),
        t = await required("tournaments", m.tournament_id);
      owner(t.owner_id, userId);
      if (m.status !== "ready" || t.status !== "running")
        fail("A partida não está pronta ou já tem resultado.", 409);
      const a = integer(body.score_a, "Placar A", 0, 999),
        b = integer(body.score_b, "Placar B", 0, 999);
      if (a === b) fail("Eliminação simples não permite empate.");
      if (m.scheduled_at && Date.parse(m.scheduled_at) > Date.now())
        fail("Aguarde o horário agendado da partida.", 409);
      await run(
        "UPDATE matches SET score_a=?,score_b=?,winner_id=?,status='done',completed_at=CURRENT_TIMESTAMP WHERE id=?",
        a,
        b,
        a > b ? m.team_a : m.team_b,
        m.id,
      );
      await advance(t.id);
      return required("matches", id);
    });
  }

  async function ranking(gameId) {
    return (
      await all(
        `SELECT u.id,u.name nome,u.username usuario,u.region regiao,g.id game_id,g.name jogo,
 SUM(CASE WHEN m.winner_id=r.team_id THEN 1 ELSE 0 END) vitorias,
 SUM(CASE WHEN m.winner_id!=r.team_id THEN 1 ELSE 0 END) derrotas,COUNT(*) partidas,
 SUM(CASE WHEN m.winner_id=r.team_id THEN 2 ELSE 0 END) pontos
 FROM matches m JOIN tournaments t ON t.id=m.tournament_id JOIN games g ON g.id=t.game_id
 JOIN registrations r ON r.tournament_id=t.id AND r.team_id IN(m.team_a,m.team_b)
 JOIN registration_players rp ON rp.registration_id=r.id JOIN users u ON u.id=rp.user_id
 WHERE m.status='done' AND t.game_id=COALESCE(?,t.game_id) GROUP BY u.id,g.id ORDER BY pontos DESC,vitorias DESC,derrotas ASC,u.id ASC`,
        gameId || null,
      )
    ).map((x, i) => ({ ...x, pos: i + 1 }));
  }

  const publicUser = (u) => ({
    id: u.id,
    usuario: u.username,
    nome: u.name,
    bio: u.bio,
    regiao: u.region,
    desde: u.created_at,
  });
  return {
    all,
    one,
    run,
    fail,
    required,
    owner,
    tx,
    text,
    integer,
    date,
    editable,
    rosterLocked,
    register,
    start,
    result,
    ranking,
    publicUser,
  };
}
module.exports = { domain };
