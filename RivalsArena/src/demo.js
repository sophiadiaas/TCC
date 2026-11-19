// A demonstração só cria contas quando o banco ainda não contém usuários.
process.env.SEED_DEMO = "1";
require("./server");
