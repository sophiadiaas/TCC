const fs = require("node:fs");
const obj = (properties) => ({
  type: "object",
  properties,
  additionalProperties: false,
});
const str = (description, extra = {}) => ({
  type: "string",
  description,
  ...extra,
});
const int = (description, minimum = 1, maximum = 2147483647) => ({
  type: "integer",
  description,
  minimum,
  maximum,
});
const schemas = {
  Register: obj({
    usuario: str("Letras, números e _, sem espaços.", {
      minLength: 3,
      maxLength: 20,
    }),
    email: str("E-mail exclusivo.", { format: "email" }),
    senha: str("Senha de 8 a 128 caracteres.", {
      minLength: 8,
      maxLength: 128,
    }),
  }),
  Login: obj({
    login: str("Usuário ou e-mail."),
    senha: str("Senha."),
    lembrar: { type: "boolean", default: false },
  }),
  UserUpdate: obj({
    nome: str("Nome público.", { maxLength: 80 }),
    bio: str("Biografia.", { maxLength: 500 }),
    regiao: str("Região."),
    senha_atual: str("Obrigatória ao trocar senha."),
    senha: str("Nova senha.", { minLength: 8, maxLength: 128 }),
  }),
  Game: obj({
    nome: str("Nome do jogo.", { minLength: 3, maxLength: 60 }),
    genero: str("Gênero.", { minLength: 2, maxLength: 60 }),
    resumo: str("Descrição.", { minLength: 5, maxLength: 2000 }),
    plataformas: str("Plataformas.", { minLength: 2, maxLength: 100 }),
  }),
  Team: obj({
    nome: str("Nome exclusivo.", { minLength: 3, maxLength: 60 }),
    game_id: int("Jogo do time. Somente na criação."),
    description: str("Descrição.", { maxLength: 500 }),
  }),
  Tournament: obj({
    nome: str("Nome.", { minLength: 3, maxLength: 100 }),
    game_id: int("Jogo."),
    capacity: int("Máximo de times.", 2, 64),
    team_size: int("Quantidade exata de jogadores por time.", 1, 8),
    starts_at: str("Início futuro, ISO 8601 com fuso.", {
      format: "date-time",
    }),
  }),
  Registration: obj({
    tournament_id: int("Campeonato."),
    team_id: int("Time do capitão autenticado."),
  }),
  RegistrationUpdate: obj({
    team_id: int("Novo time, capitão e elenco válidos."),
  }),
  MatchCreate: obj({
    tournament_id: int("Gera a chave inteira atomicamente, após o início."),
  }),
  MatchUpdate: obj({
    scheduled_at: {
      ...str("ISO 8601, futuro e após início; null remove o agendamento."),
      nullable: true,
    },
    stream_url: str("URL HTTPS externa; vazio remove.", { maxLength: 500 }),
  }),
  MatchReset: obj({
    starts_at: str(
      "Nova data futura ISO 8601; remove TODA a chave sem resultados e reabre inscrições.",
      { format: "date-time" },
    ),
  }),
  Result: obj({
    score_a: int("Placar A.", 0, 999),
    score_b: int("Placar B; diferente de A.", 0, 999),
  }),
  Post: obj({
    texto: str("Conteúdo de texto simples.", { minLength: 1, maxLength: 2000 }),
  }),
  Comment: obj({
    texto: str("Conteúdo de texto simples.", { minLength: 1, maxLength: 1000 }),
  }),
  Error: obj({ error: str("Descrição do erro.") }),
};
for (const [name, required] of Object.entries({
  Register: ["usuario", "email", "senha"],
  Login: ["login", "senha"],
  Game: ["nome", "genero", "resumo", "plataformas"],
  Team: ["nome", "game_id"],
  Tournament: ["nome", "game_id", "capacity", "team_size", "starts_at"],
  Registration: ["tournament_id", "team_id"],
  RegistrationUpdate: ["team_id"],
  MatchCreate: ["tournament_id"],
  MatchReset: ["starts_at"],
  Result: ["score_a", "score_b"],
  Post: ["texto"],
  Comment: ["texto"],
}))
  schemas[name].required = required;

