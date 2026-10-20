# Lousa

Frontend da plataforma Lousa para criação e acompanhamento de atividades e avaliações. A interface está em português do Brasil e reúne os espaços do professor e do aluno.

## Instalação e execução

Requisitos: Node.js 20.19 ou superior, npm e um navegador moderno com localStorage e IndexedDB habilitados.

```bash
npm ci
npm run dev
```

Abra o endereço local indicado pelo Vite. Para gerar e visualizar a versão compilada:

```bash
npm run build
npm run preview
```

O projeto inicia em modo API. Como este checkout não contém o backend Laravel, copie `.env.example` para `.env.local` e defina `VITE_LOUSA_MODE=demo` para trabalhar com persistência local. Esse acesso não autentica contas; as alterações ficam restritas ao dispositivo. Não há conteúdo inicial no uso normal.

Verificações disponíveis:

```bash
npm run typecheck
npm test
```

`npm test` executa os testes de domínio com Vitest. O build também verifica os tipos antes de gerar os arquivos em `dist/`. Ao hospedar o front-end, configure o servidor para retornar `index.html` nas rotas da aplicação.

Para executar os testes de percurso no navegador, instale o Chromium usado pelo Playwright e execute:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

A configuração verifica Chromium, Firefox e WebKit e inicia o servidor de desenvolvimento em `http://127.0.0.1:5173` ou reutiliza um servidor já ativo nesse endereço. Cada teste usa um contexto de navegador independente. Em Linux, os navegadores podem exigir bibliotecas adicionais, indicadas por `npx playwright install-deps`. WebKit verifica o motor de renderização usado pelo Safari; a validação em um dispositivo Apple continua sendo uma etapa própria. Para verificar somente os cenários públicos no Chromium:

```bash
npx playwright test tests/browser/student.spec.ts --project=chromium --workers=1
```

## Acesso e integração

O painel do professor começa em `/login`. No modo API, o acesso exige e-mail, senha e confirmação do perfil de professor pelo serviço de autenticação. Nenhum perfil salvo no navegador concede autorização. Os caminhos provisórios permanecem vazios até a equipe confirmar os contratos; veja [docs/integracao-frontend.md](docs/integracao-frontend.md).

No modo local (`VITE_LOUSA_MODE=demo`), o painel pode ser acessado sem conta para trabalhar com dados criados no próprio dispositivo. Esse acesso não é autenticação e não substitui uma sessão real. Atividades, materiais, aplicações e respostas locais não são compartilhados entre dispositivos. A geração por prompt/PDF, o cadastro de contas, a recuperação de senha, a verificação por e-mail e a integração com aplicativo permanecem indisponíveis fora do ambiente automatizado de testes.

Os dados iniciais e os controles de cenário são habilitados somente pelo Playwright durante os testes de navegador (`VITE_LOUSA_TEST_TOOLS`). Eles não fazem parte do modo local usado no desenvolvimento normal nem do build padrão. O serviço de dados e as fixtures continuam separados para preservar a cobertura automatizada sem apresentar conteúdo inicial como dado de usuário.

## Funcionalidades

- **Visão geral:** indicadores e listas derivados dos dados disponíveis.
- **Avaliações:** pesquisa, filtros, criação, edição, duplicação, arquivamento e associação de materiais. O editor permite adicionar, remover e reordenar questões de alternativa única, verdadeiro ou falso e resposta aberta, com pontuação e prévia para o aluno.
- **Materiais:** cadastro e consulta de links e arquivos locais. Os arquivos ficam no navegador, com visualização quando o formato permite; não são apresentados como enviados a um servidor.
- **Aplicações:** validação de período e duração; no modo local, geração de código e link restritos ao dispositivo atual.
- **Resultados:** participações com identificador próprio, respostas, correção das questões abertas, feedback e controle de liberação. Questões objetivas são pontuadas automaticamente. Questões abertas sem resposta valem zero. Desistências preservam as respostas salvas para consulta, sem correção ou liberação de nota.
- **Conta:** edição do perfil, com proteção das alterações pendentes ao sair. Informações de assinatura aparecem como indisponíveis enquanto não houver integração.
- **Aluno:** identificação, instruções, materiais, navegação pelas questões, salvamento local, revisão e encerramento. Resultados e feedback dependem da liberação pelo professor.

## Estrutura

```text
src/
  components/       Layouts, feedback, diálogos e editor de questões
  pages/            Páginas do professor e acesso público do aluno
  styles/           Estilos compartilhados e por área/componente
  types/            Modelos de domínio e tipos públicos
  data/seed.ts      Fixtures de navegador para os testes
  services/
    demoApi.ts      Serviços assíncronos, regras e persistência local
    nativeApp.ts    Estados e autorização de retomada simulados
    useStudentAttempt.ts  Respostas, autosave e prazo na interface
    format.ts       Formatação em português do Brasil
tests/
  domain.test.ts    Regras de tempo, acesso, tentativas e resultados
  browser/          Percursos do professor e do aluno em Chromium
vite.config.ts     Configuração de desenvolvimento e build
vitest.config.ts   Configuração isolada dos testes de domínio
playwright.config.ts  Configuração dos percursos no navegador
```

