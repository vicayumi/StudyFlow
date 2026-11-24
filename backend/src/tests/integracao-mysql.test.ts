import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ControladorAutenticacao } from "../http/controllers/controlador-autenticacao.js";
import { ControladorDisciplinas } from "../http/controllers/controlador-disciplinas.js";
import { ControladorPlanejamento } from "../http/controllers/controlador-planejamento.js";
import { ControladorSessoesEstudo } from "../http/controllers/controlador-sessoes-estudo.js";
import { ControladorTarefas } from "../http/controllers/controlador-tarefas.js";
import { autenticar } from "../http/middleware/autenticar.js";
import { conexao } from "../infrastructure/database/conexao.js";
import { prepararBanco } from "../infrastructure/database/preparar-banco.js";

const executarIntegracao = process.env.RUN_MYSQL_INTEGRATION === "1";
const bancoConfigurado = process.env.DB_NAME ?? "";
if (executarIntegracao && !/_test$/i.test(bancoConfigurado)) {
    throw new Error("Por segurança, os testes de integração só rodam se DB_NAME terminar com _test.");
}

type Handler = (requisicao: Request, resposta: Response) => void | Promise<void>;

interface OpcoesRequisicao {
    body?: unknown;
    query?: Record<string, unknown>;
    params?: Record<string, string>;
    token?: string;
}

interface ResultadoResposta {
    status: number;
    corpo: unknown;
}

function criarResposta() {
    const estado = { status: 200, corpo: undefined as unknown };
    const resposta = {
        status(codigo: number) {
            estado.status = codigo;
            return resposta;
        },
        json(corpo: unknown) {
            estado.corpo = corpo;
            return resposta;
        },
        send(corpo?: unknown) {
            estado.corpo = corpo;
            return resposta;
        }
    } as unknown as Response;
    return { resposta, estado };
}

async function chamarHandler(handler: Handler, opcoes: OpcoesRequisicao = {}): Promise<ResultadoResposta> {
    const { resposta, estado } = criarResposta();
    const requisicao = {
        body: opcoes.body ?? {},
        query: opcoes.query ?? {},
        params: opcoes.params ?? {},
        get: (nome: string) => nome.toLowerCase() === "authorization" && opcoes.token
            ? `Bearer ${opcoes.token}`
            : undefined
    } as unknown as Request;
    let autenticado = false;
    let erroMiddleware: unknown;
    await autenticar(requisicao, resposta, ((erro?: unknown) => {
        if (erro) erroMiddleware = erro;
        else autenticado = true;
    }) as NextFunction);
    if (erroMiddleware) throw erroMiddleware;
    if (autenticado) await handler(requisicao, resposta);
    return { status: estado.status, corpo: estado.corpo };
}

