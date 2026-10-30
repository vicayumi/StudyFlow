import { randomUUID } from "node:crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";

export interface HorarioDisponivel {
    id: string;
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
}

interface HorarioBanco extends RowDataPacket {
    id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
}

export interface DadosHorarioDisponivel {
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
}

export class RepositorioHorarios {
    public async listar(usuarioId: string): Promise<HorarioDisponivel[]> {
        const [linhas] = await conexao.execute<HorarioBanco[]>(
            `SELECT id, dia_semana, hora_inicio, hora_fim
             FROM horarios_disponiveis
             WHERE usuario_id = ?
             ORDER BY dia_semana, hora_inicio`,
            [usuarioId]
        );

        return linhas.map((linha) => this.converter(linha));
    }

    public async buscarPorId(id: string, usuarioId: string): Promise<HorarioDisponivel | null> {
        const [linhas] = await conexao.execute<HorarioBanco[]>(
            `SELECT id, dia_semana, hora_inicio, hora_fim
             FROM horarios_disponiveis
             WHERE id = ? AND usuario_id = ?`,
            [id, usuarioId]
        );

        return linhas.length > 0 ? this.converter(linhas[0]) : null;
    }

    public async criar(
        dados: DadosHorarioDisponivel,
        usuarioId: string
    ): Promise<HorarioDisponivel> {
        const horario = {
            id: randomUUID(),
            ...dados
        };

        await conexao.execute<ResultSetHeader>(
            `INSERT INTO horarios_disponiveis
                (id, usuario_id, dia_semana, hora_inicio, hora_fim)
             VALUES (?, ?, ?, ?, ?)`,
            [
                horario.id,
                usuarioId,
                horario.diaSemana,
                horario.horaInicio,
                horario.horaFim
            ]
        );

        return horario;
    }

    public async atualizar(
        id: string,
        dados: DadosHorarioDisponivel,
        usuarioId: string
    ): Promise<HorarioDisponivel | null> {
        const existente = await this.buscarPorId(id, usuarioId);

        if (!existente) {
            return null;
        }

        await conexao.execute<ResultSetHeader>(
            `UPDATE horarios_disponiveis
             SET dia_semana = ?, hora_inicio = ?, hora_fim = ?
             WHERE id = ? AND usuario_id = ?`,
            [dados.diaSemana, dados.horaInicio, dados.horaFim, id, usuarioId]
        );

        return { id, ...dados };
    }

    public async excluir(id: string, usuarioId: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            "DELETE FROM horarios_disponiveis WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );

        return resultado.affectedRows > 0;
    }

    private converter(linha: HorarioBanco): HorarioDisponivel {
        return {
            id: linha.id,
            diaSemana: linha.dia_semana,
            horaInicio: linha.hora_inicio.slice(0, 5),
            horaFim: linha.hora_fim.slice(0, 5)
        };
    }
}
