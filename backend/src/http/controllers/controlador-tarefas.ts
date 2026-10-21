
import { Request, Response } from "express";
import {
    RepositorioTarefas
} from "../../infrastructure/database/repositorio-tarefas.js";
import {
    RepositorioDisciplinas
} from "../../infrastructure/database/repositorio-disciplinas.js";

export class ControladorTarefas {
    private readonly repositorioTarefas = new RepositorioTarefas();
    private readonly repositorioDisciplinas = new RepositorioDisciplinas();

    public listar = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            const disciplinaId = requisicao.query.disciplinaId;

            if (disciplinaId !== undefined) {
                if (
                    typeof disciplinaId !== "string" ||
                    !disciplinaId.trim()
                ) {
                    resposta.status(400).json({
                        erro: "O identificador da disciplina é inválido."
                    });
                    return;
                }

                const disciplina =
                    await this.repositorioDisciplinas.buscarPorId(disciplinaId);

                if (!disciplina) {
                    resposta.status(404).json({
                        erro: "Disciplina não encontrada."
                    });
                    return;
                }

                const tarefas =
                    await this.repositorioTarefas.listarPorDisciplina(
                        disciplinaId
                    );

                resposta.json(tarefas);
                return;
            }

            const tarefas = await this.repositorioTarefas.listarTodas();
            resposta.json(tarefas);
        } catch {
            resposta.status(500).json({
                erro: "Erro ao listar tarefas."
            });
        }
    };

    public criar = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            const {
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            } = requisicao.body ?? {};

            const erroValidacao = this.validarDados({
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            });

            if (erroValidacao) {
                resposta.status(400).json({ erro: erroValidacao });
                return;
            }

            // O TypeScript não mantém a relação entre a validação
            // feita por validarDados e os tipos dos campos.
            // Por isso, validamos e tipamos os valores aqui.
            const dados = this.converterDadosValidos({
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            });

            if (!dados) {
                resposta.status(400).json({
                    erro: "Os dados da tarefa são inválidos."
                });
                return;
            }

            const disciplina =
                await this.repositorioDisciplinas.buscarPorId(
                    dados.disciplinaId
                );

            if (!disciplina) {
                resposta.status(404).json({
                    erro: "A disciplina selecionada não existe."
                });
                return;
            }

            const tarefa = await this.repositorioTarefas.criar(dados);

            resposta.status(201).json({
                ...tarefa,
                disciplinaId: dados.disciplinaId
            });
        } catch (erro) {
            if (erro instanceof Error) {
                resposta.status(400).json({ erro: erro.message });
                return;
            }

            resposta.status(500).json({
                erro: "Erro ao criar tarefa."
            });
        }
    };

    public editar = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            const id = this.obterId(requisicao);

            if (!id) {
                resposta.status(400).json({
                    erro: "O identificador da tarefa é inválido."
                });
                return;
            }

            const {
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            } = requisicao.body ?? {};

            const erroValidacao = this.validarDados({
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            });

            if (erroValidacao) {
                resposta.status(400).json({ erro: erroValidacao });
                return;
            }

            const dados = this.converterDadosValidos({
                disciplinaId,
                titulo,
                descricao,
                dataPrazo,
                dificuldade,
                duracaoEstimada,
                pesoAvaliacao
            });

            if (!dados) {
                resposta.status(400).json({
                    erro: "Os dados da tarefa são inválidos."
                });
                return;
            }

            const disciplina =
                await this.repositorioDisciplinas.buscarPorId(
                    dados.disciplinaId
                );

            if (!disciplina) {
                resposta.status(404).json({
                    erro: "A disciplina selecionada não existe."
                });
                return;
            }

            const editada = await this.repositorioTarefas.editar(id, dados);

            if (!editada) {
                resposta.status(404).json({
                    erro: "Tarefa não encontrada."
                });
                return;
            }

            resposta.json({
                mensagem: "Tarefa atualizada com sucesso."
            });
        } catch {
            resposta.status(500).json({
                erro: "Erro ao editar tarefa."
            });
        }
    };

    public concluir = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            const id = this.obterId(requisicao);

            if (!id) {
                resposta.status(400).json({
                    erro: "O identificador da tarefa é inválido."
                });
                return;
            }

            const concluida = await this.repositorioTarefas.concluir(id);

            if (!concluida) {
                resposta.status(404).json({
                    erro: "Tarefa não encontrada."
                });
                return;
            }

            resposta.json({
                mensagem: "Tarefa concluída com sucesso."
            });
        } catch {
            resposta.status(500).json({
                erro: "Erro ao concluir tarefa."
            });
        }
    };

    public excluir = async (
        requisicao: Request,
        resposta: Response
    ): Promise<void> => {
        try {
            const id = this.obterId(requisicao);

            if (!id) {
                resposta.status(400).json({
                    erro: "O identificador da tarefa é inválido."
                });
                return;
            }

            const excluida = await this.repositorioTarefas.excluir(id);

            if (!excluida) {
                resposta.status(404).json({
                    erro: "Tarefa não encontrada."
                });
                return;
            }

            resposta.status(204).send();
        } catch {
            resposta.status(500).json({
                erro: "Erro ao excluir tarefa."
            });
        }
    };

    private obterId(requisicao: Request): string | null {
        const id: unknown = requisicao.params.id;

        if (typeof id !== "string" || !id.trim()) {
            return null;
        }

        return id;
    }

    private validarDados(dados: {
        disciplinaId: unknown;
        titulo: unknown;
        descricao: unknown;
        dataPrazo: unknown;
        dificuldade: unknown;
        duracaoEstimada: unknown;
        pesoAvaliacao: unknown;
    }): string | null {
        const {
            disciplinaId,
            titulo,
            descricao,
            dataPrazo,
            dificuldade,
            duracaoEstimada,
            pesoAvaliacao
        } = dados;

        if (
            typeof disciplinaId !== "string" ||
            !disciplinaId.trim()
        ) {
            return "Selecione uma disciplina.";
        }

        if (typeof titulo !== "string" || !titulo.trim()) {
            return "O título da tarefa é obrigatório.";
        }

        if (descricao !== undefined && typeof descricao !== "string") {
            return "A descrição deve ser um texto.";
        }

        if (typeof dataPrazo !== "string" || !dataPrazo.trim()) {
            return "Informe o prazo da tarefa.";
        }

        if (Number.isNaN(new Date(dataPrazo).getTime())) {
            return "A data do prazo é inválida.";
        }

        if (
            typeof dificuldade !== "number" ||
            !Number.isInteger(dificuldade) ||
            dificuldade < 1 ||
            dificuldade > 5
        ) {
            return "A dificuldade deve ser um número inteiro entre 1 e 5.";
        }

        if (
            typeof duracaoEstimada !== "number" ||
            !Number.isFinite(duracaoEstimada) ||
            duracaoEstimada <= 0
        ) {
            return "A duração estimada deve ser maior que zero.";
        }

        if (
            typeof pesoAvaliacao !== "number" ||
            !Number.isFinite(pesoAvaliacao) ||
            pesoAvaliacao < 0 ||
            pesoAvaliacao > 100
        ) {
            return "O peso da avaliação deve estar entre 0 e 100.";
        }

        return null;
    }

    private converterDadosValidos(dados: {
        disciplinaId: unknown;
        titulo: unknown;
        descricao: unknown;
        dataPrazo: unknown;
        dificuldade: unknown;
        duracaoEstimada: unknown;
        pesoAvaliacao: unknown;
    }): {
        disciplinaId: string;
        titulo: string;
        descricao: string;
        dataPrazo: Date;
        dificuldade: number;
        duracaoEstimada: number;
        pesoAvaliacao: number;
    } | null {
        if (
            typeof dados.disciplinaId !== "string" ||
            typeof dados.titulo !== "string" ||
            (dados.descricao !== undefined &&
                typeof dados.descricao !== "string") ||
            typeof dados.dataPrazo !== "string" ||
            typeof dados.dificuldade !== "number" ||
            typeof dados.duracaoEstimada !== "number" ||
            typeof dados.pesoAvaliacao !== "number"
        ) {
            return null;
        }

        const data = new Date(dados.dataPrazo);

        if (Number.isNaN(data.getTime())) {
            return null;
        }

        return {
            disciplinaId: dados.disciplinaId,
            titulo: dados.titulo,
            descricao: dados.descricao ?? "",
            dataPrazo: data,
            dificuldade: dados.dificuldade,
            duracaoEstimada: dados.duracaoEstimada,
            pesoAvaliacao: dados.pesoAvaliacao
        };
    }
}
