const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const path = require("node:path");
const { domain } = require("./domain");
const {
  hashPassword,
  verifyPassword,
  digest,
  randomBytes,
} = require("./security");
function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  const d = domain(db);
  const {
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
    publicUser,
  } = d;
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    req.body ??= {};
    if (typeof req.body !== "object" || Array.isArray(req.body))
      return res.status(400).json({ error: "Envie um objeto JSON." });
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-Requested-With") !== "RivalsArena")
        return res
          .status(403)
          .json({ error: "Cabeçalho de proteção ausente." });
      if (
        req.get("origin") &&
        req.get("origin") !== `${req.protocol}://${req.get("host")}`
      )
        return res.status(403).json({ error: "Origem não permitida." });
    }
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("arena_session="))
      ?.slice(14);
    if (token) {
      const s = one(
        "SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?",
        digest(token),
        Date.now(),
      );
      if (s) req.user = required("users", s.user_id);
    }
    next();
  });
  const auth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Faça login para continuar." });
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 40,
    message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  });
  function session(res, id, remember = false) {
    run("DELETE FROM sessions WHERE expires_at<?", Date.now());
    const token = randomBytes(32).toString("hex"),
      age = (remember ? 30 : 1) * 86400000;
    run(
      "INSERT INTO sessions VALUES(?,?,?)",
      digest(token),
      id,
      Date.now() + age,
    );
    res.cookie("arena_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: remember ? age : undefined,
      path: "/",
    });
  }
  app.post("/api/auth/register", loginLimit, async (req, res) => {
    const b = req.body || {},
      username = text(b.usuario, "Usuário", 3, 20);
    if (!/^\w+$/.test(username)) fail("Use letras, números ou _ no usuário.");
    const email = text(b.email, "E-mail", 5, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("E-mail inválido.");
    const password = text(b.senha, "Senha", 8, 128);
    const hash = await hashPassword(password);
    const id = Number(
      run(
        "INSERT INTO users(username,email,password_hash,name) VALUES(?,?,?,?)",
        username,
        email,
        hash,
        username,
      ).lastInsertRowid,
    );
    session(res, id);
    res.status(201).json(publicUser(required("users", id)));
  });
  app.post("/api/auth/login", loginLimit, async (req, res) => {
    const b = req.body || {};
    const login = text(b.login, "Login", 1, 254);
    const password = text(b.senha, "Senha", 1, 128);
    const u = one(
      "SELECT * FROM users WHERE username=? OR email=?",
      login,
      login,
    );
    const dummy = "0123456789abcdef0123456789abcdef:" + "00".repeat(64);
    if (!(await verifyPassword(password, u?.password_hash || dummy)) || !u)
      fail("Usuário ou senha inválidos.", 401);
    session(res, u.id, b.lembrar === true);
    res.json(publicUser(u));
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("arena_session="))
      ?.slice(14);
    if (token) run("DELETE FROM sessions WHERE token_hash=?", digest(token));
    res.clearCookie("arena_session", { path: "/" });
    res.status(204).end();
  });
  app.get("/api/auth/me", (req, res) =>
    res.json(
      req.user ? { ...publicUser(req.user), email: req.user.email } : null,
    ),
  );
  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", database: one("SELECT 1 ok").ok === 1 }),
  );
  app.get("/api/stats", (req, res) =>
    res.json({
      usuarios: one("SELECT COUNT(*) n FROM users").n,
      campeonatos: one("SELECT COUNT(*) n FROM tournaments").n,
      partidas: one("SELECT COUNT(*) n FROM matches WHERE status='done'").n,
      jogos: one("SELECT COUNT(*) n FROM games").n,
    }),
  );
  app.get("/api/usuarios", (req, res) =>
    res.json(all("SELECT * FROM users ORDER BY id").map(publicUser)),
  );
  app.get("/api/usuarios/:id", (req, res) =>
    res.json(publicUser(required("users", req.params.id))),
  );
  app.put("/api/usuarios/:id", auth, async (req, res) => {
    const u = required("users", req.params.id);
    owner(u.id, req.user.id);
    const b = req.body || {};
    const name = text(b.nome ?? u.name, "Nome", 1, 80),
      bio = text(b.bio ?? u.bio, "Bio", 0, 500),
      region = text(b.regiao ?? u.region, "Região", 1, 60);
    let hash = u.password_hash;
    if (b.senha) {
      if (
        !b.senha_atual ||
        !(await verifyPassword(b.senha_atual, u.password_hash))
      )
        fail("Senha atual incorreta.", 403);
      hash = await hashPassword(text(b.senha, "Nova senha", 8, 128));
    }
    tx(() => {
      run(
        "UPDATE users SET name=?,bio=?,region=?,password_hash=? WHERE id=?",
        name,
        bio,
        region,
        hash,
        u.id,
      );
      if (b.senha) run("DELETE FROM sessions WHERE user_id=?", u.id);
    });
    if (b.senha) session(res, u.id);
    res.json(publicUser(required("users", u.id)));
  });
  app.delete("/api/usuarios/:id", auth, (req, res) => {
    const u = required("users", req.params.id);
    owner(u.id, req.user.id);
    if (
      one("SELECT 1 FROM games WHERE owner_id=?", u.id) ||
      one("SELECT 1 FROM teams WHERE captain_id=?", u.id) ||
      one("SELECT 1 FROM tournaments WHERE owner_id=?", u.id) ||
      one("SELECT 1 FROM registration_players WHERE user_id=?", u.id)
    )
      fail(
        "Remova seus times e campeonatos sem histórico antes de excluir. Contas vinculadas a competições mantêm a integridade do histórico.",
        409,
      );
    run("DELETE FROM users WHERE id=?", u.id);
    res.clearCookie("arena_session", { path: "/" });
    res.status(204).end();
  });
  const gameView = (g) => ({
    ...g,
    nome: g.name,
    titulo: g.name.toUpperCase(),
    tag: "Rivals Arena",
    resumo: g.description,
    genero: g.genre,
    plataformas: g.platforms,
    descricao: [g.description],
  });
  app.get("/api/jogos", (req, res) =>
    res.json(all("SELECT * FROM games").map(gameView)),
  );
  app.get("/api/jogos/:id", (req, res) =>
    res.json(gameView(required("games", req.params.id))),
  );
  app.post("/api/jogos", auth, (req, res) => {
    const b = req.body || {};
    const id = Number(
      run(
        "INSERT INTO games(name,genre,description,platforms,owner_id) VALUES(?,?,?,?,?)",
        text(b.nome, "Nome", 3, 60),
        text(b.genero, "Gênero", 2, 60),
        text(b.resumo, "Descrição", 5, 2000),
        text(b.plataformas, "Plataformas", 2, 100),
        req.user.id,
      ).lastInsertRowid,
    );
    res.status(201).json(gameView(required("games", id)));
  });
  app.put("/api/jogos/:id", auth, (req, res) => {
    const g = required("games", req.params.id);
    owner(g.owner_id, req.user.id);
    const b = req.body || {};
    run(
      "UPDATE games SET name=?,genre=?,description=?,platforms=? WHERE id=?",
      text(b.nome ?? g.name, "Nome", 3, 60),
      text(b.genero ?? g.genre, "Gênero", 2, 60),
      text(b.resumo ?? g.description, "Descrição", 5, 2000),
      text(b.plataformas ?? g.platforms, "Plataformas", 2, 100),
      g.id,
    );
    res.json(gameView(required("games", g.id)));
  });
  app.delete("/api/jogos/:id", auth, (req, res) => {
    const g = required("games", req.params.id);
    owner(g.owner_id, req.user.id);
    run("DELETE FROM games WHERE id=?", g.id);
    res.status(204).end();
  });
  // Qualquer jogador pode organizar; catálogo compartilhado é entregue por migration/seed, sem administrador oculto.
  const teamView = (t) => ({
    ...t,
    nome: t.name,
    membros: all(
      "SELECT u.id,u.username usuario,u.name nome FROM team_members tm JOIN users u ON u.id=tm.user_id WHERE tm.team_id=?",
      t.id,
    ),
    locked: rosterLocked(t.id),
  });
  app.get("/api/times", (req, res) =>
    res.json(
      all(
        "SELECT t.*,g.name jogo FROM teams t JOIN games g ON g.id=t.game_id",
      ).map(teamView),
    ),
  );
  app.get("/api/times/:id", (req, res) =>
    res.json(teamView(required("teams", req.params.id))),
  );
  app.post("/api/times", auth, (req, res) => {
    const b = req.body || {};
    required("games", b.game_id);
    const id = tx(() => {
      const id = Number(
        run(
          "INSERT INTO teams(name,game_id,captain_id,description) VALUES(?,?,?,?)",
          text(b.nome, "Nome", 3, 60),
          Number(b.game_id),
          req.user.id,
          text(b.description || "", "Descrição", 0, 500),
        ).lastInsertRowid,
      );
      run("INSERT INTO team_members VALUES(?,?)", id, req.user.id);
      return id;
    });
    res.status(201).json(teamView(required("teams", id)));
  });
  app.put("/api/times/:id", auth, (req, res) => {
    const t = required("teams", req.params.id);
    owner(t.captain_id, req.user.id);
    if (rosterLocked(t.id))
      fail("Cancele inscrições abertas antes de alterar o time.", 409);
    run(
      "UPDATE teams SET name=?,description=? WHERE id=?",
      text(req.body.nome ?? t.name, "Nome", 3, 60),
      text(req.body.description ?? t.description, "Descrição", 0, 500),
      t.id,
    );
    res.json(teamView(required("teams", t.id)));
  });
  app.delete("/api/times/:id", auth, (req, res) => {
    const t = required("teams", req.params.id);
    owner(t.captain_id, req.user.id);
    if (one("SELECT 1 FROM registrations WHERE team_id=?", t.id))
      fail("Time inscrito ou com histórico não pode ser excluído.", 409);
    run("DELETE FROM teams WHERE id=?", t.id);
    res.status(204).end();
  });
  app.post("/api/times/:id/membros", auth, (req, res) => {
    const t = required("teams", req.params.id);
    if (rosterLocked(t.id)) fail("Elenco bloqueado por inscrição.", 409);
    if (one("SELECT COUNT(*) n FROM team_members WHERE team_id=?", t.id).n >= 8)
      fail("Limite de oito membros.", 409);
    run("INSERT INTO team_members VALUES(?,?)", t.id, req.user.id);
    res.status(201).json(teamView(t));
  });
  app.delete("/api/times/:id/membros/:userId", auth, (req, res) => {
    const t = required("teams", req.params.id),
      uid = Number(req.params.userId);
    if (req.user.id !== uid) owner(t.captain_id, req.user.id);
    if (uid === t.captain_id) fail("O capitão deve excluir o time para sair.");
    if (rosterLocked(t.id)) fail("Elenco bloqueado por inscrição.", 409);
    if (
      !run("DELETE FROM team_members WHERE team_id=? AND user_id=?", t.id, uid)
        .changes
    )
      fail("Membro não encontrado.", 404);
    res.status(204).end();
  });
  const statusLabel = {
    open: "Inscrições abertas",
    running: "Em Andamento",
    finished: "Finalizada",
  };
  const tournamentView = (t) => ({
    ...t,
    nome: t.name,
    titulo: t.name.toUpperCase(),
    jogo: required("games", t.game_id).name,
    status_code: t.status,
    status: statusLabel[t.status],
    limite: t.capacity,
    inicio: t.starts_at,
    inscritos: one(
      "SELECT COUNT(*) n FROM registrations WHERE tournament_id=?",
      t.id,
    ).n,
  });
  app.get("/api/campeonatos", (req, res) =>
    res.json(
      all("SELECT * FROM tournaments ORDER BY starts_at DESC").map(
        tournamentView,
      ),
    ),
  );
  app.get("/api/campeonatos/:id", (req, res) => {
    const t = required("tournaments", req.params.id);
    res.json({
      ...tournamentView(t),
      inscricoes: all(
        "SELECT r.*,t.name nome,t.captain_id FROM registrations r JOIN teams t ON t.id=r.team_id WHERE r.tournament_id=?",
        t.id,
      ),
      partidas: matchList(t.id),
    });
  });
  function tournamentInput(b, old = {}) {
    const game = required("games", b.game_id ?? old.game_id),
      starts = date(b.starts_at ?? old.starts_at);
    if (Date.parse(starts) <= Date.now()) fail("Escolha um início no futuro.");
    return [
      text(b.nome ?? old.name, "Nome", 3, 100),
      game.id,
      integer(b.capacity ?? old.capacity, "Limite de times", 2, 64),
      integer(b.team_size ?? old.team_size, "Jogadores por time", 1, 8),
      starts,
    ];
  }
  app.post("/api/campeonatos", auth, (req, res) => {
    const values = tournamentInput(req.body || {});
    const id = Number(
      run(
        "INSERT INTO tournaments(name,game_id,capacity,team_size,starts_at,owner_id) VALUES(?,?,?,?,?,?)",
        ...values,
        req.user.id,
      ).lastInsertRowid,
    );
    res.status(201).json(tournamentView(required("tournaments", id)));
  });
  app.put("/api/campeonatos/:id", auth, (req, res) => {
    const t = required("tournaments", req.params.id);
    owner(t.owner_id, req.user.id);
    editable(t);
    const v = tournamentInput(req.body || {}, t);
    const count = one(
      "SELECT COUNT(*) n FROM registrations WHERE tournament_id=?",
      t.id,
    ).n;
    if (count && (v[1] !== t.game_id || v[3] !== t.team_size))
      fail("Jogo e tamanho de elenco bloqueados após inscrição.", 409);
    if (v[2] < count) fail("Capacidade inferior ao número de inscritos.", 409);
    run(
      "UPDATE tournaments SET name=?,game_id=?,capacity=?,team_size=?,starts_at=? WHERE id=?",
      ...v,
      t.id,
    );
    res.json(tournamentView(required("tournaments", t.id)));
  });
  app.delete("/api/campeonatos/:id", auth, (req, res) => {
    const t = required("tournaments", req.params.id);
    owner(t.owner_id, req.user.id);
    editable(t);
    run("DELETE FROM tournaments WHERE id=?", t.id);
    res.status(204).end();
  });
  app.post("/api/campeonatos/:id/iniciar", auth, (req, res) =>
    res.json(d.start(req.params.id, req.user.id)),
  );
  app.post("/api/inscricoes", auth, (req, res) =>
    res
      .status(201)
      .json(d.register(req.body.tournament_id, req.body.team_id, req.user.id)),
  );
  app.get("/api/inscricoes", auth, (req, res) =>
    res.json(
      all(
        "SELECT r.* FROM registrations r JOIN teams t ON t.id=r.team_id JOIN tournaments c ON c.id=r.tournament_id WHERE t.captain_id=? OR c.owner_id=?",
        req.user.id,
        req.user.id,
      ),
    ),
  );
  app.get("/api/inscricoes/:id", auth, (req, res) => {
    const r = required("registrations", req.params.id);
    const t = required("teams", r.team_id),
      c = required("tournaments", r.tournament_id);
    if (req.user.id !== t.captain_id) owner(c.owner_id, req.user.id);
    res.json(r);
  });
  app.put("/api/inscricoes/:id", auth, (req, res) =>
    res.json(
      tx(() => {
        const r = required("registrations", req.params.id),
          t = required("teams", r.team_id);
        owner(t.captain_id, req.user.id);
        editable(required("tournaments", r.tournament_id));
        run("DELETE FROM registrations WHERE id=?", r.id);
        // register controla sua própria transação; aqui reutilizamos o fluxo sem transação aninhada.
        return replaceRegistration(r, req.body.team_id, req.user.id);
      }),
    ),
  );
  function replaceRegistration(r, teamId, uid) {
    const team = required("teams", teamId),
      t = required("tournaments", r.tournament_id);
    owner(team.captain_id, uid);
    if (Date.parse(t.starts_at) <= Date.now()) fail("Prazo encerrado.", 409);
    if (team.game_id !== t.game_id) fail("Modalidade diferente.");
    const members = all(
      "SELECT user_id FROM team_members WHERE team_id=?",
      team.id,
    );
    if (members.length !== t.team_size)
      fail("Quantidade de jogadores incorreta.");
    for (const m of members)
      if (
        one(
          "SELECT 1 FROM registration_players rp JOIN registrations x ON x.id=rp.registration_id WHERE x.tournament_id=? AND rp.user_id=?",
          t.id,
          m.user_id,
        )
      )
        fail("Jogador já inscrito.", 409);
    run(
      "INSERT INTO registrations(id,tournament_id,team_id) VALUES(?,?,?)",
      r.id,
      t.id,
      team.id,
    );
    for (const m of members)
      run("INSERT INTO registration_players VALUES(?,?)", r.id, m.user_id);
    return required("registrations", r.id);
  }
  app.delete("/api/inscricoes/:id", auth, (req, res) => {
    const r = required("registrations", req.params.id),
      t = required("tournaments", r.tournament_id),
      team = required("teams", r.team_id);
    if (req.user.id !== team.captain_id) owner(t.owner_id, req.user.id);
    editable(t);
    run("DELETE FROM registrations WHERE id=?", r.id);
    res.status(204).end();
  });
  function matchList(tid) {
    return all(
      `SELECT m.*,a.name nome_a,b.name nome_b,w.name vencedor,t.name campeonato,g.name jogo FROM matches m JOIN tournaments t ON t.id=m.tournament_id JOIN games g ON g.id=t.game_id LEFT JOIN teams a ON a.id=m.team_a LEFT JOIN teams b ON b.id=m.team_b LEFT JOIN teams w ON w.id=m.winner_id ${tid ? "WHERE m.tournament_id=?" : ""} ORDER BY m.tournament_id,m.round,m.position`,
      ...(tid ? [tid] : []),
    );
  }
  app.post("/api/partidas", auth, (req, res) =>
    res.status(201).json(d.start(req.body.tournament_id, req.user.id)),
  );
  app.delete("/api/partidas/:id", auth, (req, res) => {
    const m = required("matches", req.params.id),
      t = required("tournaments", m.tournament_id);
    owner(t.owner_id, req.user.id);
    if (
      one("SELECT 1 FROM matches WHERE tournament_id=? AND status='done'", t.id)
    )
      fail("Resultados existentes impedem desfazer a chave.", 409);
    const starts = date(req.body.starts_at);
    if (Date.parse(starts) <= Date.now())
      fail("Informe nova data futura para reabrir inscrições.");
    tx(() => {
      run("DELETE FROM matches WHERE tournament_id=?", t.id);
      run(
        "UPDATE tournaments SET status='open',starts_at=? WHERE id=?",
        starts,
        t.id,
      );
    });
    res.status(204).end();
  });
  app.get("/api/partidas", (req, res) =>
    res.json(
      matchList(
        req.query.tournament_id ? Number(req.query.tournament_id) : null,
      ),
    ),
  );
  app.get("/api/partidas/:id", (req, res) => {
    required("matches", req.params.id);
    res.json(matchList().find((x) => x.id === Number(req.params.id)));
  });
  app.post("/api/partidas/:id/resultado", auth, (req, res) =>
    res.json(d.result(req.params.id, req.body || {}, req.user.id)),
  );
  app.put("/api/partidas/:id", auth, (req, res) => {
    const m = required("matches", req.params.id),
      t = required("tournaments", m.tournament_id);
    owner(t.owner_id, req.user.id);
    if (["done", "bye"].includes(m.status))
      fail("Partida encerrada não pode ser alterada.", 409);
    let scheduled = null;
    if (req.body.scheduled_at) {
      scheduled = date(req.body.scheduled_at);
      if (
        Date.parse(scheduled) < Date.parse(t.starts_at) ||
        Date.parse(scheduled) < Date.now()
      )
        fail("Agende após o início do campeonato e no futuro.");
    }
    const url = text(req.body.stream_url || "", "Link da transmissão", 0, 500);
    if (url) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        fail("URL inválida.");
      }
      if (parsed.protocol !== "https:") fail("Use uma transmissão HTTPS.");
    }
    run(
      "UPDATE matches SET scheduled_at=?,stream_url=? WHERE id=?",
      scheduled,
      url,
      m.id,
    );
    res.json(required("matches", m.id));
  });
  app.get("/api/jogadores", (req, res) =>
    res.json(d.ranking(req.query.game_id ? Number(req.query.game_id) : null)),
  );
  app.get("/api/perfil", auth, (req, res) => {
    const u = req.user,
      rank = d.ranking();
    const rows = rank.filter((x) => x.id === u.id);
    const stats = rows.reduce(
      (s, r) => ({
        vitorias: s.vitorias + r.vitorias,
        derrotas: s.derrotas + r.derrotas,
        partidas: s.partidas + r.partidas,
        pontos: s.pontos + r.pontos,
      }),
      { vitorias: 0, derrotas: 0, partidas: 0, pontos: 0 },
    );
    const overall = Object.values(
      rank.reduce((a, r) => {
        a[r.id] ??= { id: r.id, pontos: 0 };
        a[r.id].pontos += r.pontos;
        return a;
      }, {}),
    ).sort((a, b) => b.pontos - a.pontos || a.id - b.id);
    stats.ranking = overall.findIndex((x) => x.id === u.id) + 1;
    const mine = all(
      "SELECT r.tournament_id,r.team_id FROM registrations r JOIN registration_players p ON p.registration_id=r.id WHERE p.user_id=?",
      u.id,
    );
    const history = matchList()
      .filter(
        (m) =>
          m.status === "done" &&
          mine.some(
            (r) =>
              r.tournament_id === m.tournament_id &&
              [m.team_a, m.team_b].includes(r.team_id),
          ),
      )
      .map((m) => {
        const own = mine.find((r) => r.tournament_id === m.tournament_id);
        return {
          ...m,
          oponente: own.team_id === m.team_a ? m.nome_b : m.nome_a,
          resultado: own.team_id === m.winner_id ? "Vitória" : "Derrota",
        };
      });
    res.json({
      ...publicUser(u),
      email: u.email,
      stats,
      historico: history,
      campeonatos: all(
        "SELECT DISTINCT t.* FROM tournaments t JOIN registrations r ON r.tournament_id=t.id JOIN registration_players p ON p.registration_id=r.id WHERE p.user_id=?",
        u.id,
      ).map(tournamentView),
    });
  });
  const postView = (p, uid) => ({
    ...p,
    autor: required("users", p.user_id).name,
    texto: p.text,
    data: p.created_at,
    curtidas: one("SELECT COUNT(*) n FROM likes WHERE post_id=?", p.id).n,
    comentarios: one("SELECT COUNT(*) n FROM comments WHERE post_id=?", p.id).n,
    curtido: !!one(
      "SELECT 1 FROM likes WHERE post_id=? AND user_id=?",
      p.id,
      uid || 0,
    ),
  });
  app.get("/api/posts", (req, res) =>
    res.json(
      all("SELECT * FROM posts ORDER BY id DESC").map((p) =>
        postView(p, req.user?.id),
      ),
    ),
  );
  app.get("/api/posts/:id", (req, res) =>
    res.json(postView(required("posts", req.params.id), req.user?.id)),
  );
  app.post("/api/posts", auth, (req, res) => {
    const id = Number(
      run(
        "INSERT INTO posts(user_id,text) VALUES(?,?)",
        req.user.id,
        text(req.body.texto, "Publicação", 1, 2000),
      ).lastInsertRowid,
    );
    res.status(201).json(postView(required("posts", id), req.user.id));
  });
  app.put("/api/posts/:id", auth, (req, res) => {
    const p = required("posts", req.params.id);
    owner(p.user_id, req.user.id);
    run(
      "UPDATE posts SET text=? WHERE id=?",
      text(req.body.texto, "Publicação", 1, 2000),
      p.id,
    );
    res.json(postView(required("posts", p.id), req.user.id));
  });
  app.delete("/api/posts/:id", auth, (req, res) => {
    const p = required("posts", req.params.id);
    owner(p.user_id, req.user.id);
    run("DELETE FROM posts WHERE id=?", p.id);
    res.status(204).end();
  });
  app.post("/api/posts/:id/curtidas", auth, (req, res) => {
    const p = required("posts", req.params.id);
    run("INSERT OR IGNORE INTO likes VALUES(?,?)", p.id, req.user.id);
    res.json(postView(p, req.user.id));
  });
  app.delete("/api/posts/:id/curtidas", auth, (req, res) => {
    const p = required("posts", req.params.id);
    run("DELETE FROM likes WHERE post_id=? AND user_id=?", p.id, req.user.id);
    res.json(postView(p, req.user.id));
  });
  const commentView = (c) => ({
    ...c,
    autor: required("users", c.user_id).name,
  });
  app.get("/api/posts/:id/comentarios", (req, res) => {
    required("posts", req.params.id);
    res.json(
      all(
        "SELECT * FROM comments WHERE post_id=? ORDER BY id",
        Number(req.params.id),
      ).map(commentView),
    );
  });
  app.get("/api/comentarios/:id", (req, res) =>
    res.json(commentView(required("comments", req.params.id))),
  );
  app.post("/api/posts/:id/comentarios", auth, (req, res) => {
    required("posts", req.params.id);
    const id = Number(
      run(
        "INSERT INTO comments(post_id,user_id,text) VALUES(?,?,?)",
        Number(req.params.id),
        req.user.id,
        text(req.body.texto, "Comentário", 1, 1000),
      ).lastInsertRowid,
    );
    res.status(201).json(commentView(required("comments", id)));
  });
  app.put("/api/comentarios/:id", auth, (req, res) => {
    const c = required("comments", req.params.id);
    owner(c.user_id, req.user.id);
    run(
      "UPDATE comments SET text=? WHERE id=?",
      text(req.body.texto, "Comentário", 1, 1000),
      c.id,
    );
    res.json(commentView(required("comments", c.id)));
  });
  app.delete("/api/comentarios/:id", auth, (req, res) => {
    const c = required("comments", req.params.id);
    owner(c.user_id, req.user.id);
    run("DELETE FROM comments WHERE id=?", c.id);
    res.status(204).end();
  });
  app.get("/api/openapi.json", (req, res) =>
    res.sendFile(path.join(__dirname, "../docs/openapi.json")),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint não encontrado." }),
  );
  app.use(
    "/docs/assets",
    express.static(require("swagger-ui-dist").getAbsoluteFSPath()),
  );
  app.get("/docs", (req, res) =>
    res.sendFile(path.join(__dirname, "../public/api.html")),
  );
  app.use(express.static(path.join(__dirname, "../public")));
  app.use((req, res) => res.status(404).send("Página não encontrada."));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (
      err.code?.startsWith("SQLITE_CONSTRAINT") ||
      /UNIQUE constraint|FOREIGN KEY constraint/.test(err.message)
    )
      return res
        .status(409)
        .json({ error: "Registro duplicado ou vinculado a outros dados." });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "JSON inválido." });
    if (err.status && err.status < 500)
      return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Falha interna. Tente novamente." });
  });
  return app;
}
module.exports = { createApp };