function formatarDataLocal(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

const integrar = executarIntegracao ? describe : describe.skip;

integrar("Fluxo integrado do StudyFlow com MySQL", () => {
    const autenticacao = new ControladorAutenticacao();
    const disciplinas = new ControladorDisciplinas();
    const tarefas = new ControladorTarefas();
    const planejamento = new ControladorPlanejamento();
    const sessoes = new ControladorSessoesEstudo();
    const usuariosCriados: string[] = [];

    beforeAll(async () => {
        await prepararBanco();
    });

    afterEach(async () => {
        for (const usuarioId of usuariosCriados.splice(0)) {
            await conexao.execute("DELETE FROM sessoes_estudo_realizadas WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM planos_semanais WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM historico_planejamentos WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM tarefas WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM horarios_disponiveis WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM disciplinas WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM sessoes_login WHERE usuario_id = ?", [usuarioId]);
            await conexao.execute("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
        }
    });

    afterAll(async () => {
        if (executarIntegracao) await conexao.end();
    });

    async function cadastrarUsuario(nome: string) {
        const email = `${randomUUID()}@studyflow.test`;
        const resposta = criarResposta();
        await autenticacao.cadastrar({
            body: {
                nome,
                email,
                senha: "senha-de-integracao-123",
                nivelEstudo: "medio",
                instituicao: "Instituição de teste",
                cursoSerie: "2º ano",
                cidade: "São Paulo"
            }
        } as unknown as Request, resposta.resposta);
        expect(resposta.estado.status).toBe(201);
        const sessao = resposta.estado.corpo as { usuario: { id: string }; token: string };
        usuariosCriados.push(sessao.usuario.id);
        return { ...sessao, email };
    }

    it("faz cadastro, autenticação, tarefa, sessão, planejamento e conclusão persistirem juntos", async () => {
        const sessao = await cadastrarUsuario("Conta de integração");

        const login = criarResposta();
        await autenticacao.entrar({
            body: { email: sessao.email, senha: "senha-de-integracao-123" }
        } as unknown as Request, login.resposta);
        expect(login.estado.status).toBe(200);
        expect((login.estado.corpo as { usuario: { id: string } }).usuario.id).toBe(sessao.usuario.id);

        const conta = await chamarHandler(autenticacao.atual, { token: sessao.token });
        expect(conta.status).toBe(200);
        expect((conta.corpo as { usuario: { id: string } }).usuario.id).toBe(sessao.usuario.id);

        const disciplina = await chamarHandler(disciplinas.criar, {
            token: sessao.token,
            body: { nome: "Matemática", cor: "#7541CE" }
        });
        expect(disciplina.status).toBe(201);
        const disciplinaCriada = disciplina.corpo as { id: string; nome: string };

        const inicioPlano = new Date();
        inicioPlano.setDate(inicioPlano.getDate() + 1);
        inicioPlano.setHours(0, 0, 0, 0);
        const prazo = new Date(inicioPlano);
        prazo.setDate(prazo.getDate() + 3);
        prazo.setHours(17, 0, 0, 0);

        const tarefa = await chamarHandler(tarefas.criar, {
            token: sessao.token,
            body: {
                disciplinaId: disciplinaCriada.id,
                titulo: "Lista de integração",
                descricao: "Valida a persistência do fluxo de estudo.",
                dataPrazo: prazo.toISOString(),
                dificuldade: 3,
                duracaoEstimada: 60,
                pesoAvaliacao: 20
            }
        });
        expect(tarefa.status).toBe(201);
        const tarefaCriada = tarefa.corpo as { id: string };

        const horario = await chamarHandler(planejamento.criarHorario, {
            token: sessao.token,
            body: { diaSemana: inicioPlano.getDay(), horaInicio: "09:00", horaFim: "12:00" }
        });
        expect(horario.status).toBe(201);

        const registro = await chamarHandler(sessoes.registrarEstudo, {
            token: sessao.token,
            body: { tarefaId: tarefaCriada.id, duracaoSegundos: 1200, tipo: "manual" }
        });
        expect(registro.status).toBe(201);

        const tarefaComProgresso = await chamarHandler(tarefas.listar, { token: sessao.token });
        const tarefaSalva = (tarefaComProgresso.corpo as { id: string; tempoEstudado: number; estado: string }[])
            .find((item) => item.id === tarefaCriada.id);
        expect(tarefaSalva).toMatchObject({ tempoEstudado: 20, estado: "pendente" });

        const plano = await chamarHandler(planejamento.gerarPlano, {
            token: sessao.token,
            body: { dataInicio: formatarDataLocal(inicioPlano), estrategia: "combinada", incluirTarefasFuturas: true }
        });
        expect(plano.status).toBe(200);
        const planoSalvo = plano.corpo as {
            dataInicio: string;
            sessoes: { id: string; tarefaId: string; duracaoMinutos: number; inicio: string; fim: string }[];
        };
        expect(planoSalvo.sessoes).toHaveLength(1);
        expect(planoSalvo.sessoes[0]).toMatchObject({ tarefaId: tarefaCriada.id, duracaoMinutos: 40 });

        const semana = await chamarHandler(planejamento.buscarSemanaSalva, {
            token: sessao.token,
            query: { dataInicio: planoSalvo.dataInicio }
        });
        expect(semana.status).toBe(200);
        expect((semana.corpo as { sessoes: unknown[] }).sessoes).toHaveLength(1);

        const historico = await chamarHandler(planejamento.listarHistorico, { token: sessao.token });
        expect(historico.status).toBe(200);
        const itemHistorico = (historico.corpo as { id: string; dataInicio: string }[])
            .find((item) => item.dataInicio === planoSalvo.dataInicio);
        expect(itemHistorico).toBeDefined();

        const calendario = await chamarHandler(planejamento.listarCalendario, {
            token: sessao.token,
            query: { ano: String(inicioPlano.getFullYear()), mes: String(inicioPlano.getMonth() + 1) }
        });
        expect(calendario.status).toBe(200);
        expect((calendario.corpo as { id: string; tarefaId: string }[]).some((item) => item.tarefaId === tarefaCriada.id)).toBe(true);

        const sessaoPlanejada = planoSalvo.sessoes[0];
        const concluirSessao = {
            tarefaId: tarefaCriada.id,
            inicio: sessaoPlanejada.inicio,
            fim: sessaoPlanejada.fim,
            duracaoMinutos: sessaoPlanejada.duracaoMinutos,
            planoSessaoId: sessaoPlanejada.id
        };
        const conclusao = await chamarHandler(sessoes.concluirPlanejada, { token: sessao.token, body: concluirSessao });
        expect(conclusao.status).toBe(201);

        const duplicada = await chamarHandler(sessoes.concluirPlanejada, { token: sessao.token, body: concluirSessao });
        expect(duplicada.status).toBe(400);

        const tarefasFinais = await chamarHandler(tarefas.listar, { token: sessao.token });
        expect((tarefasFinais.corpo as { id: string; tempoEstudado: number; estado: string }[])
            .find((item) => item.id === tarefaCriada.id))
            .toMatchObject({ tempoEstudado: 60, estado: "concluida" });

        const planoAtualizado = await chamarHandler(planejamento.buscarSemanaSalva, {
            token: sessao.token,
            query: { dataInicio: planoSalvo.dataInicio }
        });
        expect((planoAtualizado.corpo as { sessoes: unknown[]; prioridades: unknown[] }).sessoes).toHaveLength(0);
        expect((planoAtualizado.corpo as { prioridades: unknown[] }).prioridades).toHaveLength(0);

        const calendarioAtualizado = await chamarHandler(planejamento.listarCalendario, {
            token: sessao.token,
            query: { ano: String(inicioPlano.getFullYear()), mes: String(inicioPlano.getMonth() + 1) }
        });
        expect((calendarioAtualizado.corpo as { tarefaId: string }[])
            .some((item) => item.tarefaId === tarefaCriada.id)).toBe(false);

        const hoje = await chamarHandler(sessoes.listarDia, {
            token: sessao.token,
            query: { data: formatarDataLocal(new Date()) }
        });
        expect((hoje.corpo as { totalSegundos: number }).totalSegundos).toBe(1200);
    });

    it("isola disciplinas e tarefas por conta e recusa tokens expirados ou inválidos", async () => {
        const proprietaria = await cadastrarUsuario("Proprietária dos dados");
        const outraConta = await cadastrarUsuario("Outra conta");
        const disciplina = await chamarHandler(disciplinas.criar, {
            token: proprietaria.token,
            body: { nome: "Física" }
        });
        expect(disciplina.status).toBe(201);

        const tarefa = await chamarHandler(tarefas.criar, {
            token: proprietaria.token,
            body: {
                disciplinaId: (disciplina.corpo as { id: string }).id,
                titulo: "Exercícios",
                descricao: "Tarefa privada da primeira conta.",
                dataPrazo: new Date(Date.now() + 86_400_000).toISOString(),
                dificuldade: 2,
                duracaoEstimada: 30,
                pesoAvaliacao: 0
            }
        });
        expect(tarefa.status).toBe(201);

        const tarefasDaOutraConta = await chamarHandler(tarefas.listar, { token: outraConta.token });
        expect(tarefasDaOutraConta.status).toBe(200);
        expect(tarefasDaOutraConta.corpo).toEqual([]);

        const disciplinasDaOutraConta = await chamarHandler(disciplinas.listar, { token: outraConta.token });
        expect(disciplinasDaOutraConta.corpo).toEqual([]);

        const tentativaComDisciplinaAlheia = await chamarHandler(tarefas.criar, {
            token: outraConta.token,
            body: {
                disciplinaId: (disciplina.corpo as { id: string }).id,
                titulo: "Não deve ser criada",
                descricao: "A disciplina pertence a outra conta.",
                dataPrazo: new Date(Date.now() + 86_400_000).toISOString(),
                dificuldade: 2,
                duracaoEstimada: 30,
                pesoAvaliacao: 0
            }
        });
        expect(tentativaComDisciplinaAlheia.status).toBe(404);

        const tokenInvalido = await chamarHandler(disciplinas.listar, { token: "token-invalido" });
        expect(tokenInvalido.status).toBe(401);
    });
});
