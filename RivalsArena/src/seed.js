const { openDatabase } = require("./db");
const { hashPassword } = require("./security");
async function seed(db) {
  if (!(await db.query("SELECT id FROM games LIMIT 1")).rows.length)
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
      await db.query(
        "INSERT INTO games(name,genre,description,platforms) VALUES(?,?,?,?)",
        g,
      );
  if (
    process.env.SEED_DEMO === "1" &&
    !(await db.query("SELECT id FROM users LIMIT 1")).rows.length
  ) {
    const hash = await hashPassword("ArenaDemo2026!");
    for (const [i, n] of ["Organizador", "Luna", "Pedro", "Iara"].entries()) {
      const { rows } = await db.query(
        "INSERT INTO users(username,email,password_hash,name,bio) VALUES(?,?,?,?,?) RETURNING id",
        [
          "demo" + (i + 1),
          "demo" + (i + 1) + "@arena.local",
          hash,
          n,
          "Conta de demonstração",
        ],
      );
      const id = Number(rows[0].id);
      const team = await db.query(
        "INSERT INTO teams(name,game_id,captain_id) VALUES(?,1,?) RETURNING id",
        ["Equipe " + n, id],
      );
      const tid = Number(team.rows[0].id);
      await db.query("INSERT INTO team_members VALUES(?,?)", [tid, id]);
    }
    const tournament = await db.query(
      "INSERT INTO tournaments(name,game_id,owner_id,capacity,team_size,starts_at) VALUES('Copa de demonstração',1,1,4,1,?) RETURNING id",
      [new Date(Date.now() + 86400000).toISOString()],
    );
    const t = Number(tournament.rows[0].id);
    for (let i = 1; i <= 4; i++) {
      const registration = await db.query(
        "INSERT INTO registrations(tournament_id,team_id) VALUES(?,?) RETURNING id",
        [t, i],
      );
      await db.query("INSERT INTO registration_players VALUES(?,?)", [
        registration.rows[0].id,
        i,
      ]);
    }
    await db.query("INSERT INTO posts(user_id,text) VALUES(1,?)", [
      "Bem-vindos à Arena! Inscrevam seus times e organizem sua primeira competição.",
    ]);
  }
}
if (require.main === module) {
  const db = openDatabase();
  seed(db)
    .then(() => db.close())
    .then(() => {
      console.log("Banco inicializado.");
    })
    .catch(async (error) => {
      console.error(error);
      await db.close();
      process.exitCode = 1;
    });
}
module.exports = { seed };
