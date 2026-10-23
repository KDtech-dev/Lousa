# API inicial do Lousa

Prefixo: `/api`. Envie e aceite `application/json`. As respostas de Resources usam `{ "data": ... }`. IDs nos Resources são strings, embora as chaves internas do banco sejam inteiros.

## Autenticação

| Método e caminho | Acesso | Payload | Sucesso |
| --- | --- | --- | --- |
| `POST /api/login` | Público, limite de 5/min por e-mail/IP | `{ "email": "professor@example.com", "password": "..." }` | `200`, `{ "data": { "id": "1", "name": "...", "email": "...", "role": "teacher" } }` |
| `GET /api/user` | Sessão autenticada | — | `200`, mesmo perfil seguro retornado no login |
| `POST /api/logout` | Sessão autenticada, CSRF | — | `204`, encerra e invalida a sessão |

Não há cadastro nem recuperação de senha nesta etapa. A conta deve ser provisionada por fluxo administrativo controlado. O perfil não tem rota de atualização; papel e propriedade não podem ser alterados pelo cliente.

## Turmas e matrículas

| Método e caminho | Papel | Payload | Sucesso |
| --- | --- | --- | --- |
| `GET /api/classrooms` | Professor | — | `200`, lista apenas turmas próprias |
| `POST /api/classrooms` | Professor | `{ "name": "Biologia 8A", "description": "..." }` | `201`, turma criada com professor autenticado |
| `GET /api/classrooms/{id}` | Professor proprietário | — | `200`, turma com alunos ativos |
| `PUT /api/classrooms/{id}` | Professor proprietário | `{ "name": "...", "description": "..." }` | `200`, turma atualizada |
| `GET /api/classrooms/{id}/students` | Professor proprietário | — | `200`, alunos ativos da turma |
| `POST /api/classrooms/{id}/enrollments` | Professor proprietário | `{ "student_id": "42" }` | `201`, matrícula ativa; exige usuário com papel `student` |
| `DELETE /api/classrooms/{id}/enrollments/{enrollmentId}` | Professor proprietário | — | `204`, matrícula marcada como removida |

Um par turma/aluno não pode ter registros duplicados. Uma matrícula ativa repetida retorna `409`; uma matrícula removida pode ser reativada pelo professor responsável. A política de consentimento/convite do aluno ainda precisa ser definida.

## Atividades

| Método e caminho | Papel | Payload/resposta |
| --- | --- | --- |
| `GET /api/activities` | Professor | Lista somente rascunhos e arquivadas do professor, com questões |
| `POST /api/activities` | Professor | Cria rascunho e retorna `201` com atividade e questões |
| `GET /api/activities/{id}` | Professor proprietário | Retorna atividade própria |
| `PUT /api/activities/{id}` | Professor proprietário, somente rascunho | Substitui campos e conjunto de questões em transação |
| `PATCH /api/activities/{id}/archive` | Professor proprietário | Arquiva a atividade e retorna a representação atualizada |

O payload de criação/atualização segue o modelo do editor atual:

```json
{
  "title": "Estrutura celular",
  "subject": "Biologia",
  "description": "Revisão do conteúdo",
  "instructions": "Escolha uma alternativa.",
  "questions": [
    {
      "id": "id-opcional-do-editor",
      "type": "single",
      "prompt": "Qual alternativa está correta?",
      "options": ["A", "B"],
      "correctAnswer": "A",
      "points": 2
    }
  ],
  "materialIds": []
}
```

São aceitos `single`, `boolean` e `open`; cada atividade precisa de pelo menos uma questão. O backend ignora IDs enviados pelo cliente que não correspondam a uma questão já pertencente à atividade. `teacher_id`, `role`, `status`, `archived` e timestamps recebidos não controlam propriedade ou estado. `materialIds` precisa estar vazio até existir API de materiais.

Atividades usam o envelope compatível com `teacherGateway.ts`: `id`, `title`, `subject`, `description`, `instructions`, `questions`, `materialIds`, `archived`, `createdAt` e `updatedAt`. Questões retornam `id`, `type`, `prompt`, `options`, `correctAnswer` e `points`.

## Erros

- `401`: sessão ausente/expirada (`{ "message": "Unauthenticated." }`).
- `403`: papel sem permissão para a operação.
- `404`: ID inexistente ou recurso fora do escopo do professor.
- `422`: payload inválido; Laravel retorna `message` e `errors` por campo. Credenciais inválidas usam mensagem genérica sem indicar qual campo falhou.
- `409`: matrícula ativa já existente.
- `429`: limite de login atingido.

## Configuração do frontend

Com frontend Vite local e backend em `http://localhost:8000`, configure no ambiente do frontend:

```dotenv
VITE_LOUSA_MODE=api
VITE_LOUSA_API_BASE_URL=http://localhost:8000
VITE_LOUSA_API_LOGIN_PATH=/api/login
VITE_LOUSA_API_CURRENT_USER_PATH=/api/user
VITE_LOUSA_API_LOGOUT_PATH=/api/logout
VITE_LOUSA_API_ACTIVITIES_PATH=/api/activities
VITE_LOUSA_API_CSRF_PATH=/sanctum/csrf-cookie
```

O perfil e as atividades passam a ter endpoints compatíveis. O gateway ainda não integra turmas ou arquivamento. Dashboard, materiais, publicação/aplicações, alunos, tentativas, correção, resultados e geração por IA não estão implementados; nenhum fallback local/API simula essas capacidades no servidor.
