import { randomUUID } from "node:crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";
import { Tarefa, type EstadoTarefa } from "../../domain/entities/tarefa.js";

interface TarefaBanco extends RowDataPacket {
    id: string;
    disciplina_id: string;
    titulo: string;
    descricao: string | null;
    data_prazo: Date;
    dificuldade: number;
    duracao_estimada: number;
    tempo_estudado: number;
    peso_avaliacao: number;
    estado: string;
}

export interface DadosNovaTarefa {
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: Date;
    dificuldade: number;
    duracaoEstimada: number;
    pesoAvaliacao: number;
}

export interface DadosEdicaoTarefa {
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: Date;
    dificuldade: number;
    duracaoEstimada: number;
    pesoAvaliacao: number;
}

export interface TarefaComDisciplina {
    id: string;
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: Date;
    dificuldade: number;
    duracaoEstimada: number;
    tempoEstudado: number;
    pesoAvaliacao: number;
    estado: EstadoTarefa;
}

export class RepositorioTarefas {
    private converterParaTarefa(
        linha: TarefaBanco
    ): TarefaComDisciplina {
        const tarefa = new Tarefa(
            linha.id,
            linha.titulo,
            linha.descricao ?? "",
            new Date(linha.data_prazo),
            linha.dificuldade,
            linha.duracao_estimada,
            Number(linha.peso_avaliacao)
        );

        if (linha.tempo_estudado > 0) {
            tarefa.registrarTempoEstudado(linha.tempo_estudado);
        }

        const estado: EstadoTarefa =
            linha.estado === "concluida" ? "concluida" : "pendente";

        if (estado === "concluida") {
            tarefa.concluir();
        }

        return {
            id: tarefa.id,
            disciplinaId: linha.disciplina_id,
            titulo: tarefa.titulo,
            descricao: tarefa.descricao,
            dataPrazo: tarefa.dataPrazo,
            dificuldade: tarefa.dificuldade,
            duracaoEstimada: tarefa.duracaoEstimada,
            tempoEstudado: tarefa.obterTempoEstudado(),
            pesoAvaliacao: tarefa.pesoAvaliacao,
            estado
        };
    }

    public async listarPorDisciplina(
        disciplinaId: string,
        usuarioId: string
    ): Promise<TarefaComDisciplina[]> {
        const [linhas] = await conexao.execute<TarefaBanco[]>(
            `SELECT id, disciplina_id, titulo, descricao, data_prazo,
                    dificuldade, duracao_estimada, tempo_estudado,
                    peso_avaliacao, estado
             FROM tarefas
             WHERE disciplina_id = ? AND usuario_id = ?
             ORDER BY data_prazo`,
            [disciplinaId, usuarioId]
        );

        return linhas.map((linha) => this.converterParaTarefa(linha));
    }

    public async listarTodas(usuarioId: string): Promise<TarefaComDisciplina[]> {
        const [linhas] = await conexao.execute<TarefaBanco[]>(
            `SELECT id, disciplina_id, titulo, descricao, data_prazo,
                    dificuldade, duracao_estimada, tempo_estudado,
                    peso_avaliacao, estado
             FROM tarefas
             WHERE usuario_id = ?
             ORDER BY data_prazo`,
            [usuarioId]
        );

        return linhas.map((linha) => this.converterParaTarefa(linha));
    }

    public async criar(dados: DadosNovaTarefa, usuarioId: string): Promise<Tarefa> {
        const id = randomUUID();

        const tarefa = new Tarefa(
            id,
            dados.titulo.trim(),
            dados.descricao.trim(),
            dados.dataPrazo,
            dados.dificuldade,
            dados.duracaoEstimada,
            dados.pesoAvaliacao
        );

        await conexao.execute<ResultSetHeader>(
            `INSERT INTO tarefas
                (id, usuario_id, disciplina_id, titulo, descricao, data_prazo,
                 dificuldade, duracao_estimada, tempo_estudado,
                 peso_avaliacao, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pendente')`,
            [
                tarefa.id,
                usuarioId,
                dados.disciplinaId,
                tarefa.titulo,
                tarefa.descricao,
                tarefa.dataPrazo,
                tarefa.dificuldade,
                tarefa.duracaoEstimada,
                tarefa.pesoAvaliacao
            ]
        );

        return tarefa;
    }
    public async editar(
        id: string,
        dados: DadosEdicaoTarefa,
        usuarioId: string
    ): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            `UPDATE tarefas
            SET disciplina_id = ?,
                titulo = ?,
                descricao = ?,
                data_prazo = ?,
                dificuldade = ?,
                duracao_estimada = ?,
                peso_avaliacao = ?
            WHERE id = ? AND usuario_id = ?`,
            [
                dados.disciplinaId,
                dados.titulo.trim(),
                dados.descricao.trim(),
                dados.dataPrazo,
                dados.dificuldade,
                dados.duracaoEstimada,
                dados.pesoAvaliacao,
                id,
                usuarioId
            ]
        );

        if (resultado.affectedRows > 0) {
            return true;
        }

        const [tarefasEncontradas] = await conexao.execute<RowDataPacket[]>(
            "SELECT id FROM tarefas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );

        return tarefasEncontradas.length > 0;
    }

    public async concluir(id: string, usuarioId: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            `UPDATE tarefas
            SET estado = 'concluida'
            WHERE id = ? AND usuario_id = ? AND estado <> 'concluida'`,
            [id, usuarioId]
        );

        if (resultado.affectedRows > 0) {
            return true;
        }

        const [linhas] = await conexao.execute<TarefaBanco[]>(
            `SELECT id FROM tarefas
            WHERE id = ? AND usuario_id = ? AND estado = 'concluida'`,
            [id, usuarioId]
        );

        return linhas.length > 0;
    }

    public async reabrir(id: string, usuarioId: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            `UPDATE tarefas
             SET estado = 'pendente'
             WHERE id = ? AND usuario_id = ? AND estado <> 'pendente'`,
            [id, usuarioId]
        );

        if (resultado.affectedRows > 0) {
            return true;
        }

        const [linhas] = await conexao.execute<TarefaBanco[]>(
            "SELECT id FROM tarefas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );

        return linhas.length > 0;
    }

    public async excluir(id: string, usuarioId: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            `DELETE FROM tarefas WHERE id = ? AND usuario_id = ?`,
            [id, usuarioId]
        );

        return resultado.affectedRows > 0;
    }
}
