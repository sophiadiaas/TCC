const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { openDatabase } = require("../src/db");
const { seed } = require("../src/seed");
const { createApp } = require("../src/app");
async function setup(t) {
  const db = openDatabase(":memory:");
  await seed(db);
  const server = createApp(db).listen(0);
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
    db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  function client() {
    let cookie = "";
    return async (path, method = "GET", body, expected = 200) => {
      const r = await fetch(base + path, {
        method,
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "RivalsArena",
          cookie,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      const value = r.status === 204 ? null : await r.json();
      assert.equal(r.status, expected, JSON.stringify(value));
      return value;
    };
  }
  return { db, client, base };
}
async function register(c, n) {
  return c(
    "auth/register",
    "POST",
    {
      usuario: "player" + n,
      email: `p${n}@example.com`,
      senha: "SenhaSegura123!",
    },
    201,
  );
}
async function team(c, n) {
  return c("times", "POST", { nome: "Time " + n, game_id: 1 }, 201);
}
async function tournament(c, capacity = 4, size = 1) {
  return c(
    "campeonatos",
    "POST",
    {
      nome: "Copa de teste",
      game_id: 1,
      capacity,
      team_size: size,
      starts_at: new Date(Date.now() + 3600000).toISOString(),
    },
    201,
  );
}
function past(db, id) {
  db.prepare("UPDATE tournaments SET starts_at=? WHERE id=?").run(
    new Date(Date.now() - 1000).toISOString(),
    id,
  );
}
test("autenticação, sessão persistente, validação e privacidade", async (t) => {
  const { client, base, db } = await setup(t);
  const c = client(),
    anonymous = client();
  await anonymous("times", "POST", { nome: "Proibido", game_id: 1 }, 401);
  await c(
    "auth/register",
    "POST",
    { usuario: "x", email: "ruim", senha: "a" },
    400,
  );
  const u = await register(c, 1);
  assert.equal((await c("auth/me")).id, u.id);
  assert.ok(!("senha" in u));
  assert.ok(!("password_hash" in (await anonymous("usuarios"))[0]));
  await registerDuplicate();
  async function registerDuplicate() {
    await c(
      "auth/register",
      "POST",
      {
        usuario: "player1",
        email: "other@example.com",
        senha: "SenhaSegura123!",
      },
      409,
    );
  }
  assert.ok(
    !db
      .prepare("SELECT password_hash FROM users")
      .get()
      .password_hash.includes("SenhaSegura123!"),
  );
  await c("auth/logout", "POST", {}, 204);
  assert.equal(await c("auth/me"), null);
  await c("auth/login", "POST", { login: "PLAYER1", senha: "errada" }, 401);
  await c("auth/login", "POST", { login: "PLAYER1", senha: "SenhaSegura123!" });
  const res = await fetch(base + "auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 403);
  await c("usuarios/" + u.id, "PUT", {
    nome: "Novo nome",
    bio: "Perfil editado",
  });
  assert.equal((await c("perfil")).nome, "Novo nome");
  await c(
    "usuarios/" + u.id,
    "PUT",
    { senha: "OutraSenha123!", senha_atual: "invalida" },
    403,
  );
  await c("usuarios/" + u.id, "PUT", {
    senha: "OutraSenha123!",
    senha_atual: "SenhaSegura123!",
  });
  await c("usuarios/" + u.id, "DELETE", undefined, 204);
  assert.equal(await c("auth/me"), null);
});
test("aceita origem HTTPS encaminhada pelo proxy do Render", async (t) => {
  const { base } = await setup(t);
  const target = new URL(base);
  const response = await new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}auth/register`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "RivalsArena",
          origin: "https://tcc-rbdt.onrender.com",
          host: "tcc-rbdt.onrender.com",
          "x-forwarded-proto": "https",
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res));
      },
    );
    request.on("error", reject);
    request.end(
      JSON.stringify({
        usuario: "renderuser",
        email: "render@example.com",
        senha: "SenhaSegura123!",
      }),
    );
  });
  assert.equal(response.statusCode, 201);
});
test("CRUD de catálogo, times, membros e permissões", async (t) => {
  const { client } = await setup(t),
    a = client(),
    b = client();
  await register(a, 1);
  const ub = await register(b, 2);
  const g = await a(
    "jogos",
    "POST",
    {
      nome: "Novo Jogo",
      genero: "Duelo",
      resumo: "Descrição do jogo",
      plataformas: "PC",
    },
    201,
  );
  await b("jogos/" + g.id, "PUT", { nome: "Roubo" }, 403);
  await a("jogos/" + g.id, "PUT", { nome: "Novo Jogo 2" });
  assert.equal((await a("jogos/" + g.id)).nome, "Novo Jogo 2");
  await a("jogos/" + g.id, "DELETE", undefined, 204);
  const tm = await team(a, 1);
  await b("times/" + tm.id, "PUT", { nome: "Roubo" }, 403);
  await b(`times/${tm.id}/membros`, "POST", {}, 201);
  await b(`times/${tm.id}/membros`, "POST", {}, 409);
  assert.equal((await a("times/" + tm.id)).membros.length, 2);
  await a(`times/${tm.id}/membros/${ub.id}`, "DELETE", undefined, 204);
  await a("times/" + tm.id, "PUT", { nome: "Time novo" });
  await a("times/" + tm.id, "DELETE", undefined, 204);
});
test("limites, elenco, datas, duplicidades, mudança e cancelamento de inscrição", async (t) => {
  const { client, db } = await setup(t),
    a = client(),
    b = client(),
    c = client();
  await register(a, 1);
  const ub = await register(b, 2);
  await register(c, 3);
  const ta = await team(a, 1),
    tb = await team(b, 2),
    tc = await team(c, 3),
    cup = await tournament(a, 2);
  const reg = await a(
    "inscricoes",
    "POST",
    { tournament_id: cup.id, team_id: ta.id },
    201,
  );
  await a("inscricoes", "POST", { tournament_id: cup.id, team_id: ta.id }, 409);
  await b("inscricoes", "POST", { tournament_id: cup.id, team_id: ta.id }, 403);
  await a("campeonatos/" + cup.id + "/iniciar", "POST", {}, 409);
  await a("times/" + ta.id, "PUT", { nome: "Bloqueado" }, 409);
  const ta2 = await team(a, 4);
  await a(
    "inscricoes",
    "POST",
    { tournament_id: cup.id, team_id: ta2.id },
    409,
  );
  await a("inscricoes/" + reg.id, "PUT", { team_id: ta2.id });
  await b("inscricoes", "POST", { tournament_id: cup.id, team_id: tb.id }, 201);
  await c("inscricoes", "POST", { tournament_id: cup.id, team_id: tc.id }, 409);
  await a("campeonatos/" + cup.id, "PUT", { capacity: 1 }, 400);
  await a("campeonatos/" + cup.id, "PUT", { game_id: 2 }, 409);
  await a("inscricoes/" + reg.id, "DELETE", undefined, 204);
  assert.equal((await a("campeonatos/" + cup.id)).inscritos, 1);
  const duo = await tournament(a, 4, 2);
  await a("inscricoes", "POST", { tournament_id: duo.id, team_id: ta.id }, 400);
  await b(`times/${ta.id}/membros`, "POST", {}, 201);
  await a("inscricoes", "POST", { tournament_id: duo.id, team_id: ta.id }, 201);
  past(db, cup.id);
  await a(
    "inscricoes",
    "POST",
    { tournament_id: cup.id, team_id: ta2.id },
    409,
  );
  await a("campeonatos/" + cup.id, "DELETE", undefined, 204);
});
test("torneio completo com três times, bye, final, histórico e ranking derivado", async (t) => {
  const { client, db } = await setup(t),
    clients = [client(), client(), client()];
  const ts = [];
  for (let i = 0; i < 3; i++) {
    await register(clients[i], i + 1);
    ts.push(await team(clients[i], i + 1));
  }
  const a = clients[0],
    cup = await tournament(a);
  for (let i = 0; i < 3; i++)
    await clients[i](
      "inscricoes",
      "POST",
      { tournament_id: cup.id, team_id: ts[i].id },
      201,
    );
  past(db, cup.id);
  await clients[1]("campeonatos/" + cup.id + "/iniciar", "POST", {}, 403);
  await a("campeonatos/" + cup.id + "/iniciar", "POST", {});
  let bracket = (await a("campeonatos/" + cup.id)).partidas;
  assert.equal(bracket.length, 3);
  assert.equal(bracket.filter((m) => m.status === "bye").length, 1);
  const semi = bracket.find((m) => m.status === "ready");
  await clients[1](
    `partidas/${semi.id}/resultado`,
    "POST",
    { score_a: 2, score_b: 0 },
    403,
  );
  await a(
    `partidas/${semi.id}/resultado`,
    "POST",
    { score_a: 1, score_b: 1 },
    400,
  );
  await a(`partidas/${semi.id}/resultado`, "POST", { score_a: 2, score_b: 0 });
  await a(
    `partidas/${semi.id}/resultado`,
    "POST",
    { score_a: 2, score_b: 0 },
    409,
  );
  bracket = (await a("campeonatos/" + cup.id)).partidas;
  const final = bracket.find((m) => m.round === 2);
  assert.equal(final.status, "ready");
  await a(
    `partidas/${final.id}`,
    "PUT",
    { stream_url: "javascript:alert(1)" },
    400,
  );
  await a(`partidas/${final.id}`, "PUT", {
    stream_url: "https://www.twitch.tv/arena",
  });
  await a(`partidas/${final.id}/resultado`, "POST", { score_a: 3, score_b: 0 });
  assert.equal((await a("campeonatos/" + cup.id)).status_code, "finished");
  const ranks = await a("jogadores");
  assert.equal(
    ranks.reduce((s, r) => s + r.pontos, 0),
    4,
  );
  assert.equal(
    ranks.reduce((s, r) => s + r.partidas, 0),
    4,
  );
  const p = await a("perfil");
  assert.equal(p.stats.vitorias, 1);
  assert.equal(p.stats.pontos, 2);
  assert.equal(p.historico.length, 1);
  await a("campeonatos/" + cup.id, "DELETE", undefined, 409);
  await a(
    "partidas/" + semi.id,
    "DELETE",
    { starts_at: new Date(Date.now() + 3600000).toISOString() },
    409,
  );
});
test("chave com cinco times, avanços automáticos e reinício sem resultados", async (t) => {
  const { client, db } = await setup(t);
  const cs = [],
    ts = [];
  for (let i = 0; i < 5; i++) {
    const c = client();
    cs.push(c);
    await register(c, i + 1);
    ts.push(await team(c, i + 1));
  }
  const a = cs[0],
    cup = await tournament(a, 8);
  for (let i = 0; i < 5; i++)
    await cs[i](
      "inscricoes",
      "POST",
      { tournament_id: cup.id, team_id: ts[i].id },
      201,
    );
  past(db, cup.id);
  let ms = await a("partidas", "POST", { tournament_id: cup.id }, 201);
  assert.equal(ms.length, 7);
  await a(
    "partidas/" + ms[0].id,
    "DELETE",
    { starts_at: new Date(Date.now() + 3600000).toISOString() },
    204,
  );
  assert.equal((await a("campeonatos/" + cup.id)).status_code, "open");
  past(db, cup.id);
  await a("partidas", "POST", { tournament_id: cup.id }, 201);
  for (let n = 0; n < 10; n++) {
    const c = await a("campeonatos/" + cup.id);
    if (c.status_code === "finished") break;
    const ready = c.partidas.find((m) => m.status === "ready");
    assert.ok(ready);
    await a(`partidas/${ready.id}/resultado`, "POST", {
      score_a: 2,
      score_b: 1,
    });
  }
  assert.equal((await a("campeonatos/" + cup.id)).status_code, "finished");
  assert.equal(
    (await a("jogadores")).reduce((s, r) => s + r.pontos, 0),
    8,
  );
});
test("comunidade: autoria, curtidas idempotentes, comentários e exclusão em cascata", async (t) => {
  const { client } = await setup(t),
    a = client(),
    b = client();
  await register(a, 1);
  await register(b, 2);
  const p = await a(
    "posts",
    "POST",
    { texto: "<script>alert(1)</script>" },
    201,
  );
  assert.equal((await b("posts/" + p.id)).texto, "<script>alert(1)</script>");
  await b("posts/" + p.id, "PUT", { texto: "Roubo" }, 403);
  await a("posts/" + p.id, "PUT", { texto: "Texto editado" });
  await b(`posts/${p.id}/curtidas`, "POST", {});
  await b(`posts/${p.id}/curtidas`, "POST", {});
  assert.equal((await a("posts/" + p.id)).curtidas, 1);
  await b(`posts/${p.id}/curtidas`, "DELETE");
  const c = await b(
    `posts/${p.id}/comentarios`,
    "POST",
    { texto: "Comentário" },
    201,
  );
  await a("comentarios/" + c.id, "PUT", { texto: "Roubo" }, 403);
  await b("comentarios/" + c.id, "PUT", { texto: "Editado" });
  assert.equal((await a(`posts/${p.id}/comentarios`))[0].text, "Editado");
  await b("comentarios/" + c.id, "DELETE", undefined, 204);
  await a("posts/" + p.id, "DELETE", undefined, 204);
  await a("posts/" + p.id, "GET", undefined, 404);
});
test("migration idempotente e persistência em disco", async (t) => {
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arena-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "db.sqlite");
  let db = openDatabase(file);
  await seed(db);
  db.prepare(
    "INSERT INTO users(username,email,password_hash,name) VALUES('persistente','p@local.test','hash-de-teste','Persistente')",
  ).run();
  db.prepare("INSERT INTO posts(user_id,text) VALUES(1,'persistente')").run();
  const names = db.prepare("SELECT name FROM games").all();
  db.close();
  db = openDatabase(file);
  assert.deepEqual(db.prepare("SELECT name FROM games").all(), names);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM migrations").get().n, 2);
  assert.equal(db.prepare("SELECT text FROM posts").get().text, "persistente");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  db.close();
});
test("chaves de 2 a 64 times: sempre n-1 partidas reais, campeão único e sem confrontos vazios", async () => {
  const { domain } = require("../src/domain");
  for (let count = 2; count <= 64; count++) {
    const db = openDatabase(":memory:");
    await seed(db);
    const d = domain(db);
    for (let i = 1; i <= count; i++) {
      d.run(
        "INSERT INTO users(id,username,email,password_hash,name) VALUES(?,?,?,?,?)",
        i,
        "u" + i,
        i + "@test.local",
        "hash-teste",
        "User " + i,
      );
      d.run(
        "INSERT INTO teams(id,name,game_id,captain_id) VALUES(?,?,1,?)",
        i,
        "Time " + i,
        i,
      );
      d.run("INSERT INTO team_members VALUES(?,?)", i, i);
    }
    d.run(
      "INSERT INTO tournaments(id,name,game_id,owner_id,capacity,team_size,starts_at) VALUES(1,'Teste',1,1,64,1,?)",
      new Date(Date.now() + 3600000).toISOString(),
    );
    for (let i = 1; i <= count; i++) d.register(1, i, i);
    d.run(
      "UPDATE tournaments SET starts_at=? WHERE id=1",
      new Date(Date.now() - 1000).toISOString(),
    );
    d.start(1, 1);
    let played = 0;
    while (d.required("tournaments", 1).status !== "finished") {
      const match = d.one(
        "SELECT * FROM matches WHERE status='ready' ORDER BY round,position LIMIT 1",
      );
      assert.ok(match, "Chave travada para " + count);
      assert.ok(match.team_a && match.team_b);
      assert.notEqual(match.team_a, match.team_b);
      d.result(match.id, { score_a: 2, score_b: 1 }, 1);
      assert.ok(++played <= count - 1);
    }
    assert.equal(played, count - 1);
    assert.equal(
      d.ranking().reduce((s, r) => s + r.pontos, 0),
      (count - 1) * 2,
    );
    assert.ok(
      d.one("SELECT winner_id FROM matches ORDER BY round DESC LIMIT 1")
        .winner_id,
    );
    db.close();
  }
});

test("datas de calendário e documentação da API consistentes", async (t) => {
  const { client } = await setup(t);
  const c = client();
  await register(c, 1);
  for (const starts_at of [
    "2027-02-30T10:00:00Z",
    "2027-13-01T10:00:00Z",
    "2027-12-01T10:00",
    "não é data",
  ])
    await c(
      "campeonatos",
      "POST",
      {
        nome: "Copa inválida",
        game_id: 1,
        capacity: 4,
        team_size: 1,
        starts_at,
      },
      400,
    );
  const spec = await c("openapi.json");
  let operations = 0;
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      assert.ok(value.$ref.startsWith("#/components/schemas/"));
      assert.ok(
        spec.components.schemas[value.$ref.split("/").pop()],
        value.$ref,
      );
    }
    for (const child of Object.values(value)) walk(child);
  }
  walk(spec);
  for (const item of Object.values(spec.paths))
    operations += Object.keys(item).length;
  const source = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "../src/app.js"),
    "utf8",
  );
  let implemented = 0;
  for (const route of source.matchAll(
    /app\.(get|post|put|delete)\(\s*["']\/api([^"']*)["']/g,
  )) {
    if (route[2] === "/openapi.json") continue;
    const path = route[2].replace(/:(\w+)/g, "{$1}");
    assert.ok(
      spec.paths[path]?.[route[1]],
      "Rota sem documentação: " + route[1] + " " + path,
    );
    implemented++;
  }
  assert.equal(operations, implemented);
  assert.equal(Object.keys(spec.paths).length, 29);
});
