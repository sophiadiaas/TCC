// A demonstração só cria contas quando o banco ainda não contém usuários.
if (process.env.NODE_ENV === "production")
  throw new Error("A demonstração não pode ser executada em produção.");
process.env.SEED_DEMO = "1";
require("./server");
