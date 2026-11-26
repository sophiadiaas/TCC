# Conferência com o briefing EP 190

O briefing deixa a equipe definir entidades e regras específicas. Esta tabela relaciona os requisitos à implementação escolhida. A entrega web corresponde à seção “Resultado/entregas esperados”; aplicativo nativo não integra a entrega especificada nessa seção.

| Requisito                              | Implementação e evidência                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Front-end a partir do material enviado | `public/`, logotipo, HTML e CSS originais aproveitados; scripts substituídos por chamadas HTTP                                 |
| Interface web funcional                | Início, cadastro, login, jogos, times, campeonatos, chave, ranking, comunidade e perfil                                        |
| Layout desktop/tablet/mobile           | `public/css/responsividade.css` e regras complementares em `style.css`; revisão visual interativa não concluída neste ambiente |
| Autenticação                           | `/api/auth/register`, `/login`, `/me`, `/logout`; cookie HttpOnly e sessões persistidas                                        |
| Interação entre jogadores              | Times, publicações, comentários e curtidas reais                                                                               |
| Participação competitiva               | Inscrições verificadas, cancelamento, troca de time e chaveamento                                                              |
| Perfil, estatísticas e histórico       | `/api/perfil` com dados calculados de partidas reais                                                                           |
| Matchmaking ou inscrição               | Inscrição implementada; matchmaking não escolhido                                                                              |
| Acompanhar/assistir partidas           | Chave pública, placar, agendamento e link HTTPS externo de transmissão                                                         |
| Back-end Node.js                       | Node.js 20.20.2 com Express 5 em `src/app.js`, serviço de domínio em `src/domain.js`                                           |
| CRUD das entidades                     | Usuários, jogos, times, campeonatos, inscrições, partidas (ciclo da chave), posts e comentários; vínculos por inclusão/remoção |
| API REST padronizada                   | `/api/`, métodos HTTP, códigos de status e erros JSON; testes HTTP de integração                                               |
| Swagger ou equivalente                 | Swagger UI em `/docs`, OpenAPI 3.0.3 em `docs/openapi.json`, 29 caminhos documentados                                          |
| Regras de limite, datas e pontuação    | `src/domain.js`, validações das rotas e `docs/REGRAS.md`                                                                       |
| Banco integrado                        | PostgreSQL/Supabase via `pg`, FK ativas, consultas parametrizadas e transações                                                 |
| Modelagem conceitual                   | Entidades e cardinalidades em `docs/MODELAGEM.md`                                                                              |
| Modelagem lógica                       | Tabelas, atributos, PK, FK e unicidade em `docs/MODELAGEM.md`                                                                  |
| Modelagem física                       | `db/migrations/001_initial.sql` e `002_catalog_and_audit.sql`                                                                  |
| Normalização e integridade             | Relações N:N em tabelas associativas; elenco histórico separado; pontuação derivada; transações                                |
| JOINs e automação                      | JOINs para ranking/perfil, FKs com cascata, propagação de chave no domínio; procedures não são exigidas                        |
| Integração HTTP front/back             | `public/js/main.js`, fetch com cookies e tratamento de erro                                                                    |
| Organização em Git                     | `.gitignore`, commit e tag locais; README com envio ao remoto do aluno                                                         |
| README e manutenção                    | Instalação, demonstração, estrutura, configurações, comandos, documentação e limites                                           |
| Qualidade, eficiência e segurança      | Hash scrypt, autorização por dono, transações, índices, testes negativos e de ciclo completo                                   |

O backend persiste os dados no PostgreSQL do Supabase. Os testes automatizados usam SQLite temporário e não se conectam ao projeto Supabase configurado no `.env`.
