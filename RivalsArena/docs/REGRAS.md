# Regras de negócio e autorização

## Usuários e sessão

Usuário tem 3–20 caracteres ASCII alfanuméricos ou `_`; usuário e e-mail são únicos sem distinção de maiúsculas. Senha tem 8–128 caracteres. Nome público e região são editáveis pelo próprio usuário. Trocar senha exige a atual e invalida sessões antigas. Sessão comum dura até 24 horas no servidor, com cookie de sessão no navegador; “lembrar” usa 30 dias e cookie persistente. Logout revoga o token atual. Não existe papel de administrador universal.

## Jogos e times

Os três jogos do catálogo inicial são protegidos. Cada usuário pode cadastrar novos jogos e editar/excluir apenas os próprios, respeitando vínculos. Time tem um jogo, nome único e capitão que também pertence ao elenco. Elenco aceita de um a oito membros; cada usuário entra por iniciativa própria. O capitão pode remover outros membros. Capitão não pode abandonar o time sem excluí-lo. Entrada livre é uma decisão de modelagem: quem organiza pode divulgar o nome do time, conferir o elenco e remover membros antes de inscrever.

Inscrição aberta ou competição em andamento bloqueia o elenco e a edição do time. Para alterar um elenco, cancele as inscrições abertas; não é permitido alterar o time durante competição. Os jogadores de cada inscrição são copiados para `registration_players`, preservando o histórico mesmo se o elenco mudar após a final.

## Campeonatos e inscrições

Qualquer jogador autenticado organiza campeonatos próprios. Capacidade de 2–64 times, com exatamente 1–8 jogadores por time. Data ISO 8601 com hora, convertida para UTC, deve estar no futuro ao criar/editar; front apresenta horário local. Inscrições só são aceitas antes do início e em status `open`.

Somente capitão inscreve um time. Jogo e tamanho do elenco devem corresponder ao campeonato. Há unicidade de time por campeonato e um jogador não pode participar de dois times no mesmo campeonato. O organizador ou capitão pode cancelar antes da geração da chave; somente o capitão pode substituir o time. Troca valida tudo novamente em uma transação e reverte integralmente em caso de erro.

Após haver inscritos, não se pode mudar jogo ou tamanho do elenco. A capacidade pode aumentar ou diminuir até o total já inscrito. Início pode ser adiado enquanto `open`. O encerramento de inscrições por data é conferido no servidor; o organizador gera a chave explicitamente a partir do horário marcado e com pelo menos dois times.

## Partidas e chave

Eliminação simples; chaves com quantidade arbitrária de times são completadas até a próxima potência de dois. Inscritos entram pela ordem de inscrição; avanços automáticos são distribuídos na primeira rodada. Não há sorteio, cabeças de chave ou equilíbrio por habilidade. Em cada rodada só avança o vencedor, sempre na posição determinada pela árvore. O início é atômico e só pode acontecer uma vez até eventual reinício sem resultados.

Apenas o organizador agenda, define URL HTTPS e registra resultados de suas partidas. Placar inteiro de 0–999 sem empate. Partida precisa de dois classificados e não pode ter resultado anterior. Se houver horário agendado futuro, é preciso aguardar. Agendamento deve ser futuro e posterior ao início do torneio; vazio remove o horário. Link vazio remove transmissão. “Assistir” abre o serviço externo; a plataforma não cria transmissões.

Resultado e propagação até a próxima rodada são uma única transação. A final encerra o campeonato. Resultado confirmado não pode ser alterado nem apagado, evitando duplicação ou corrupção do ranking. Uma chave sem nenhuma partida real concluída pode ser desfeita integralmente; é preciso indicar novo início futuro e as inscrições são mantidas. Não é permitido apagar apenas uma partida isolada e deixar a árvore inconsistente.

## Pontuação, ranking e histórico

Cada vitória real: 2 pontos; derrota: 0. Empates não existem. Bye não gera pontos, vitórias, derrotas ou histórico de partidas jogadas. Cada jogador do elenco registrado recebe a estatística do seu time. Ranking por jogo ordena pontos decrescentes, vitórias decrescentes, derrotas crescentes e ID crescente. Filtros no front são por jogo, região e nome; o rótulo de temporada é “Histórico completo”, sem filtro fictício.

Perfil soma resultados por jogo e exibe ranking geral por total de pontos, desempate por ID. O ranking geral não é o mesmo ranking por jogo. Não há pontos manuais no perfil nem endpoint para alterar saldo. Histórico usa jogadores vinculados à inscrição, não o elenco atual do time. Cada resultado guarda `completed_at` no banco.

## Comunidade

Apenas autenticados criam publicações, comentários e curtidas. Autor edita/exclui seu conteúdo. Uma curtida por usuário/publicação, inclusão idempotente. Exclusão de post apaga comentários e curtidas dependentes via FK. Todos os textos são exibidos como texto, escapando HTML. Limites: post 2.000 caracteres, comentário 1.000, bio/descrição de time 500.

## Exclusão e erros

Usuário não pode ser removido enquanto possui jogos, times, campeonatos ou participação histórica. Times e jogos vinculados também são protegidos por FK. Campeonatos só são removidos em `open`; exclusão cascata remove inscrições que ainda não viraram partidas. Isso faz parte das regras do CRUD, não representa uma exclusão silenciosa ou pendente.

HTTP: `200` consulta/atualização; `201` criação; `204` exclusão/logout sem conteúdo; `400` entrada inválida; `401` login necessário; `403` autoria/cabeçalho/origem inválidos; `404` registro inexistente; `409` conflito de unicidade/estado/vínculo; `429` limite de requisições. Resposta de erro é `{ "error": "mensagem" }`.
