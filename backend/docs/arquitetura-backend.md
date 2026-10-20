# Arquitetura inicial do backend

## Responsabilidades

- `routes/api.php` declara os endpoints e aplica `auth:sanctum` às rotas privadas.
- `app/Http/Controllers/Api` coordena as operações HTTP.
- `app/Http/Requests/Api` valida os payloads recebidos.
- `app/Http/Resources` controla os campos e envelopes retornados.
- `app/Policies` concentra a autorização por papel e propriedade.
- `app/Services/AssessmentService` grava o rascunho e sincroniza suas questões em uma transação.
- `app/Models` e migrations representam os dados persistidos.

## Modelos implementados

- `User`: mantém o esquema existente e recebe o papel `teacher` ou `student`; usuários já existentes recebem `student` pela migration.
- `Classroom`: pertence ao professor responsável e tem matrículas.
- `ClassroomEnrollment`: vincula um aluno a uma turma. `active` e `removed` preservam a relação sem permitir duplicação do par turma/aluno.
- `Assessment`: pertence ao professor, começa como `draft` e pode ser arquivada.
- `Question`: persistência mínima inline para os tipos `single`, `boolean` e `open` que o editor atual envia. Não há ainda ciclo de publicação, respostas ou correção.

IDs retornados pelos Resources são strings para combinar com os tipos TypeScript. `teacher_id`, papel, estado e identificadores persistidos são atribuídos pelo servidor, nunca aceitos dos payloads de criação/edição.

As FKs para usuários e turmas usam `RESTRICT` para evitar apagar registros com dados dependentes. Questões são removidas junto com a atividade (`CASCADE`). O arquivamento é uma mudança de estado, não uma exclusão.

## Autenticação, sessão e autorização

O fluxo usa o guard de sessão `web` e Sanctum stateful para requests SPA confiáveis. `bootstrap/app.php` habilita `statefulApi()`. O login é limitado a cinco tentativas por minuto por e-mail/IP. Não há emissão de personal access tokens nem cadastro público.

O browser precisa obter o cookie CSRF de `GET /sanctum/csrf-cookie` antes das operações mutáveis. O gateway do frontend já suporta esse fluxo se `VITE_LOUSA_API_CSRF_PATH=/sanctum/csrf-cookie` estiver configurado. As chamadas devem enviar credenciais (`credentials: include`).

`config/cors.php` aceita credenciais, mas somente origens listadas em `FRONTEND_ORIGINS`; a lista de hosts stateful é configurada em `SANCTUM_STATEFUL_DOMAINS`. Os valores de desenvolvimento em `.env.example` são exemplos para Vite local. Em produção, configure origens exatas, HTTPS, `SESSION_SECURE_COOKIE=true` e o domínio de cookie apropriado. Não use `*` com credenciais.

Policies verificam que somente professores gerenciam turmas e atividades e que o professor é proprietário. A consulta de um recurso pertencente a outro professor retorna 404 para não confirmar sua existência. Alunos não podem criar esses recursos. A matrícula aceita somente usuários cujo papel persistido seja `student`.

## Respostas JSON

Resources Laravel usam o envelope `data`. Exemplos: perfil em `{ "data": { "id": "1", "name": "...", "email": "...", "role": "teacher" } }` e listas em `{ "data": [] }`.

Erros usam JSON: autenticação `401`, autorização por papel `403`, recurso inexistente ou fora do escopo `404`, validação `422` com `message` e `errors`, matrícula duplicada `409`, excesso de tentativas `429`. A falha de credenciais é `422` com mensagem genérica compatível com o gateway. O renderer padrão do Laravel não expõe stack trace em respostas API de produção; mantenha `APP_DEBUG=false` fora de desenvolvimento.

## Decisões para etapas posteriores

Avaliações publicadas devem apontar para uma versão imutável do conteúdo, incluindo questões e critérios, para preservar a prova entregue ao aluno se o rascunho original mudar. Essa etapa ainda não foi modelada.

Materiais ainda não são entidades persistidas. Quando implementados, PDFs devem ficar em armazenamento privado, com verificação de MIME e conteúdo, limite de tamanho, autorização por proprietário e política de retenção. Publicação, aplicação em turmas, tentativas, respostas, correção e resultados também permanecem fora do escopo atual.