A stack usa React, TypeScript, Vite, React Router, CSS e ícones Lucide. As versões instaláveis estão fixadas pelo `package-lock.json`.

Os modelos principais são `Teacher`, `Assessment`, `Question`, `Material`, `Application`, `Attempt` e `Answer`. A avaliação é reutilizável; cada aplicação publicada armazena uma cópia independente do conteúdo, das questões, dos gabaritos e das regras. Edições posteriores na avaliação não modificam aplicações existentes.

Os serviços oferecem métodos assíncronos por `demoApi` e por exports nomeados. `createDemoApi` aceita armazenamento e relógio substituíveis para testes. Erros incluem `code` e uma mensagem legível em português. Os métodos públicos devolvem modelos separados: sem gabaritos, lista de e-mails autorizados ou notas e feedback ainda não liberados.

As páginas são carregadas sob demanda, com mensagem de carregamento, para reduzir o código necessário na entrada. A navegação do painel usa bloqueio de saída quando existem alterações pendentes no editor, na correção ou no perfil. Cancelar uma saída para a tela de login mantém a sessão demonstrativa atual.

## Rascunhos do professor

O editor de avaliações salva automaticamente um rascunho local, inclusive quando o conteúdo ainda está incompleto. Ao recarregar ou voltar, o rascunho é recuperado e identificado como não confirmado. Somente **Salvar avaliação** atualiza a avaliação reutilizável; aplicações publicadas preservam suas cópias. Os campos ficam temporariamente desabilitados durante a confirmação para evitar que uma resposta do serviço substitua uma edição posterior.

O rascunho usa `lousa.teacher.assessment-draft.v1.<ID>`; novas avaliações usam o sufixo `new`. Ele é removido após confirmar ou descartar. Se a avaliação salva foi atualizada depois da criação do rascunho, a tela solicita uma escolha entre recuperar o rascunho e continuar com a versão salva. A proteção de versão ocorre ao abrir o editor; edição simultânea em várias abas ainda exige controle de concorrência na integração futura.

Notas abertas e feedback também têm rascunhos locais por tentativa, em `lousa.teacher.correction-draft.v1.<ID>`. Recuperar esse rascunho não salva a correção nem libera o resultado. Um rascunho incompatível com uma correção oficial mais recente não é aplicado e a tela informa o ocorrido. A confirmação ou o descarte limpa o rascunho correspondente.

O aviso de saída também cobre os menus e os botões Voltar. Fechar ou recarregar pode apresentar a confirmação padrão do navegador. Falhas no armazenamento são informadas sem apagar os campos da página. Os rascunhos permanecem restritos ao navegador e não substituem persistência remota.

## Persistência e regras das tentativas

Dados pequenos são armazenados em `avaliacoes-online.demo.v1` no localStorage. Arquivos ficam no banco IndexedDB `avaliacoes-online-materials-v1`, no armazenamento `files`. Os textos de apoio iniciais são arquivos de exemplo incluídos no código. URLs e metadados dos materiais permanecem nos dados pequenos.

O marcador da participação por aplicação usa `ao.student.attempt.<CODIGO>`. Cada rascunho local usa `ao.demo.draft.<ID>` e contém as respostas e o horário do salvamento. A interface distingue rascunho local, sincronização em andamento, sincronização concluída e falha. A falha simulada não elimina o rascunho.

Cada participação recebe um ID e um identificador próprios, mesmo quando os nomes são iguais. O prazo absoluto é o menor valor entre o fim da disponibilidade e o início somado à duração. Recarregar a página ou restabelecer a conexão não reinicia esse prazo.

Ao atingir o limite, o serviço encerra a participação com as respostas sincronizadas e com o último rascunho local válido salvo dentro do prazo. Rascunhos anteriores ao início, posteriores ao prazo ou inválidos são ignorados. Tentativas entregues, desistentes ou expiradas não voltam ao estado em andamento e suas respostas finais não são alteradas. Encerrar uma aplicação impede novas participações e encerra as participações ainda abertas.

O estado da participação, o estado da correção e a liberação do resultado são campos separados. Uma correção pendente impede a liberação. Reabrir a confirmação permite consultar o resultado quando ele for liberado.

## Cenários de verificação

