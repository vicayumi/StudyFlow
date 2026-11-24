# StudyFlow

O StudyFlow é uma aplicação para organizar a rotina de estudos. O estudante cadastra disciplinas, tarefas e horários disponíveis; o sistema calcula prioridades e distribui sessões de estudo no calendário. Quando o plano muda, as sessões ainda pendentes podem ser reorganizadas sem apagar o progresso já concluído.

## Funcionalidades

- Cadastro, edição e remoção de disciplinas e tarefas.
- Tarefas com prazo, dificuldade, duração estimada, peso da avaliação e estado.
- Cadastro de disponibilidade semanal.
- Geração de planos para os próximos sete dias, com estratégia por prazo, dificuldade, peso ou combinação equilibrada.
- Explicação da prioridade atribuída, indicação de tarefas atrasadas e aviso quando não há tempo disponível suficiente.
- Opção de incluir tarefas futuras para adiantar o estudo.
- Calendário mensal com movimentação de sessões pendentes e validação de disponibilidade e conflitos.
- Histórico de planos, com consulta e remoção.
- Registro de estudo por Pomodoro, cronômetro livre ou entrada manual.
- Reorganização de sessões pendentes após progresso ou sessões perdidas.
- Resumos de tempo planejado e estudado, métodos usados e horários de estudo.
- Estimativas adaptativas: com histórico suficiente, o sistema ajusta o tempo usado no planejamento sem alterar a duração estimada cadastrada na tarefa.
- Conta de usuário, edição de dados pessoais e alteração de senha.
- Preferências de aparência, acessibilidade, lembretes e Pomodoro.

## Tecnologias e organização

- **Frontend:** React, TypeScript e Vite.
- **Backend:** Node.js, TypeScript e Express.
- **Banco de dados:** MySQL, acessado com `mysql2`.
- **Testes do backend:** Vitest.

O backend separa regras de domínio, aplicação, HTTP e infraestrutura. O domínio inclui entidades como `Tarefa`, `Disciplina` e `SessaoEstudo`, além de estratégias de prioridade intercambiáveis por interface, permitindo polimorfismo na geração do plano.

## Requisitos

- Node.js e npm.
- MySQL em execução e uma conta com permissão para criar/usar o banco `studyflow`.

## Configuração do MySQL

1. Abra `backend/src/infrastructure/database/schema.sql` no MySQL Workbench ou execute-o pelo cliente MySQL. Ele cria o banco `studyflow` e as tabelas-base de disciplinas, tarefas, horários, usuários e sessões de estudo.
2. Copie `backend/.env.example` para `backend/.env`.
3. Ajuste as credenciais do MySQL em `backend/.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=studyflow
CORS_ORIGINS=http://localhost:5173
```

O backend cria e atualiza tabelas auxiliares de autenticação e planejamento ao iniciar. A primeira execução exige que o MySQL esteja ligado e que a configuração esteja correta. Não coloque o arquivo `.env` no Git nem compartilhe sua senha.

## Executar localmente

Abra dois terminais na pasta do projeto.

Terminal 1 — API:

```powershell
cd backend
npm install
npm run dev
```

Terminal 2 — aplicação web:

```powershell
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`. O Vite encaminha as chamadas `/api` para `http://localhost:3000`. Para usar outra URL de API, crie `frontend/.env.local` com:

```env
VITE_BACKEND_URL=http://endereco-da-api:3000
```

Se a interface estiver em outra origem, inclua essa origem em `CORS_ORIGINS` no `backend/.env`.

## Comandos úteis

No diretório `backend`:

```powershell
npm run build       # compila TypeScript para dist/
npm test            # executa os testes automatizados
npm run test:watch  # executa os testes em modo de acompanhamento
npm start           # inicia a versão compilada
```

No diretório `frontend`:

```powershell
npm run build  # verifica TypeScript e gera frontend/dist/
npm run lint   # verifica problemas de lint
npm run preview
```

Os testes automatizados do backend ficam em `backend/src/tests`. O teste de integração MySQL depende de um banco acessível e das variáveis de ambiente configuradas.

## API

Todas as rotas abaixo usam o prefixo `/api`. Exceto cadastro e login, as rotas exigem autenticação por token Bearer.

| Recurso | Operações principais |
| --- | --- |
| `/autenticacao` | `POST /cadastro`, `POST /login`, `GET /me`, `PUT /me`, `PUT /me/senha`, `POST /logout` |
| `/disciplinas` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/tarefas` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/concluir`, `PATCH /:id/reabrir`, `DELETE /:id` |
| `/planejamento` | Horários, estratégias, geração e consulta semanal, calendário, movimentação de sessão, histórico, estimativas e resumo |
| `/sessoes-estudo` | Sessões de hoje, resumo de período, registro de estudo e conclusão de sessão planejada |

O cadastro de usuário recebe nome, e-mail, senha, nível de estudo, instituição e curso/série; cidade é opcional. As senhas são armazenadas com hash. Os dados de disciplinas, tarefas e planejamento são limitados à conta autenticada.

## Situação do projeto

O núcleo de cadastro, priorização, distribuição de sessões, registro de progresso e reorganização está implementado. O projeto também contém funcionalidades complementares de calendário, histórico, estatísticas, estimativas adaptativas e configurações. Ainda vale validar o fluxo completo com dados reais de MySQL e ampliar a cobertura de integração conforme as regras evoluírem.
