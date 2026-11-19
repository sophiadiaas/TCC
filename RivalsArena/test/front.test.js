const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, CookieJar, VirtualConsole, ResourceLoader } = require("jsdom");
const { openDatabase } = require("../src/db");
const { seed } = require("../src/seed");
const { createApp } = require("../src/app");
const wait = async (fn) => {
  const limit = Date.now() + 5000;
  while (Date.now() < limit) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.ok(fn(), "A tela não concluiu a atualização esperada.");
};
test("front integrado: renderização, times, campeonatos, perfil, posts e comentários usando HTTP real", async (t) => {
  const db = openDatabase(":memory:");
  await seed(db);
  const server = createApp(db).listen(0);
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
    db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const jar = new CookieJar();
  const response = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "RivalsArena",
    },
    body: JSON.stringify({
      usuario: "tester",
      email: "tester@example.com",
      senha: "SenhaSegura123!",
    }),
  });
  jar.setCookieSync(response.headers.get("set-cookie"), base);
  let errors = [];
  // Recursos externos (fontes) não fazem parte do teste da integração local.
  class LocalResources extends ResourceLoader {
    fetch(url, options) {
      return url.startsWith(base) ? super.fetch(url, options) : null;
    }
  }
  const resources = new LocalResources();
  async function page(path) {
    const vc = new VirtualConsole();
    vc.on("jsdomError", (err) => {
      if (!err.message.includes("navigation")) errors.push(err.message);
    });
    const dom = await JSDOM.fromURL(base + "/" + path, {
      cookieJar: jar,
      resources,
      runScripts: "dangerously",
      virtualConsole: vc,
      beforeParse(w) {
        w.fetch = async (url, opt = {}) => {
          const res = await fetch(new URL(url, base), {
            ...opt,
            headers: { ...opt.headers, cookie: jar.getCookieStringSync(base) },
          });
          const cookie = res.headers.get("set-cookie");
          if (cookie) jar.setCookieSync(cookie, base);
          return res;
        };
        w.confirm = () => true;
      },
    });
    t.after(() => dom.window.close());
    await wait(
      () =>
        dom.window.document.querySelector(".nav-links") || path === "api.html",
    );
    return dom.window;
  }
  const home = await page("index.html");
  await wait(
    () => home.document.querySelector("#stat-usuarios")?.textContent === "1",
  );
  assert.equal(home.document.querySelectorAll("#lista-jogos .card").length, 3);
  await wait(() =>
    home.document
      .querySelector("#mini-ranking")
      .textContent.includes("primeiras partidas"),
  );
  const times = await page("times.html");
  await wait(() => times.document.querySelector("#novo-time"));
  times.document.querySelector("#novo-time").click();
  times.document.querySelector("[name=nome]").value = "Time do DOM";
  times.document.querySelector("[name=description]").value =
    "Criado pelo formulário";
  times.document
    .querySelector("#time-form")
    .dispatchEvent(
      new times.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(() =>
    times.document.querySelector("#times").textContent.includes("Time do DOM"),
  );
  assert.equal(db.prepare("SELECT name FROM teams").get().name, "Time do DOM");
  const camps = await page("campeonatos.html");
  await wait(() => camps.document.querySelector("#criar-camp"));
  camps.document.querySelector("#criar-camp").click();
  camps.document.querySelector("[name=nome]").value = "Copa do DOM";
  camps.document.querySelector("[name=starts_at]").value = new Date(
    Date.now() + 3600000,
  )
    .toISOString()
    .slice(0, 16);
  camps.document
    .querySelector("#camp-form")
    .dispatchEvent(
      new camps.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(() =>
    camps.document.querySelector("#lista").textContent.includes("Copa do DOM"),
  );
  const cup = await page("campeonatos.html?id=1");
  await wait(() => cup.document.querySelector("#inscrever"));
  cup.document
    .querySelector("#inscrever")
    .dispatchEvent(
      new cup.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(
    () => db.prepare("SELECT COUNT(*) n FROM registrations").get().n === 1,
  );
  await wait(() =>
    cup.document.querySelector("#modal").textContent.includes("1/8 times"),
  );
  const comm = await page("comunidade.html");
  await wait(() =>
    comm.document.querySelector("#posts").textContent.includes("comunidade"),
  );
  comm.document.querySelector("#btn-publicar").click();
  comm.document.querySelector("#texto").value = "<script>texto seguro</script>";
  comm.document
    .querySelector("#form-post")
    .dispatchEvent(
      new comm.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(() => comm.document.querySelector("[data-comments]"));
  assert.equal(comm.document.querySelectorAll("#posts script").length, 0);
  comm.document.querySelector("[data-like]").click();
  await wait(() =>
    comm.document.querySelector("[data-like]").textContent.includes("1"),
  );
  comm.document.querySelector("[data-comments]").click();
  await wait(() => comm.document.querySelector("[data-comment-form]"));
  comm.document.querySelector("[data-comment-form] input").value =
    "Comentário pelo formulário";
  comm.document
    .querySelector("[data-comment-form]")
    .dispatchEvent(
      new comm.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(() =>
    comm.document
      .querySelector("#comments-1")
      .textContent.includes("Comentário pelo formulário"),
  );
  const profile = await page("perfil.html");
  await wait(() => profile.document.querySelector("#editar-perfil"));
  assert.ok(
    profile.document
      .querySelector("#disputados")
      .textContent.includes("Copa do DOM"),
  );
  profile.document.querySelector("#editar-perfil").click();
  profile.document.querySelector("[name=nome]").value = "Nome editado";
  profile.document
    .querySelector("#perfil-form")
    .dispatchEvent(
      new profile.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(
    () => db.prepare("SELECT name FROM users").get().name === "Nome editado",
  );
  for (const path of [
    "ranking.html",
    "jogos.html",
    "jogos.html?id=1",
    "partidas.html?campeonato=1",
    "privacidade.html",
  ]) {
    const w = await page(path);
    if (path === "jogos.html")
      await wait(() => w.document.querySelector("#lista-jogos .card"));
    if (path.startsWith("partidas"))
      await wait(() =>
        w.document.querySelector("#chave").textContent.includes("ainda não"),
      );
  }
  const d = require("../src/domain").domain(db);
  d.run(
    "INSERT INTO users(username,email,password_hash,name) VALUES('oponente','op@example.com','hash-teste','Oponente')",
  );
  d.run(
    "INSERT INTO teams(name,game_id,captain_id) VALUES('Time Oponente',1,2)",
  );
  d.run("INSERT INTO team_members VALUES(2,2)");
  d.register(1, 2, 2);
  d.run(
    "UPDATE tournaments SET starts_at=? WHERE id=1",
    new Date(Date.now() - 1000).toISOString(),
  );
  d.start(1, 1);
  const key = await page("partidas.html?campeonato=1");
  await wait(() => key.document.querySelector("[data-result]"));
  assert.equal(key.document.querySelectorAll(".match").length, 1);
  key.document.querySelector("[data-result]").click();
  key.document.querySelector("[name=score_a]").value = "2";
  key.document.querySelector("[name=score_b]").value = "0";
  key.document
    .querySelector("#match-form")
    .dispatchEvent(
      new key.Event("submit", { bubbles: true, cancelable: true }),
    );
  await wait(
    () =>
      db.prepare("SELECT status FROM tournaments WHERE id=1").get().status ===
      "finished",
  );
  await wait(() => key.document.querySelector(".winner"));
  assert.equal(
    key.document.querySelector(".winner").textContent.trim(),
    "Time do DOM 2",
  );
  assert.deepEqual(errors, []);
});
