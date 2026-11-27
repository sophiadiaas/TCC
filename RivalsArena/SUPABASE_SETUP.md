# Configuração do Supabase

O Rivals Arena já possui uma API Node.js/Express. O navegador conversa somente
com essa API; o servidor Node conecta-se ao PostgreSQL do Supabase pelo driver
`pg`. Nenhuma URL de banco ou chave privada é enviada ao navegador.

## 1. Criar um projeto

1. Crie uma conta no [Supabase](https://supabase.com/) e escolha **New project**.
2. Selecione uma organização, informe um nome e defina uma senha forte para o
   banco. Guarde-a em um gerenciador de senhas; não a coloque no Git.
3. Escolha a região adequada aos usuários e aguarde a criação do projeto.
4. Em produção, configure backups e não use `npm run demo`.

## 2. Criar o esquema

No painel do projeto, abra **SQL Editor → New query**, copie o conteúdo de
`schema.sql`, execute e confirme que terminou sem erros. O script cria as
tabelas necessárias, índices, relacionamentos, timestamps, triggers e RLS.

Ele usa `CREATE ... IF NOT EXISTS` e alterações aditivas (`ADD COLUMN IF NOT
EXISTS`); não apaga tabelas nem registros existentes. Se já há dados, faça um
backup antes de aplicar qualquer mudança de esquema.

Alternativamente, depois de configurar a conexão local, execute
`npm run db:migrate`. As migrations versionadas em `db/migrations/` registram
cada etapa em `schema_migrations`. Não é necessário usar os dois métodos:
`schema.sql` é para o SQL Editor e `npm run db:migrate` é para a implantação
automatizada.

## 3. Obter a conexão do banco

No painel, abra **Project Settings → Database → Connection string**, selecione
o formato **URI** e copie a string PostgreSQL. Em hospedagens com rede IPv4 ou
restrições de conexão, use a URI do **Session pooler** ou **Transaction pooler**
indicada pelo próprio Supabase.

Use a URI somente no servidor. A senha pode conter caracteres que precisam ser
codificados para URL, por exemplo `@` como `%40`. Não use a URL HTTPS do projeto,
nem a chave `anon` ou `service_role` como `DATABASE_URL`.

## 4. Configurar variáveis localmente

Dentro de `RivalsArena/`, copie `.env.example` para `.env` e preencha
`DATABASE_URL` com a URI PostgreSQL:

```powershell
Copy-Item .env.example .env
```

Variáveis:

- `DATABASE_URL`: URI PostgreSQL do Supabase; obrigatória para iniciar a API.
- `PORT`: porta HTTP local (padrão `3000`; a hospedagem pode definir a própria).
- `NODE_ENV`: use `production` em produção para ativar o cookie `Secure`.
- `DB_POOL_MAX`: limite do pool PostgreSQL (padrão `10`).
- `SUPABASE_CA_CERT`: opcional, conteúdo PEM do certificado CA quando a
  hospedagem exigir o certificado específico do projeto. A validação TLS não
  deve ser desativada.

O `.gitignore` exclui `.env` e outros arquivos `.env.*`, mantendo somente
`.env.example` versionado. Nunca coloque senha PostgreSQL, chave `service_role`
ou certificado privado no frontend.

## 5. Executar e testar localmente

Requer Node.js 20, 22 ou 24. No terminal PowerShell:

```powershell
npm ci
npm run db:migrate
npm test
npm start
```

Abra `http://localhost:3000`. As páginas e a API devem ser servidas pelo mesmo
processo; não abra os arquivos HTML diretamente nem use um servidor estático
separado. A verificação de saúde está em `http://localhost:3000/api/health`.
Cadastre um usuário pela tela de cadastro, crie um time e um campeonato e
atualize a página: os registros vêm do banco persistente.

`npm test` usa um SQLite temporário isolado para validar regras e endpoints; não
conecta nem altera o projeto Supabase. O primeiro início insere somente o
catálogo de jogos se estiver vazio. Contas e torneios de demonstração são
opcionais e não devem ser criados em produção.

## 6. Configurar a hospedagem

Publique o repositório em um serviço que execute aplicações Node.js persistentes
(por exemplo, Render, Railway ou uma VM). Configure:

- Build command: `npm ci`
- Pre-deploy/release command: `npm run db:migrate`
- Start command: `npm start`
- Variáveis do serviço: `DATABASE_URL`, `NODE_ENV=production` e, se necessário,
  `DB_POOL_MAX`/`SUPABASE_CA_CERT`.

Cadastre a URI no painel de variáveis secretas da hospedagem, nunca em código,
logs, arquivos versionados ou variáveis públicas do frontend. Mantenha HTTPS
habilitado. Se usar pooler, copie os parâmetros exatamente como apresentados
pelo Supabase e confira se a capacidade de conexões corresponde a
`DB_POOL_MAX`.

## 7. Autenticação, RLS e permissões

O projeto preserva a autenticação de servidor existente: senhas são armazenadas
com hash scrypt e salt aleatório; sessões usam tokens aleatórios com apenas o
hash persistido no PostgreSQL e cookie `HttpOnly`/`SameSite`. Não é necessário
habilitar Supabase Auth nem instalar chaves Supabase no navegador.

As tabelas do aplicativo têm RLS habilitado sem políticas para os papéis
`anon`/`authenticated`, com privilégios desses papéis revogados. O acesso aos
dados deve passar pela API privada Node, que valida a sessão e autoriza as
operações por usuário, capitão e organizador. A conexão PostgreSQL é uma
credencial privilegiada e pode ignorar RLS como proprietária das tabelas; a
autorização da aplicação é, portanto, aplicada pela API. Guarde essa credencial
exclusivamente na hospedagem e não exponha PostgREST dessas tabelas ao
frontend. Não há função administrativa global na plataforma atual; não foi
criado papel administrativo sem funcionalidade correspondente.

## 8. Verificar a integração e diagnosticar falhas

1. `GET /api/health` deve retornar `status: "ok"` e `database: true`.
2. Cadastre uma conta e confirme que o login continua válido após recarregar e
   reiniciar o servidor.
3. Crie um time, inscreva-o em um campeonato e confirme que aparece nas páginas
   de campeonatos, partidas e perfil.
4. Registre um resultado e confirme o avanço da chave e a atualização do
   ranking.
5. Teste uma edição sem ser dono: a API deve negar a operação. O navegador não
   deve acessar o banco diretamente.
6. Se a conexão falhar, confira se `DATABASE_URL` é uma URI `postgresql://`,
   se a senha está codificada, se o host/porta e o pooler estão corretos e se a
   hospedagem permite saída de rede. Não desative a validação do certificado
   para contornar erros TLS.

Não execute migrações pela hospedagem em cada requisição. Execute-as no passo
de release/deploy antes de iniciar uma nova versão do servidor.
