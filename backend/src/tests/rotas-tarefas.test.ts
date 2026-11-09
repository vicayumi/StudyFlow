import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    buscarPorToken: vi.fn(),
    listarTodas: vi.fn(),
    buscarDisciplina: vi.fn()
}));

vi.mock("../infrastructure/database/repositorio-autenticacao.js", () => ({
    RepositorioAutenticacao: class {
        buscarPorToken = mocks.buscarPorToken;
    }
}));

vi.mock("../infrastructure/database/repositorio-tarefas.js", () => ({
    RepositorioTarefas: class {
        listarTodas = mocks.listarTodas;
    }
}));

vi.mock("../infrastructure/database/repositorio-disciplinas.js", () => ({
    RepositorioDisciplinas: class {
        buscarPorId = mocks.buscarDisciplina;
    }
}));

import { ControladorTarefas } from "../http/controllers/controlador-tarefas.js";
import { autenticar } from "../http/middleware/autenticar.js";

function criarRequisicao(opcoes: {
    autorizacao?: string;
    corpo?: unknown;
} = {}): Request {
    return {
        get: vi.fn((nome: string) => nome.toLowerCase() === "authorization" ? opcoes.autorizacao : undefined),
        body: opcoes.corpo ?? {},
        query: {},
        params: {}
    } as unknown as Request;
}

function criarResposta(): Response {
    const resposta = {
        status: vi.fn(),
        json: vi.fn()
    } as unknown as Response;
    vi.mocked(resposta.status).mockReturnValue(resposta);
    return resposta;
}

describe("Middleware de autenticação e handlers de tarefas", () => {
    let controlador: ControladorTarefas;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.buscarPorToken.mockImplementation(async (token: string) =>
            token === "token-de-teste" ? { id: "usuario-de-teste" } : null
        );
        mocks.listarTodas.mockResolvedValue([]);
        controlador = new ControladorTarefas();
    });

    it("recusa a chamada sem autenticação e não consulta tarefas", async () => {
        const requisicao = criarRequisicao();
        const resposta = criarResposta();
        const proxima = vi.fn();

        await autenticar(requisicao, resposta, proxima);

        expect(resposta.status).toHaveBeenCalledWith(401);
        expect(resposta.json).toHaveBeenCalledWith({ erro: "Entre na sua conta para continuar." });
        expect(proxima).not.toHaveBeenCalled();
        expect(mocks.listarTodas).not.toHaveBeenCalled();
    });

    it("aceita token válido e lista tarefas da conta autenticada", async () => {
        const requisicao = criarRequisicao({ autorizacao: "Bearer token-de-teste" });
        const resposta = criarResposta();
        const proxima = vi.fn();

        await autenticar(requisicao, resposta, proxima);
        await controlador.listar(requisicao, resposta);

        expect(proxima).toHaveBeenCalledOnce();
        expect(requisicao.usuarioId).toBe("usuario-de-teste");
        expect(mocks.listarTodas).toHaveBeenCalledWith("usuario-de-teste");
        expect(resposta.json).toHaveBeenCalledWith([]);
    });

    it("retorna erro 400 para dados inválidos sem acessar o banco", async () => {
        const requisicao = criarRequisicao({ corpo: { titulo: "" } });
        const resposta = criarResposta();

        await controlador.criar(requisicao, resposta);

        expect(resposta.status).toHaveBeenCalledWith(400);
        expect(mocks.buscarDisciplina).not.toHaveBeenCalled();
    });
});
