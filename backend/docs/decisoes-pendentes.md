# Decisões pendentes

## Implementado nesta etapa

- Papel único por usuário: `teacher` ou `student`; contas existentes recebem `student`.
- Sessão web com Sanctum stateful, CSRF e origens CORS explicitamente permitidas.
- Não há cadastro público. A API não aceita alteração de papel nem de proprietário.
- Professor é o único proprietário da turma e da atividade nesta versão.
- Matrícula exige usuário persistido com papel `student`; remoção preserva registro com estado `removed`.
- Atividade começa como rascunho; atualização só é permitida em rascunho. Arquivamento é separado.
- Questões básicas são salvas junto com atividade para suportar o contrato do editor, sem publicação, resposta, correção ou versão imutável.

## Provisório por segurança

- Aluno só é matriculado por ação autenticada do professor proprietário, usando ID de conta já existente. Matrícula duplicada ativa é rejeitada; uma matrícula removida pode ser reativada.
- IDs de banco são inteiros internamente e strings nas respostas JSON para compatibilidade com TypeScript.
- Uma atividade precisa ter ao menos uma questão, conforme o parser atual do gateway.
- Login permite qualquer conta válida, mas o frontend da área do professor rejeita perfil `student`; o servidor continua protegendo operações por papel.
- Arquivadas não podem ser editadas. Não há operação de restauração ainda.
- Limite de login: cinco tentativas por minuto por e-mail/IP.
- Contas que já existirem ao aplicar a migration recebem `student`; uma pessoa autorizada precisa verificar e promover professores por operação administrativa controlada antes do uso real.

## Bloqueio de execução do ambiente

O manifest Composer declara PHP `^8.3`, mas o lock atual seleciona Symfony 8.1.x, que requer PHP `>=8.4.1`. O runtime disponível é PHP 8.3.6. O lock não foi alterado; antes de testar, a equipe precisa escolher PHP compatível ou re-resolver as dependências para suportar PHP 8.3.

## Validar com a equipe

- Como provisionar professores e alunos e se haverá cadastro, convite ou verificação de e-mail.
- Papel único versus múltiplos papéis para uma mesma pessoa.
- Identidade do aluno: conta obrigatória ou participação por código e identificação; consentimento e aprovação de matrícula.
- Co-docência, entrada/saída de turmas e política de exclusão/retensão de registros.
- Publicação, turmas de destino, janelas, duração, tentativas e snapshot/versionamento imutável da avaliação.
- Tipos de questão, pontuação, rubricas, correção de abertas e momento de liberação de notas/feedback.
- Limites, MIME, validação de conteúdo e retenção de materiais; usar storage privado ao implementar upload.
- Provedor, limites por usuário, custos, fila, logs e retenção de prompt/PDF da geração por IA.
- Política de privacidade e retenção para e-mail, nome, matrícula e respostas dos alunos.
- Verificação e recuperação de e-mail/senha, mailer e conteúdo das mensagens.
- Domínios HTTPS de produção, origens frontend, domínio de cookie, `SameSite` e estado final do CORS/Sanctum.
- Fornecimento/localização do Mermaid oficial do fluxo.

## Integrações ainda não concluídas

`teacherGateway.ts` já pode usar login, perfil, logout e operações básicas de atividades com os caminhos documentados em `api.md`, desde que o frontend configure o cookie CSRF e a origem/base URL. A sessão real entre processos frontend e backend ainda precisa de teste de navegador com os dois servidores ativos.

Não há integração de dashboard, turmas, materiais, publicação, aplicações, tentativas, resultados, correção ou IA. A operação de arquivamento foi criada no backend, mas o gateway API ainda a declara indisponível. Esses contratos devem ser confirmados e implementados em etapas próprias, sem alegar integração completa.