1. **Percurso completo:** entre no painel, crie uma avaliação com uma questão objetiva e uma aberta, publique em Aplicações com início atual e fim futuro, copie o link, participe como aluno e entregue. Em Resultados, abra a participação, atribua a nota aberta, salve a correção e libere o resultado. Volte à confirmação do aluno e atualize a consulta.
2. **Recarga:** responda uma questão em `BIO101`, aguarde a sincronização e recarregue. As respostas e o prazo original devem ser retomados.
3. **Nomes iguais:** inicie duas participações com o mesmo nome em sessões públicas independentes do mesmo navegador. Elas devem ter identificadores próprios e não sobrescrever respostas. Para iniciar outra participação após a confirmação, use a ação de nova participação da demonstração.
4. **Prazo:** publique uma aplicação com duração de um minuto, salve uma resposta e aguarde o término. A confirmação deve indicar tempo esgotado; recarregar mantém o encerramento. Se a disponibilidade terminar antes da duração, prevalece o fim da disponibilidade.
5. **E-mail:** em `MAT202`, tente um endereço fora da lista e confirme a recusa. Use `aluno@exemplo.com`, solicite o código demonstrativo, tente um código incorreto e depois o correto.
6. **Aplicativo:** em `FIS303`, selecione verificação pendente, não instalado ou incompatível e confirme que não é possível começar. Selecione Pronto, comece, responda e simule conexão interrompida. A interação deve ficar suspensa; as respostas e o prazo são preservados. Selecione Pronto e solicite a retomada.
7. **Salvamento:** ative a falha de sincronização no controle demonstrativo da prova e responda. A interface deve informar a falha mantendo o rascunho local. Desative o cenário e tente sincronizar novamente. A entrega requer a sincronização; o prazo continua correndo durante a falha.
8. **Estados de acesso:** abra um código inexistente, `GEO404` e `HIS505` para verificar link inválido, abertura futura e encerramento.
9. **Cópia publicada:** publique uma avaliação, altere o enunciado ou gabarito no editor e confira que a aplicação publicada mantém o conteúdo original.

Os testes automatizados cobrem IDs distintos inclusive em chamadas simultâneas, recarga e prazo absoluto, respostas finais imutáveis, expiração com rascunho local após falha, validações de disponibilidade e configuração, e-mail e token inválidos, cópias publicadas, retorno público, correção/liberação e aplicativo indisponível.

Os testes de navegador verificam as mensagens de acesso, identificação por e-mail, novas participações explícitas com nomes iguais, recarga de respostas e prazo, recuperação de rascunho após falha de sincronização, suspensão e retomada do aplicativo e confirmação após tempo esgotado. O cenário de expiração encurta somente o prazo de um dado local de teste para evitar aguardar os 45 minutos da atividade; a derivação do prazo é coberta nos testes de domínio.

Os percursos do professor também cobrem rascunhos de avaliação e correção, recarga e saída confirmada, descarte, falhas no armazenamento, proteção durante o salvamento e conflito com uma versão confirmada. Cadastro, recuperação e edição de perfil são verificados sem persistir senhas. Os testes de acessibilidade incluem nomes e descrições dos campos, foco no primeiro erro, foco no diálogo de saída e retorno por Escape; a validação manual com leitores de tela continua recomendada.

## Integrações futuras e limites

Esta implementação demonstra os fluxos no navegador. localStorage, IndexedDB, códigos, tokens, dados e relógio podem ser consultados ou alterados pelo próprio usuário. A separação dos modelos públicos evita exposição acidental na interface, mas os mocks contêm os dados internos no mesmo navegador e não oferecem segurança de produção. Os dados não são compartilhados entre dispositivos ou perfis, não há recuperação remota de arquivos e limpar o armazenamento remove a demonstração.

Uma API real deverá validar identidade, sessão, permissões do professor e do aluno, e-mails autorizados, prazo e estados definitivos. Também deverá enviar e-mails, armazenar arquivos com validação e controle de acesso, persistir tentativas e correções, tratar concorrência e falhas de rede e servir somente os dados públicos autorizados. Assinatura e pagamentos dependerão de uma integração própria.

A integração com o aplicativo é claramente simulada nos estados Verificação pendente, Não instalado, Incompatível, Pronto e Conexão interrompida. A regra de autorização de início/retomada fica em `nativeApp.ts`, para substituição futura. Windows 11 e Linux Mint são sistemas previstos; não há compatibilidade já validada nem download disponível.

O aplicativo futuro será responsável pelas restrições ao ambiente da prova. A instalação poderá exigir administrador, e o professor não deverá configurar políticas manualmente. O front-end atual não bloqueia o computador, não captura globalmente teclado ou mouse e não afirma que o computador está protegido. Tela cheia ou detecção de foco não implementam esse controle. A integração nativa, a autorização do backend e a validação nos sistemas previstos são etapas futuras.