for (const name of ["Game", "Team", "Tournament"]) {
  schemas[name + "Update"] = { ...schemas[name] };
  delete schemas[name + "Update"].required;
}
const responseObject = (properties) => ({
  type: "object",
  properties,
  additionalProperties: true,
});
schemas.UserPublic = responseObject({
  id: int("ID."),
  usuario: str("Usuário."),
  nome: str("Nome público."),
  bio: str("Biografia."),
  regiao: str("Região."),
  desde: str("Data de criação UTC."),
});
schemas.GameView = responseObject({
  id: int("ID."),
  nome: str("Nome."),
  genero: str("Gênero."),
  resumo: str("Descrição."),
  descricao: { type: "array", items: { type: "string" } },
  plataformas: str("Plataformas."),
  owner_id: { type: "integer", nullable: true },
});
schemas.TeamView = responseObject({
  id: int("ID."),
  nome: str("Nome."),
  game_id: int("Jogo."),
  captain_id: int("Capitão."),
  description: str("Descrição."),
  membros: {
    type: "array",
    items: { $ref: "#/components/schemas/UserPublic" },
  },
  locked: { type: "boolean" },
});
schemas.TournamentView = responseObject({
  id: int("ID."),
  nome: str("Nome."),
  game_id: int("Jogo."),
  owner_id: int("Organizador."),
  capacity: int("Limite de times.", 2, 64),
  team_size: int("Elenco.", 1, 8),
  starts_at: str("Início UTC.", { format: "date-time" }),
  status_code: { type: "string", enum: ["open", "running", "finished"] },
  status: str("Rótulo em português."),
  inscritos: int("Times inscritos.", 0),
  inscricoes: {
    type: "array",
    items: { $ref: "#/components/schemas.RegistrationView" },
  },
  partidas: {
    type: "array",
    items: { $ref: "#/components/schemas/MatchView" },
  },
});
schemas.TournamentView.properties.inscricoes.items.$ref =
  "#/components/schemas/RegistrationView";
schemas.RegistrationView = responseObject({
  id: int("ID."),
  tournament_id: int("Campeonato."),
  team_id: int("Time."),
  created_at: str("Criação UTC."),
});
schemas.MatchView = responseObject({
  id: int("ID."),
  tournament_id: int("Campeonato."),
  round: int("Rodada."),
  position: int("Posição."),
  team_a: { type: "integer", nullable: true },
  team_b: { type: "integer", nullable: true },
  score_a: { type: "integer", nullable: true },
  score_b: { type: "integer", nullable: true },
  winner_id: { type: "integer", nullable: true },
  status: { type: "string", enum: ["waiting", "ready", "done", "bye"] },
  scheduled_at: { type: "string", nullable: true },
  completed_at: { type: "string", nullable: true },
  stream_url: str("URL externa HTTPS ou vazio."),
  nome_a: { type: "string", nullable: true },
  nome_b: { type: "string", nullable: true },
});
schemas.PostView = responseObject({
  id: int("ID."),
  user_id: int("Autor."),
  autor: str("Nome do autor."),
  texto: str("Texto."),
  data: str("Criação UTC."),
  curtidas: int("Total de curtidas.", 0),
  comentarios: int("Total de comentários.", 0),
  curtido: { type: "boolean" },
});
schemas.CommentView = responseObject({
  id: int("ID."),
  post_id: int("Publicação."),
  user_id: int("Autor."),
  text: str("Conteúdo."),
  autor: str("Nome do autor."),
  created_at: str("Criação UTC."),
});
schemas.RankView = responseObject({
  id: int("Jogador."),
  nome: str("Nome."),
  jogo: str("Jogo."),
  game_id: int("Jogo."),
  regiao: str("Região."),
  vitorias: int("Vitórias.", 0),
  derrotas: int("Derrotas.", 0),
  partidas: int("Partidas reais.", 0),
  pontos: int("Pontuação.", 0),
  pos: int(
    "Posição no resultado global. A UI calcula posição dentro do jogo/região.",
  ),
});
schemas.ProfileView = responseObject({
  ...schemas.UserPublic.properties,
  email: str("E-mail privado."),
  stats: responseObject({
    vitorias: int("Vitórias.", 0),
    derrotas: int("Derrotas.", 0),
    partidas: int("Partidas.", 0),
    pontos: int("Pontos.", 0),
    ranking: int("Posição geral ou zero.", 0),
  }),
  historico: {
    type: "array",
    items: { $ref: "#/components/schemas/MatchView" },
  },
  campeonatos: {
    type: "array",
    items: { $ref: "#/components/schemas/TournamentView" },
  },
});
function outputSchema(p, method) {
  if (p === "/auth/me")
    return {
      allOf: [{ $ref: "#/components/schemas/UserPublic" }],
      nullable: true,
    };
  if (p.startsWith("/auth/"))
    return { $ref: "#/components/schemas/UserPublic" };
  if (p === "/health")
    return responseObject({
      status: { type: "string", enum: ["ok"] },
      database: { type: "boolean" },
    });
  if (p === "/stats")
    return responseObject(
      Object.fromEntries(
        ["usuarios", "campeonatos", "partidas", "jogos"].map((k) => [
          k,
          int(k, 0),
        ]),
      ),
    );
  let name = p.startsWith("/usuarios")
    ? "UserPublic"
    : p.startsWith("/jogos")
      ? "GameView"
      : p.startsWith("/times")
        ? "TeamView"
        : p.includes("comentarios")
          ? "CommentView"
          : p.startsWith("/campeonatos")
            ? "TournamentView"
            : p.startsWith("/inscricoes")
              ? "RegistrationView"
              : p.startsWith("/partidas")
                ? "MatchView"
                : p.startsWith("/posts")
                  ? "PostView"
                  : p === "/perfil"
                    ? "ProfileView"
                    : "RankView";
  const array =
    (method === "get" &&
      [
        "/usuarios",
        "/jogos",
        "/times",
        "/campeonatos",
        "/inscricoes",
        "/partidas",
        "/posts",
        "/jogadores",
      ].includes(p)) ||
    (method === "get" && p.endsWith("/comentarios")) ||
    p.endsWith("/iniciar") ||
    (method === "post" && p === "/partidas");
  if (p.endsWith("/iniciar")) name = "MatchView";
  return array
    ? { type: "array", items: { $ref: "#/components/schemas/" + name } }
    : { $ref: "#/components/schemas/" + name };
}

