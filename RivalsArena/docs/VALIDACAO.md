# Validação da entrega

Execução em 11/11/2026, Node.js v20.20.2 (Linux x64). Resultados completos em `test-output.txt`. Comandos: `npm test` e `npm run check`.

## Testes automatizados

**11 testes aprovados, zero falhas.** Os testes usam bancos isolados em memória ou temporários, com servidor Express real e requisições HTTP; não dependem de contas do banco da aplicação.

| Grupo                | Evidência verificada                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação         | Cadastro, dados inválidos, duplicidade, hash de senha, login, logout, proteção de mutações, edição e exclusão de conta                                                            |
| Autorização          | Outro usuário não altera time, jogo, campeonato, placar, post ou comentário de terceiros                                                                                          |
| Times e jogos        | CRUD, entrada voluntária, remoção, duplicidade e bloqueio do elenco por inscrição                                                                                                 |
| Inscrições           | Lotação, tamanho de elenco, jogador repetido, capitão, jogo, horário, troca e cancelamento                                                                                        |
| Competição           | Torneio de três times com bye, resultado definitivo, final, histórico e ranking                                                                                                   |
| Reinício da chave    | Torneio de cinco times; desfaz chave sem resultados e reabre inscrições                                                                                                           |
| Todas as capacidades | Torneios de 2 até 64 times, final sempre alcançada, exatamente n−1 partidas reais e pontuação consistente                                                                         |
| Comunidade           | CRUD de post/comentário, texto escapado e curtida idempotente                                                                                                                     |
| Persistência         | Fechar/reabrir SQLite conserva registros; migrations idempotentes e integridade de FKs                                                                                            |
| Datas e documentação | Rejeição de calendário inválido e data sem fuso; referências OpenAPI resolvidas e cada operação implementada documentada                                                          |
| Front integrado      | Scripts reais em DOM com servidor HTTP real: catálogo, totais, criação de time/campeonato, inscrição pelo formulário, perfil, posts, curtida, comentário e resultado de uma final |
| Sintaxe              | Todos os arquivos JavaScript de fonte, front, scripts e testes verificados com `node --check`                                                                                     |

O teste de front usa jsdom e uma sessão de teste. Ele executa os scripts e submete os formulários contra a API real; isso verifica a integração, mas não representa inspeção visual, motor CSS de um navegador ou comparação de screenshots.

## Compatibilidade da versão 1.1.0

O projeto foi instalado e executado com o binário real **Node.js v20.20.2**, a mesma versão indicada no erro relatado. A instalação foi refeita com `npm ci`, usando o novo lockfile. O acesso ao banco utiliza `better-sqlite3` 12.4.1, e jsdom 26.1.0 substitui a dependência de teste que exigia uma versão mais recente do Node.

O teste de compatibilidade verifica que iniciar sem `.env` funciona sem aviso e que um arquivo existente é carregado, respeitando valores já definidos no ambiente. O executor dos testes resolve a lista de arquivos em JavaScript, sem depender da expansão de `*.test.js` pelo terminal do Windows.

Também foram conferidos os comandos reais `npm start`, `npm run demo` e `npm run db:migrate`, usando bancos temporários: API saudável, páginas e Swagger acessíveis, catálogo inicial criado e demonstração com quatro usuários. O SQLite permanece compatível com o banco da entrega anterior, sem conversão de schema.

A execução foi validada em Linux x64. O arquivo de inicialização do Windows foi adaptado, mas não foi executado em uma máquina Windows neste ambiente.

## Limites da revisão

A abertura em navegador foi tentada, mas o ambiente não permitiu executar o Chromium local e o navegador remoto não alcançou o servidor local. Por isso **não foi concluída a revisão visual interativa em Chrome/Edge nem a inspeção por screenshots em desktop/tablet/mobile**. As regras responsivas estão implementadas e os documentos/scripts carregam nos testes de DOM, mas uma conferência visual local ainda é recomendada.

Dockerfile/Compose foram preparados, mas não executados. Não houve publicação em servidor externo, teste de carga, pentest, auditoria de acessibilidade ou avaliação em dispositivos físicos. Nenhum resultado desses foi considerado aprovado por suposição.

## Conferência local de apresentação

1. Rode `npm ci`, `npm test` e `npm start`.
2. Confira `http://localhost:3000`, cadastro e login.
3. Use as ferramentas do navegador para conferir larguras 390, 768 e 1366 px. Verifique menu, formulários, tabelas e chave.
4. Teste com duas contas, cada uma com seu time; crie um campeonato para daqui a um minuto, inscreva os times, aguarde e gere a chave.
5. Registre o resultado, consulte perfil/ranking e reinicie o servidor para confirmar persistência.
6. Acesse `/docs`, confira exemplos de campos e use “Try it out” para consultar a API. O Swagger envia o cabeçalho de proteção automaticamente.
