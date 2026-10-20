# Integração do frontend com o backend

## Estado encontrado

- O repositório contém o frontend React/TypeScript e um esqueleto Laravel em `backend/`. A única rota de API encontrada é `GET /api/user`, protegida por `auth:sanctum`; não há rotas de login/logout, dashboard, atividades, turmas, materiais ou geração por IA, nem controllers de domínio ou serviços relacionados.
- A busca também não encontrou arquivo Mermaid (`.mmd` ou `.mermaid`) no repositório. Portanto, não foi possível validar a navegação contra o fluxo oficial. Até o diagrama ser adicionado, as rotas e os modelos descritos no `README.md` são a referência disponível.
- O frontend inclui `demoApi` para persistência local em `localStorage`/IndexedDB. No uso normal ela começa vazia, não autentica contas reais, não chama IA nem grava no backend. A chave local de dados antigos não é apagada; o modo atual usa uma chave separada.
- Os modelos de domínio disponíveis no frontend são `Teacher`, `Assessment`, `Question`, `Material`, `Application`, `Attempt` e `Answer`. O esqueleto Laravel ainda não contém essas entidades; não há serviço ou rota de turma/classe. A publicação existente no modo local cria aplicações a partir de avaliações e não oferece seleção de turmas.

## Seleção do modo

O modo padrão é `api`; qualquer valor diferente de `demo` também seleciona o modo API para evitar fallback silencioso. Para uso local isolado, defina `VITE_LOUSA_MODE=demo` em `.env.local`. Esse acesso local não valida uma conta e os registros só ficam disponíveis no dispositivo atual. Se `VITE_LOUSA_API_BASE_URL` estiver vazio, as chamadas usam a origem atual. Variáveis `VITE_` são públicas: não coloque tokens, senhas ou chaves de provedor nelas.

No modo `demo`, o acesso ao painel é local e os dados começam vazios. Salvamento de atividades, materiais, aplicações e participações grava somente no dispositivo. A geração por prompt/PDF, cadastro, recuperação de acesso, verificação por e-mail e integração com aplicativo ficam indisponíveis. O PDF selecionado não é armazenado nem processado.

`VITE_LOUSA_TEST_TOOLS=true` é definido exclusivamente pelo `playwright.config.ts`. Nesse processo automatizado, o banco de fixtures e os controles de cenário são carregados para cobrir fluxos sem contrato de API. Não configure essa variável em builds públicos.

No modo `api`, não há fallback para dados locais. Cada operação integrada exige um caminho confirmado e configurado. Áreas sem integração mostram uma mensagem neutra de indisponibilidade. A área do professor não é liberada por um perfil salvo no navegador: a sessão é consultada pelo serviço de autenticação e o papel retornado precisa ser `teacher` ou `professor`.

## Contratos provisórios para confirmação

Nenhum dos caminhos abaixo é uma rota Laravel observada no repositório. São variáveis para conectar contratos que Kennedy/Gabriel confirmarem; permanecem vazias em `.env.example`.

| Operação | Configuração | Requisição provisória | Resposta provisória |
| --- | --- | --- | --- |
| Login | `VITE_LOUSA_API_LOGIN_PATH` | `POST` JSON `{ email, password }` | Inicia a sessão usada pelo Laravel. O frontend consulta o perfil logo em seguida. |
| Perfil/sessão | `VITE_LOUSA_API_CURRENT_USER_PATH` | `GET` | `{ data: { teacher: { id, name, email, role, subject?, institution? } } }`; `role` deve identificar professor. |
| Encerrar sessão | `VITE_LOUSA_API_LOGOUT_PATH` | `POST` | Invalida a sessão do servidor. Necessário no modo API para concluir logout. |
| Dashboard | `VITE_LOUSA_API_DASHBOARD_PATH` | `GET` | `{ data: { teacher, assessments, applications, attempts, materials } }`; listas sem dados devem vir vazias do backend. |
| Atividades | `VITE_LOUSA_API_ACTIVITIES_PATH` | `GET` lista; `POST` cria; `PUT /{id}` atualiza | Atividade compatível com o modelo TypeScript `Assessment` (inclui `questions`, `options`, `correctAnswer` e `points`); salvar deve retornar o registro com `id`. |
| Gerar por prompt | `VITE_LOUSA_API_GENERATE_PROMPT_PATH` | `POST` JSON `{ prompt, subject, questionCount }` | `{ data: { activity } }` com questão(s) editáveis. A geração não publica nem salva. |
| Gerar por material | `VITE_LOUSA_API_GENERATE_MATERIAL_PATH` | `POST multipart/form-data` com `material`, `subject`, `questionCount` | `{ data: { activity } }`; o limite atual de 25 MB é provisório e deve ser alinhado ao Laravel. |
| Listar materiais | `VITE_LOUSA_API_MATERIALS_PATH` | `GET` | Lista compatível com `Material`; é opcional para criar atividade. |

As requisições de API incluem `credentials: "include"`, usando sessão por cookie como contrato provisório. O esqueleto Laravel protege `GET /api/user` com `auth:sanctum`, mas não define o fluxo de login/logout do frontend nem confirma middleware stateful, cookies ou CSRF. Também faltam estrutura de recursos de domínio, limites de upload, papel de usuário e payloads reais.

Rotas de duplicação/arquivamento, publicação/aplicações, classes/turmas, resultados e correção ainda não foram integradas no modo API. A duplicação e o arquivamento retornam erro explícito no serviço; áreas sem contrato são bloqueadas para não apresentar dados locais como dados do servidor.

## Fluxos disponíveis

- A criação manual usa o editor e os tipos de questão existentes: alternativa única, verdadeiro/falso e resposta aberta.
- Criação por prompt e por PDF chama o mesmo serviço de geração e carrega o resultado no editor. O professor pode revisar e editar antes de salvar.
- A publicação local cria aplicações acessíveis somente no mesmo dispositivo. O backend precisa definir o contrato de classes/turmas e publicação antes de concluir essa etapa com dados compartilhados.

## Próximos contratos necessários

1. Adicionar/localizar o Mermaid oficial e confirmar os nomes das páginas/etapas.
2. Kennedy: fornecer rotas e schemas Laravel para login/perfil/logout, dashboard, atividades, turmas, materiais e publicação.
3. Gabriel: fornecer rotas e schemas para geração por prompt/PDF, limites do upload e formato das questões geradas.
4. Confirmar estratégia de sessão/CSRF e formato de erros de validação.
