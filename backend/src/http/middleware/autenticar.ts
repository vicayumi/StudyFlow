import type { NextFunction, Request, Response } from "express";
import { RepositorioAutenticacao } from "../../infrastructure/database/repositorio-autenticacao.js";

declare global {
    namespace Express {
        interface Request {
            usuarioId?: string;
        }
    }
}

const repositorio = new RepositorioAutenticacao();

export async function autenticar(requisicao: Request, resposta: Response, proxima: NextFunction): Promise<void> {
    const cabecalho = requisicao.get("authorization");
    const token = cabecalho?.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
    if (!token) {
        resposta.status(401).json({ erro: "Entre na sua conta para continuar." });
        return;
    }

    try {
        const usuario = await repositorio.buscarPorToken(token);
        if (!usuario) {
            resposta.status(401).json({ erro: "Sua sessão expirou. Entre novamente." });
            return;
        }
        requisicao.usuarioId = usuario.id;
        proxima();
    } catch (erro) {
        proxima(erro);
    }
}
