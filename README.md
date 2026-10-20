# Lousa

**Lousa** é uma plataforma de atividades e avaliações online desenvolvida para auxiliar professores na criação, aplicação e correção de avaliações, além de facilitar a participação dos alunos e o acompanhamento dos resultados.

A plataforma busca centralizar as etapas do processo avaliativo em um ambiente intuitivo, permitindo que professores gerenciem avaliações e acompanhem o desempenho dos alunos, enquanto os estudantes acessam as atividades por meio de códigos ou links de participação.

O projeto está sendo desenvolvido com React e TypeScript no front-end e terá um back-end em Laravel, responsável pela autenticação, regras de negócio, persistência dos dados e comunicação com a aplicação.

## Objetivos

- Simplificar a criação e o gerenciamento de avaliações online.
- Facilitar a aplicação de atividades por meio de códigos e links de acesso.
- Automatizar a correção de questões objetivas.
- Permitir a correção manual de questões discursivas.
- Disponibilizar notas e feedbacks após a liberação pelo professor.
- Preservar respostas e o andamento das avaliações durante a participação dos alunos.
- Preparar a plataforma para oferecer autenticação, persistência centralizada e acesso seguro aos dados.
- Possibilitar futuras integrações com um aplicativo dedicado à realização de avaliações.

## Funcionalidades

### Professor

- **Painel inicial:** acompanhamento de indicadores, aplicações recentes, próximas atividades e respostas aguardando correção.
- **Avaliações:** criação, edição, duplicação e arquivamento de avaliações.
- **Editor de questões:** criação de questões de alternativa única, verdadeiro ou falso e resposta aberta, com definição de pontuação e visualização prévia.
- **Materiais de apoio:** cadastro e consulta de links e arquivos relacionados às avaliações.
- **Aplicações:** configuração de períodos de disponibilidade, duração, identificação dos participantes e regras de acesso.
- **Compartilhamento:** geração de códigos e links para participação dos alunos.
- **Resultados:** consulta das participações, correção de questões discursivas, registro de feedbacks e controle da liberação dos resultados.
- **Conta:** gerenciamento das informações do perfil do professor.

### Aluno

- Acesso às avaliações por código ou link.
- Identificação conforme as regras definidas pelo professor.
- Consulta às instruções e aos materiais de apoio.
- Navegação entre as questões.
- Salvamento de respostas durante a avaliação.
- Revisão das respostas antes da entrega.
- Entrega ou desistência da participação.
- Consulta às notas e aos feedbacks após a liberação pelo professor.

### Regras de avaliação

- Correção automática de questões objetivas.
- Correção manual de questões discursivas.
- Controle de disponibilidade e duração das aplicações.
- Preservação das respostas finais após a conclusão da participação.
- Separação entre o estado da participação, o estado da correção e a liberação do resultado.
- Preservação do conteúdo das avaliações já publicadas, mesmo quando a avaliação original é alterada posteriormente.

## Tecnologias

### Front-end

- React
- TypeScript
- Vite
- React Router
- CSS
- Lucide Icons
- Vitest
- Playwright

### Back-end

- Laravel
- PHP
- API REST

### Persistência e integrações

A implementação atual do front-end utiliza armazenamento local do navegador para demonstrar os fluxos da aplicação.

Com o desenvolvimento do back-end, a persistência será centralizada em um banco de dados, e as funcionalidades passarão a utilizar uma API para comunicação entre as aplicações.

A tecnologia do banco de dados e as demais integrações de infraestrutura serão definidas conforme a implementação do back-end.

## Arquitetura do projeto

O projeto será organizado em duas aplicações independentes, integradas por meio de uma API REST.

### Front-end

Responsável pela interface, navegação, formulários, experiência de uso e apresentação dos dados.

Principais responsabilidades:

- Interface do professor e do aluno.
- Criação e edição de avaliações.
- Participação nas aplicações.
- Exibição e correção de resultados.
- Comunicação com a API.
- Validação de formulários e apresentação de mensagens de erro.

### Back-end

Responsável pelo processamento das requisições, aplicação das regras de negócio, autenticação e gerenciamento dos dados.

Principais responsabilidades previstas:

- Autenticação e gerenciamento de usuários.
- Gerenciamento de avaliações e questões.
- Cadastro e gerenciamento de materiais.
- Criação e controle das aplicações.
- Validação das regras de participação.
- Registro e persistência das respostas.
- Correção automática e manual.
- Controle de acesso aos resultados.
- Gerenciamento de arquivos e materiais de apoio.
- Disponibilização dos dados por meio de uma API REST.

## Instalação e execução

### Pré-requisitos

- Git
- Node.js 20.19 ou superior
- npm
- PHP compatível com a versão do Laravel utilizada
- Composer
- Banco de dados configurado para o back-end

### 1. Clonar o repositório

```bash
git clone <(https://github.com/DiegoAndreAfonso/Lousa>
cd lousa
```

### 2. Configurar o back-end

Acesse o diretório do back-end:
```bash
cd backend
```
Instale as dependências:
```bash
composer install
```
Crie o arquivo de configuração:
```bash
cp .env.example .env
```
Gere a chave da aplicação:
```bash
php artisan key:generate
```
Configure as variáveis de ambiente no arquivo .env, incluindo as credenciais do banco de dados.


Execute as migrações:
```bash
php artisan migrate
```
Inicie o servidor Laravel:
```bash
php artisan serve
```
Por padrão, a API ficará disponível em:
```bash
http://127.0.0.1:8000
```
Mantenha esse terminal aberto enquanto utilizar a aplicação.

### 3. Configurar o front-end
Abra outro terminal e acesse o diretório do front-end, a partir da raiz do projeto:
```bash
cd frontend
```
Instale as dependências:
```bash
npm ci
```
Configure o endereço da API conforme a estratégia de configuração adotada pelo projeto.

Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
O Vite exibirá o endereço local para acessar a aplicação no navegador, geralmente:
```bash
http://localhost:5173
```
### 4. Executar os testes
Para verificar os tipos TypeScript:
```bash
npm run typecheck
```
Para executar os testes de domínio:
```bash
npm test
```
Para executar os testes de navegação no navegador, instale os navegadores necessários:
```bash
npx playwright install chromium firefox webkit
```
Execute os testes:
```bash
npm run test:e2e
```
### 5. Gerar a versão de produção
Para compilar o front-end:
```bash
npm run build
```
Para visualizar a versão compilada localmente:
```bash
npm run preview
```
A publicação do front-end e do back-end deverá ser configurada separadamente, considerando o servidor web, a API, o banco de dados e as variáveis de ambiente de produção.


**Importante:** os comandos pressupõem que o repositório tenha os diretórios `frontend/` e `backend/`. Se o front-end estiver atualmente na raiz do repositório, será necessário ajustar os caminhos ou reorganizar os diretórios.

Além disso, como o back-end ainda será desenvolvido, os comandos do Laravel representam o procedimento previsto para quando sua estrutura estiver pronta. A configuração da URL da API no front-end também deverá corresponder à implementação real.