const paths = {};
function endpoint(
  method,
  p,
  summary,
  tag,
  { body, auth = false, status = 200, description = "", query = [] } = {},
) {
  const parameters = [...p.matchAll(/\{(\w+)\}/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "integer", minimum: 1 },
  }));
  for (const name of query)
    parameters.push({ name, in: "query", schema: { type: "integer" } });
  const op = {
    summary,
    tags: [tag],
    description,
    parameters,
    security: auth ? [{ cookieAuth: [] }] : [],
    responses: {
      [status]: {
        description:
          status === 204
            ? "Operação concluída, sem conteúdo."
            : "Operação concluída.",
        ...(status === 204
          ? {}
          : {
              content: {
                "application/json": { schema: outputSchema(p, method) },
              },
            }),
      },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 429].map((n) => [
          n,
          {
            description: {
              400: "Entrada inválida",
              401: "Sessão ausente",
              403: "Sem permissão ou proteção CSRF ausente",
              404: "Registro não encontrado",
              409: "Conflito com regra de negócio",
              429: "Limite de requisições",
            }[n],
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        ]),
      ),
    },
  };
  if (body)
    op.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/" + body },
        },
      },
    };
  (paths[p] ??= {})[method] = op;
}
endpoint("post", "/auth/register", "Criar usuário e sessão", "Autenticação", {
  body: "Register",
  status: 201,
});
endpoint(
  "post",
  "/auth/login",
  "Entrar e receber cookie HttpOnly",
  "Autenticação",
  { body: "Login" },
);
endpoint("post", "/auth/logout", "Encerrar sessão atual", "Autenticação", {
  status: 204,
});
endpoint("get", "/auth/me", "Usuário autenticado ou null", "Autenticação");
for (const [path, tag] of [
  ["health", "Saúde"],
  ["stats", "Saúde"],
  ["perfil", "Jogadores"],
  ["jogadores", "Jogadores"],
])
  endpoint(
    "get",
    "/" + path,
    {
      health: "Verificar API e banco",
      stats: "Totais reais da plataforma",
      perfil: "Perfil privado com estatísticas e histórico",
      jogadores: "Ranking calculado: 2 pontos por vitória, 0 por derrota",
    }[path],
    tag,
    { auth: path === "perfil", query: path === "jogadores" ? ["game_id"] : [] },
  );
