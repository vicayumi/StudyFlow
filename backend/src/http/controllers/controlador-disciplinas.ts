
import { Request, Response } from "express";
import { RepositorioDisciplinas } from "../../infrastructure/database/repositorio-disciplinas.js";

export class ControladorDisciplinas {
    private readonly repositorio = new RepositorioDisciplinas();

    public listar = async (_requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const disciplinas = await this.repositorio.listar();
            resposta.json(disciplinas);
        } catch {
            resposta.status(500).json({
                erro: "Erro ao listar disciplinas."
            });
        }
    };

    public buscarPorId = async (requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const disciplina = await this.repositorio.buscarPorId(
                requisicao.params.id as string
            );

            if (!disciplina) {
                resposta.status(404).json({
                    erro: "Disciplina não encontrada."
                });
                return;
            }

            resposta.json(disciplina);
        } catch {
            resposta.status(500).json({
                erro: "Erro ao buscar disciplina."
            });
        }
    };

    public criar = async (requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const { nome, cor } = requisicao.body;

            if (typeof nome !== "string" || !nome.trim()) {
                resposta.status(400).json({
                    erro: "O nome da disciplina é obrigatório."
                });
                return;
            }

            if (
                cor !== undefined &&
                (typeof cor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(cor))
            ) {
                resposta.status(400).json({
                    erro: "A cor deve estar no formato hexadecimal, como #8B5CF6."
                });
                return;
            }

            const disciplina = await this.repositorio.criar(nome, cor);
            resposta.status(201).json(disciplina);
        } catch (erro) {
            if (erro instanceof Error) {
                resposta.status(400).json({ erro: erro.message });
                return;
            }

            resposta.status(500).json({
                erro: "Erro ao criar disciplina."
            });
        }
    };

    public atualizar = async (requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const { nome, cor } = requisicao.body;
            const id = requisicao.params.id as string;

            if (
                nome !== undefined &&
                (typeof nome !== "string" || !nome.trim())
            ) {
                resposta.status(400).json({
                    erro: "O nome deve ser um texto não vazio."
                });
                return;
            }

            if (
                cor !== undefined &&
                (typeof cor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(cor))
            ) {
                resposta.status(400).json({
                    erro: "A cor deve estar no formato hexadecimal, como #8B5CF6."
                });
                return;
            }

            if (nome === undefined && cor === undefined) {
                resposta.status(400).json({
                    erro: "Informe o nome ou a cor para atualizar."
                });
                return;
            }

            const disciplina = await this.repositorio.atualizar(id, { nome, cor });

            if (!disciplina) {
                resposta.status(404).json({
                    erro: "Disciplina não encontrada."
                });
                return;
            }

            resposta.json(disciplina);
        } catch (erro) {
            if (erro instanceof Error) {
                resposta.status(400).json({ erro: erro.message });
                return;
            }

            resposta.status(500).json({
                erro: "Erro ao atualizar disciplina."
            });
        }
    };

    public excluir = async (requisicao: Request, resposta: Response): Promise<void> => {
        try {
            const excluida = await this.repositorio.excluir(
                requisicao.params.id as string
            );

            if (!excluida) {
                resposta.status(404).json({
                    erro: "Disciplina não encontrada."
                });
                return;
            }

            resposta.status(204).send();
        } catch {
            resposta.status(500).json({
                erro: "Erro ao excluir disciplina. Verifique se existem tarefas vinculadas."
            });
        }
    };
}
