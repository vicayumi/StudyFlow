import type { Request, Response } from "express";
import { RepositorioSessoesEstudo } from "../../infrastructure/database/repositorio-sessoes-estudo.js";

export class ControladorSessoesEstudo {
    private readonly repositorio = new RepositorioSessoesEstudo();

    public listarDia = async (req: Request, res: Response): Promise<void> => {
        const data = typeof req.query.data === "string" ? req.query.data : this.hojeLocal();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            res.status(400).json({ erro: "Informe uma data válida." });
            return;
        }
        try {
            const sessoes = await this.repositorio.listarDoDia(data, req.usuarioId!);
            res.json({ sessoes, totalSegundos: sessoes.reduce((total, sessao) => total + sessao.duracaoSegundos, 0) });
        } catch {
            res.status(500).json({ erro: "Não foi possível carregar seus estudos de hoje." });
        }
    };

    public resumoPeriodo = async (req: Request, res: Response): Promise<void> => {
        const periodo = req.query.periodo;
        if (periodo !== "semana" && periodo !== "mes") {
            res.status(400).json({ erro: "Selecione semana ou mês." });
            return;
        }
        try {
            res.json(await this.repositorio.resumoPeriodo(periodo, req.usuarioId!));
        } catch {
            res.status(500).json({ erro: "Não foi possível carregar o resumo de estudo." });
        }
    };

    public concluirPlanejada = async (req: Request, res: Response): Promise<void> => {
        const { tarefaId, inicio, fim, duracaoMinutos, planoSessaoId } = req.body ?? {};
        if (typeof tarefaId !== "string" || !tarefaId.trim() ||
            typeof inicio !== "string" || Number.isNaN(Date.parse(inicio)) ||
            typeof fim !== "string" || Number.isNaN(Date.parse(fim)) ||
            typeof duracaoMinutos !== "number" || !Number.isInteger(duracaoMinutos) || duracaoMinutos < 1 ||
            typeof planoSessaoId !== "string" || !planoSessaoId.trim()) {
            res.status(400).json({ erro: "Os dados da sessão planejada são inválidos." });
            return;
        }
        try {
            const sessao = await this.repositorio.registrar({ tarefaId, inicio: new Date(inicio), fim: new Date(fim), duracaoSegundos: duracaoMinutos * 60, tipo: "planejada", planoSessaoId }, req.usuarioId!);
            res.status(201).json(sessao);
        } catch (erro) {
            res.status(400).json({ erro: erro instanceof Error ? erro.message : "Não foi possível concluir a sessão." });
        }
    };

    public registrarEstudo = async (req: Request, res: Response): Promise<void> => {
        const { tarefaId, duracaoSegundos, tipo, atividade } = req.body ?? {};
        if (typeof tarefaId !== "string" || !tarefaId.trim() ||
            typeof duracaoSegundos !== "number" || !Number.isInteger(duracaoSegundos) || duracaoSegundos < 1 || duracaoSegundos > 43_200 ||
            (tipo !== "pomodoro" && tipo !== "manual" && tipo !== "cronometro") ||
            (atividade !== undefined && (typeof atividade !== "string" || atividade.length > 100))) {
            res.status(400).json({ erro: "Informe a tarefa, uma duração válida e o tipo de sessão." });
            return;
        }
        const fim = new Date();
        const inicio = new Date(fim.getTime() - duracaoSegundos * 1000);
        try {
            res.status(201).json(await this.repositorio.registrar({ tarefaId, inicio, fim, duracaoSegundos, tipo, atividade }, req.usuarioId!));
        } catch (erro) {
            res.status(400).json({ erro: erro instanceof Error ? erro.message : "Não foi possível registrar o estudo." });
        }
    };

    private hojeLocal(): string {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    }
}
