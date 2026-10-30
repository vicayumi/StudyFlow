# StudyFlow

Aplicação para organizar disciplinas e tarefas de estudo. O projeto combina frontend React/Vite, API Express e banco de dados MySQL.

## Requisitos

- Node.js e npm
- MySQL em execução

## Preparar o banco de dados

1. Execute `backend/src/infrastructure/database/schema.sql` no MySQL Workbench ou no cliente MySQL. O script cria o banco `studyflow` e suas tabelas, incluindo contas de usuário.
2. Copie `backend/.env.example` para `backend/.env` e configure o usuário e a senha do MySQL. Ao iniciar, a API prepara as colunas de associação ao usuário nos bancos existentes.

## Iniciar o projeto

Abra dois terminais na pasta do projeto.

No primeiro terminal, inicie a API:

```powershell
cd backend
npm install
npm run dev
```

No segundo terminal, inicie o frontend:

```powershell
cd frontend
npm install
npm run dev
```

O Vite abre o frontend em `http://localhost:5173` e encaminha as chamadas `/api` para `http://localhost:3000`. Se a API estiver em outra máquina ou porta, crie `frontend/.env.local` com `VITE_BACKEND_URL=http://endereco-da-api:3000`. A API aceita as origens configuradas em `CORS_ORIGINS` no arquivo `.env` do backend.

## Rotas disponíveis

- `POST /api/autenticacao/cadastro` — criar conta e iniciar sessão
- `POST /api/autenticacao/login` — entrar com e-mail e senha
- `GET /api/autenticacao/me` — consultar a conta da sessão atual
- `POST /api/autenticacao/logout` — encerrar a sessão atual

As rotas de disciplinas, tarefas e planejamento exigem uma sessão autenticada e trabalham apenas com os dados da própria conta. O cadastro solicita nome, e-mail, senha, nível de estudo, instituição e curso/série; cidade é opcional. Senhas são armazenadas com hash e não ficam em texto puro.

- `GET /api/disciplinas` — listar disciplinas
- `POST /api/disciplinas` — criar disciplina
- `GET /api/disciplinas/:id` — buscar disciplina
- `PUT /api/disciplinas/:id` — atualizar disciplina
- `DELETE /api/disciplinas/:id` — excluir disciplina
- `GET /api/tarefas` — listar tarefas
- `GET /api/tarefas?disciplinaId=:id` — filtrar tarefas por disciplina
- `POST /api/tarefas` — criar tarefa
- `PUT /api/tarefas/:id` — atualizar tarefa
- `PATCH /api/tarefas/:id/concluir` — concluir tarefa
- `PATCH /api/tarefas/:id/reabrir` — reabrir tarefa
- `DELETE /api/tarefas/:id` — excluir tarefa
- `GET /api/planejamento/horarios` — listar horários semanais disponíveis
- `POST /api/planejamento/horarios` — cadastrar um horário semanal
- `PUT /api/planejamento/horarios/:id` — atualizar um horário
- `DELETE /api/planejamento/horarios/:id` — remover um horário
- `GET /api/planejamento/estrategias` — listar estratégias de prioridade
- `POST /api/planejamento/gerar` — gerar e salvar o plano dos próximos sete dias
- `GET /api/planejamento/semanal?dataInicio=AAAA-MM-DD` — recuperar um plano salvo
- `GET /api/planejamento/calendario?ano=AAAA&mes=MM` — carregar sessões salvas no mês

O plano semanal pode priorizar prazo, dificuldade, peso da avaliação ou combinar os três critérios. A resposta inclui a pontuação e o motivo da prioridade por tarefa. Um novo plano para a mesma data inicial substitui a versão anterior daquela semana.

## Próximos itens do projeto

- As sessões planejadas ficam salvas por usuário e semana e aparecem no calendário; ainda não podem ser marcadas como concluídas.
- O campo de tempo estudado existe nos dados, mas ainda não há uma ação na interface nem uma rota para registrar sessões.
- O plano permite escolher uma estratégia de prioridade e mostra sua pontuação e justificativa.
- Listas e avaliações ainda são cadastradas como tarefas genéricas, sem tipo específico.