for (const [p, tag, body] of [
  ["usuarios", "Jogadores", "UserUpdate"],
  ["jogos", "Catálogo", "Game"],
  ["times", "Times", "Team"],
  ["campeonatos", "Campeonatos", "Tournament"],
  ["inscricoes", "Inscrições", "Registration"],
  ["partidas", "Partidas", "MatchCreate"],
  ["posts", "Comunidade", "Post"],
]) {
  endpoint("get", "/" + p, "Listar " + p, tag, {
    auth: p === "inscricoes",
    query: p === "partidas" ? ["tournament_id"] : [],
  });
  endpoint("get", "/" + p + "/{id}", "Consultar " + p + " por ID", tag, {
    auth: p === "inscricoes",
  });
  if (p !== "usuarios")
    endpoint("post", "/" + p, "Criar " + p, tag, {
      auth: true,
      body,
      status: 201,
      description:
        p === "partidas"
          ? "Cria a chave inteira; mesma regra de POST /campeonatos/{id}/iniciar. Partidas não são criadas isoladamente."
          : "",
    });
  endpoint("put", "/" + p + "/{id}", "Atualizar " + p, tag, {
    auth: true,
    body:
      p === "inscricoes"
        ? "RegistrationUpdate"
        : p === "partidas"
          ? "MatchUpdate"
          : ["jogos", "times", "campeonatos"].includes(p)
            ? body + "Update"
            : body,
    description:
      "Apenas autor, proprietário ou capitão conforme entidade. PUT aceita atualização parcial.",
  });
  endpoint("delete", "/" + p + "/{id}", "Excluir " + p, tag, {
    auth: true,
    status: 204,
    body: p === "partidas" ? "MatchReset" : undefined,
    description:
      p === "partidas"
        ? "ATENÇÃO: desfaz toda a chave do campeonato da partida, apenas antes do primeiro resultado real; exige novo início futuro. Não permite remover uma partida isolada, pois isso quebraria a árvore."
        : "Vínculos competitivos podem impedir exclusão com 409.",
  });
}
endpoint(
  "post",
  "/times/{id}/membros",
  "Entrar no time com a própria conta",
  "Times",
  { auth: true, status: 201 },
);
endpoint(
  "delete",
  "/times/{id}/membros/{userId}",
  "Sair ou remover membro (capitão)",
  "Times",
  { auth: true, status: 204 },
);
endpoint(
  "post",
  "/campeonatos/{id}/iniciar",
  "Encerrar inscrições e gerar chave",
  "Campeonatos",
  {
    auth: true,
    description:
      "Organizador, horário atingido, 2 ou mais times; byes não dão pontos.",
  },
);
endpoint(
  "post",
  "/partidas/{id}/resultado",
  "Confirmar resultado e avançar vencedor",
  "Partidas",
  {
    auth: true,
    body: "Result",
    description:
      "Organizador. Resultado definitivo e sem empate. Pontuação é derivada da consulta, sem saldo editável.",
  },
);
endpoint(
  "post",
  "/posts/{id}/curtidas",
  "Curtir de forma idempotente",
  "Comunidade",
  { auth: true },
);
endpoint("delete", "/posts/{id}/curtidas", "Remover curtida", "Comunidade", {
  auth: true,
});
endpoint("get", "/posts/{id}/comentarios", "Listar comentários", "Comunidade");
endpoint(
  "post",
  "/posts/{id}/comentarios",
  "Comentar publicação",
  "Comunidade",
  { auth: true, body: "Comment", status: 201 },
);
endpoint("get", "/comentarios/{id}", "Consultar comentário", "Comunidade");
endpoint(
  "put",
  "/comentarios/{id}",
  "Editar comentário próprio",
  "Comunidade",
  { auth: true, body: "Comment" },
);
endpoint(
  "delete",
  "/comentarios/{id}",
  "Excluir comentário próprio",
  "Comunidade",
  { auth: true, status: 204 },
);
const spec = {
  openapi: "3.0.3",
  info: {
    title: "Rivals Arena API",
    version: "1.1.0",
    description:
      "API Node.js/Express com SQLite. Faça login aqui ou no site: o navegador envia o cookie automaticamente. Todas as mutações exigem X-Requested-With: RivalsArena (preenchido automaticamente neste Swagger). Campos desconhecidos são ignorados; não concedem permissões. IDs são numéricos. Datas são UTC ISO 8601; interface usa horário local. Não há administrador universal. Jogos iniciais são catálogo protegido, jogos criados por usuários são editáveis pelo autor.",
  },
  servers: [{ url: "/api" }],
  paths,
  components: {
    schemas,
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "arena_session" },
    },
  },
};
fs.writeFileSync("docs/openapi.json", JSON.stringify(spec, null, 2) + "\n");
console.log(Object.keys(paths).length + " caminhos documentados.");
