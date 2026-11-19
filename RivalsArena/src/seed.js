const { openDatabase } = require("./db");
const { hashPassword } = require("./security");
async function seed(db) {
  if (!db.prepare("SELECT id FROM games LIMIT 1").get())
    for (const g of [
      [
        "Capivarada",
        "Brigador de Arena",
        "Expulse seus rivais da arena. A última capivara em pé vence!",
        "PC, Mobile",
      ],
      [
        "Fire Go",
        "Ação Estratégica",
        "Dispute partidas de ação e estratégia em equipe.",
        "PC, Mobile",
      ],
      [
        "Rivals Duel",
        "Duelo de Combate",
        "Prove suas habilidades em duelos competitivos.",
        "PC",
      ],
    ])
      db.prepare(
        "INSERT INTO games(name,genre,description,platforms) VALUES(?,?,?,?)",
      ).run(...g);
  if (
    process.env.SEED_DEMO === "1" &&
    !db.prepare("SELECT id FROM users LIMIT 1").get()
  ) {
    const hash = await hashPassword("ArenaDemo2026!");
    for (const [i, n] of ["Organizador", "Luna", "Pedro", "Iara"].entries()) {
      const id = Number(
        db
          .prepare(
            "INSERT INTO users(username,email,password_hash,name,bio) VALUES(?,?,?,?,?)",
          )
          .run(
            "demo" + (i + 1),
            "demo" + (i + 1) + "@arena.local",
            hash,
            n,
            "Conta de demonstração",
          ).lastInsertRowid,
      );
      const tid = Number(
        db
          .prepare("INSERT INTO teams(name,game_id,captain_id) VALUES(?,1,?)")
          .run("Equipe " + n, id).lastInsertRowid,
      );
      db.prepare("INSERT INTO team_members VALUES(?,?)").run(tid, id);
    }
    const t = Number(
      db
        .prepare(
          "INSERT INTO tournaments(name,game_id,owner_id,capacity,team_size,starts_at) VALUES('Copa de demonstração',1,1,4,1,?)",
        )
        .run(new Date(Date.now() + 86400000).toISOString()).lastInsertRowid,
    );
    for (let i = 1; i <= 4; i++) {
      const r = Number(
        db
          .prepare(
            "INSERT INTO registrations(tournament_id,team_id) VALUES(?,?)",
          )
          .run(t, i).lastInsertRowid,
      );
      db.prepare("INSERT INTO registration_players VALUES(?,?)").run(r, i);
    }
    db.prepare("INSERT INTO posts(user_id,text) VALUES(1,?)").run(
      "Bem-vindos à Arena! Inscrevam seus times e organizem sua primeira competição.",
    );
  }
}
if (require.main === module) {
  const db = openDatabase();
  seed(db).then(() => {
    db.close();
    console.log("Banco inicializado.");
  });
}
module.exports = { seed };
