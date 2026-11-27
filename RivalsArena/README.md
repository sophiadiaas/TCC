# Rivals Arena

Projeto acadêmico full stack desenvolvido a partir do front-end HTML/CSS/JavaScript fornecido e do briefing EP 190. Preserva logotipo, cores, navegação e estrutura das páginas, substituindo dados locais e operações simuladas por uma API Node.js/Express integrada ao PostgreSQL do Supabase.

Veja [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para criar o projeto, aplicar o
esquema e configurar execução local e hospedagem.

## Compatibilidade com Node.js 20

O backend usa o driver `pg` com consultas parametrizadas e transações no PostgreSQL do Supabase. O arquivo `.env` é carregado automaticamente e deve conter a string de conexão do banco. SQLite é usado somente pelos testes automatizados. As dependências e o executor dos testes são compatíveis com Node 20 e com o terminal do Windows.

Se baixou a versão anterior, extraia esta atualização em uma **pasta nova** e execute `npm ci`. Não copie a pasta `node_modules` da versão antiga. Se já criou dados, com o servidor antigo parado copie apenas a pasta `data` para a nova pasta do projeto antes de iniciar. São compatíveis também os Node.js 22 e 24; esta revisão foi validada especificamente com Node.js 20.20.2.

Não é necessário instalar PostgreSQL localmente; o projeto precisa de acesso de rede ao banco Supabase.

## Configurar e iniciar

Instale **Node.js 20 ou superior** (inclui npm). No painel do Supabase, copie a string de conexão PostgreSQL em **Project Settings → Database → Connection string**. Copie `.env.example` para `.env` e preencha `DATABASE_URL` com a URI PostgreSQL do banco, nunca a URL HTTP do projeto nem uma chave `anon`/`service_role`. `SUPABASE_DB_URL` também é aceito como nome alternativo. Mantenha esse arquivo privado.

```bash
npm ci
npm run db:migrate
npm test
npm start
```

As migrations devem ser executadas uma vez antes do primeiro início. Elas criam o esquema e são registradas para não serem reaplicadas. No Windows, depois de configurar `.env`, abra `INICIAR_WINDOWS.bat` para iniciar o servidor.

Abra **http://localhost:3000**. A documentação interativa da API fica em **http://localhost:3000/docs**. As leituras e gravações da aplicação são feitas no Supabase. Não abra os arquivos HTML diretamente nem use Live Server: o Node serve front e API no mesmo endereço.

O primeiro acesso possui três jogos de catálogo. Cadastre suas contas, crie times e organize campeonatos. Não existe senha de administrador nem usuário com permissão universal. Cada organizador controla seus eventos, cada capitão controla seu time e cada autor controla seu conteúdo.

### Demonstração preenchida

Somente em um projeto Supabase isolado para desenvolvimento, sem usuários existentes, use:

```bash
npm run demo
```

Contas: `demo1`, `demo2`, `demo3`, `demo4`. Senha de todas: `ArenaDemo2026!`. O demo inclui quatro times solo inscritos em uma copa e uma publicação. O campeonato começa 24 horas após a criação. Não execute esse comando contra produção: as contas usam senhas conhecidas.

### Configuração opcional

Os comandos npm carregam `.env` automaticamente. Para usar outra porta, altere `PORT=3001`. Use a URI do pooler do Supabase se o ambiente de hospedagem não tiver IPv6/conexão direta. Se o provedor apresentar erro de certificado, baixe o CA do projeto em **Supabase → Settings → Database → SSL Configuration** e configure o conteúdo PEM em `SUPABASE_CA_CERT` no ambiente do Render. A validação TLS continua habilitada; não desative a verificação do certificado.

Também há Dockerfile e `compose.yaml`:

```bash
docker compose up --build
```

A imagem usa Node 20 e usuário sem privilégios e lê as variáveis do arquivo `.env`. O Docker é opcional.

## Funcionalidades

- Cadastro, login por e-mail ou usuário, sessão no servidor e logout.
- Perfil com edição de nome, bio e região; troca de senha mediante senha atual; histórico e estatísticas reais; exclusão quando não há vínculos competitivos.
- Catálogo de jogos; criação e CRUD de jogos próprios. Os três jogos iniciais são referências protegidas do projeto.
- Times por jogo, capitão e elenco de até oito jogadores. Entrada voluntária e aberta, saída e remoção de membros pelo capitão.
- Criação, consulta, edição e exclusão de campeonatos próprios antes do início.
- Inscrição, troca de time e cancelamento. Conferência de capitão, jogo, quantidade de membros, data, lotação e duplicidade de jogador.
- Chave de eliminação simples, de dois a 64 times, incluindo avanço automático quando a quantidade não é potência de dois.
- Agendamento, URL de transmissão HTTPS, confirmação de resultados, avanço de vencedores e encerramento automático.
- Ranking por jogo e região, busca de jogadores, pontuação e histórico calculados de resultados persistidos.
- Publicações, curtidas por usuário e comentários; edição e exclusão pelo autor.
- Totais reais na página inicial, filtros e mensagens de erro da API.
- Layout desktop/tablet/mobile aproveitando o CSS original e acrescentando regras para as telas novas.

## Como apresentar o fluxo competitivo

1. Cadastre dois usuários em navegadores/perfis separados, ou use as contas demo.
2. Cada usuário cria um time no mesmo jogo. Para solo, o time contém apenas o capitão. Para dupla ou equipe, colegas entram em **Times → Entrar no time** antes da inscrição.
3. Um usuário cria um campeonato com início futuro, capacidade de times e tamanho exato do elenco.
4. Cada capitão abre os detalhes do campeonato e inscreve seu time.
5. Após o horário de início, o organizador abre os detalhes e clica **Iniciar e gerar chave**.
6. Na chave, o organizador registra os placares das partidas prontas. Os vencedores avançam até a final. Links externos permitem acompanhar transmissões configuradas pelo organizador.
7. Consulte ranking e perfis: cada vitória real vale dois pontos. Avanço automático não conta como partida nem dá pontos.

## Organização

| Caminho           | Conteúdo                                                            |
| ----------------- | ------------------------------------------------------------------- |
| `public/`         | Seu front adaptado e páginas de times/chaveamento/API/privacidade   |
| `src/app.js`      | Rotas REST, autorização, validações, tratamento de erros            |
| `src/domain.js`   | Inscrições, transações, chaveamento e ranking                       |
| `src/security.js` | Hash de senha e tokens de sessão                                    |
| `src/db.js`       | Pool PostgreSQL/Supabase, consultas e transações                    |
| `src/seed.js`     | Catálogo inicial e demonstração opcional                            |
| `db/migrations/`  | Estrutura SQL versionada                                            |
| `docs/`           | Modelagem, regras, rastreabilidade do briefing, OpenAPI e validação |
| `test/`           | Testes automatizados da API e do domínio                            |
| `scripts/`        | Verificação de sintaxe e geração do OpenAPI                         |

## Comandos

| Comando                         | Resultado                                           |
| ------------------------------- | --------------------------------------------------- |
| `npm start`                     | Inicia front e API na mesma aplicação               |
| `npm run dev`                   | Reinicia o servidor ao editar arquivos              |
| `npm run demo`                  | Habilita seed de demonstração em banco sem usuários |
| `npm run db:migrate`            | Aplica migrations pendentes no Supabase             |
| `npm test`                      | Executa testes de integração e regras               |
| `npm run check`                 | Confere a sintaxe de todos os JavaScripts           |
| `node scripts/build-openapi.js` | Regera `docs/openapi.json`                          |

A suíte usa bancos SQLite temporários e não conecta nem altera o Supabase. As migrations do servidor são registradas na tabela `schema_migrations`.

## Decisões de escopo e operação

A entrega funcional especificada pelo briefing é a plataforma **acessível por navegador**. A interface é responsiva; não há APK/IPA nativo. O fluxo de participação usa **inscrição de times**, uma das alternativas permitidas pelo briefing, em vez de matchmaking automático. O modelo de competição escolhido é eliminação simples, sem empates. Vídeo é acompanhado por link externo HTTPS; este projeto não hospeda vídeo nem implementa os jogos do catálogo.

Partidas pertencem à árvore do torneio: são criadas em conjunto no início. A exclusão antes de qualquer resultado desfaz a chave inteira, exige novo horário futuro e reabre inscrições; após resultados, não pode apagar histórico. Essas operações estão na UI e documentadas no Swagger. Jogos, usuários, times, campeonatos, inscrições, partidas, publicações e comentários têm operações de criação/consulta/atualização/exclusão dentro das restrições descritas. Curtidas e membros usam inclusão/remoção por chave composta.

Não há envio de e-mail ou recuperação de senha por e-mail configurados, pois isso não é uma entrega exigida pelo briefing. A antiga mensagem de recuperação simulada foi removida. A troca de senha autenticada funciona no perfil. Resultados são definitivos; não há recurso de disputa ou correção de placar após confirmação.

As exclusões de times, jogos, usuários e campeonatos respeitam vínculos e histórico. O sistema retorna `409` em vez de apagar registros competitivos ligados a outras entidades. O catálogo inicial é alterável por migration, não por qualquer jogador.

Antes de uso público real, configure HTTPS, contato de suporte, política de retenção, recuperação de conta e operação/backups. `NODE_ENV=production` exige HTTPS para enviar o cookie `Secure`. Caso use proxy reverso, configure o Express para confiar apenas no proxy conhecido e adaptar a verificação de origem; a configuração de entrega é para execução local direta. Esta entrega não foi publicada em hospedagem nem enviada a GitHub.

## Segurança

Senhas usam scrypt assíncrono com salt aleatório; nenhuma senha é enviada na listagem de usuários. Tokens aleatórios têm somente seu hash guardado no banco. Cookie de sessão HttpOnly/SameSite=Strict, expiração no servidor, proteção de mutações com cabeçalho customizado/origem, limite de requisições, consultas SQL parametrizadas, chaves estrangeiras, transações nas operações competitivas e escape de texto no front. Sessões persistem no banco, inclusive após reinício; trocar a senha invalida as anteriores.

## Git e entrega

O pacote inclui repositório Git local, commit e tags `v1.0.0` e `v1.1.0`. Use `git log` para consultar. Para enviar à sua conta, crie um repositório vazio e configure o endereço real:

```bash
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
git push --tags
```

Não envie `node_modules`, `.env` ou o banco de usuários. A publicação em conta externa fica por sua conta, porque nenhum destino Git foi informado.

Veja `docs/RASTREABILIDADE.md` para conferir cada entrega do briefing, `docs/MODELAGEM.md` para os três níveis do banco, `docs/REGRAS.md` para as regras e `docs/VALIDACAO.md` para a evidência e os limites dos testes realizados.

# TCC
