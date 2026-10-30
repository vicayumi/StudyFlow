import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";

export interface SessaoRealizada {
    id: string;
    tarefaId: string;
    titulo: string;
    inicio: string;
    fim: string;
    duracaoMinutos: number;
    duracaoSegundos: number;
    tipo: "pomodoro" | "manual" | "cronometro" | "planejada";
    atividade?: string | null;
    planoSessaoId?: string | null;
}

interface SessaoBanco extends RowDataPacket {
    id: string;
    tarefa_id: string;
    titulo: string;
    inicio: Date;
    fim: Date;
    duracao_segundos: number;
    tipo: SessaoRealizada["tipo"];
    plano_sessao_id: string | null;
    atividade: string | null;
}

export class RepositorioSessoesEstudo {
    public async resumoPeriodo(periodo: "semana" | "mes", usuarioId: string): Promise<{
        totalSegundos: number;
        dias: { data: string; totalSegundos: number }[];
    }> {
        const hoje = new Date();
        const inicio = periodo === "semana"
            ? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6)
            : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
        const formatar = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
        const [linhas] = await conexao.execute<Array<RowDataPacket & { data: string | Date; totalSegundos: number }>>(
            `SELECT DATE(inicio) AS data, SUM(duracao_segundos) AS totalSegundos
             FROM sessoes_estudo_realizadas
             WHERE usuario_id = ? AND inicio >= ? AND inicio < ?
             GROUP BY DATE(inicio) ORDER BY DATE(inicio)`,
            [usuarioId, `${formatar(inicio)} 00:00:00`, `${formatar(fimAmanha)} 00:00:00`]
        );
        const totais = new Map(linhas.map((linha) => [
            linha.data instanceof Date ? formatar(linha.data) : String(linha.data).slice(0, 10),
            Number(linha.totalSegundos)
        ]));
        const numeroDias = periodo === "semana" ? 7 : hoje.getDate();
        const dias = Array.from({ length: numeroDias }, (_, indice) => {
            const dia = periodo === "semana"
                ? new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice)
                : new Date(hoje.getFullYear(), hoje.getMonth(), indice + 1);
            const data = formatar(dia);
            return { data, totalSegundos: totais.get(data) ?? 0 };
        });
        return { totalSegundos: dias.reduce((total, dia) => total + dia.totalSegundos, 0), dias };
    }

    public async listarIdsPlanejadosConcluidos(usuarioId: string): Promise<string[]> {
        const [linhas] = await conexao.execute<RowDataPacket[]>(
            "SELECT plano_sessao_id FROM sessoes_estudo_realizadas WHERE usuario_id = ? AND plano_sessao_id IS NOT NULL",
            [usuarioId]
        );
        return linhas.map((linha) => String(linha.plano_sessao_id));
    }

    public async registrar(dados: {
        tarefaId: string; inicio: Date; fim: Date; duracaoSegundos: number;
        tipo: SessaoRealizada["tipo"]; planoSessaoId?: string; atividade?: string;
    }, usuarioId: string): Promise<SessaoRealizada> {
        const id = randomUUID();
        const conn = await conexao.getConnection();
        try {
            await conn.beginTransaction();
            const [tarefas] = await conn.execute<RowDataPacket[]>(
                "SELECT id, tempo_estudado FROM tarefas WHERE id = ? AND usuario_id = ? FOR UPDATE",
                [dados.tarefaId, usuarioId]
            );
            if (tarefas.length === 0) throw new Error("Tarefa não encontrada na sua conta.");
            if (dados.planoSessaoId) {
                const [existente] = await conn.execute<RowDataPacket[]>(
                    "SELECT id FROM sessoes_estudo_realizadas WHERE usuario_id = ? AND plano_sessao_id = ?",
                    [usuarioId, dados.planoSessaoId]
                );
                if (existente.length) throw new Error("Essa sessão já foi marcada como concluída.");
            }
            await conn.execute<ResultSetHeader>(
                `INSERT INTO sessoes_estudo_realizadas
                    (id, usuario_id, tarefa_id, plano_sessao_id, inicio, fim, duracao_segundos, tipo, atividade)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, usuarioId, dados.tarefaId, dados.planoSessaoId ?? null, dados.inicio,
                    dados.fim, dados.duracaoSegundos, dados.tipo, dados.atividade ?? null]
            );
            await conn.execute(
                "UPDATE tarefas SET tempo_estudado = LEAST(duracao_estimada, tempo_estudado + ?) WHERE id = ? AND usuario_id = ?",
                [Math.floor(dados.duracaoSegundos / 60), dados.tarefaId, usuarioId]
            );
            await conn.commit();
            const [linhas] = await conexao.execute<SessaoBanco[]>(
                `SELECT s.id, s.tarefa_id, t.titulo, s.inicio, s.fim,
                        s.duracao_segundos, s.tipo, s.plano_sessao_id, s.atividade
                 FROM sessoes_estudo_realizadas s JOIN tarefas t ON t.id = s.tarefa_id
                 WHERE s.id = ?`, [id]
            );
            return this.converter(linhas[0]);
        } catch (erro) {
            await conn.rollback();
            throw erro;
        } finally {
            conn.release();
        }
    }

    public async listarDoDia(data: string, usuarioId: string): Promise<SessaoRealizada[]> {
        const [linhas] = await conexao.execute<SessaoBanco[]>(
            `SELECT s.id, s.tarefa_id, t.titulo, s.inicio, s.fim,
                    s.duracao_segundos, s.tipo, s.plano_sessao_id, s.atividade
             FROM sessoes_estudo_realizadas s JOIN tarefas t ON t.id = s.tarefa_id
             WHERE s.usuario_id = ? AND s.inicio >= ? AND s.inicio < DATE_ADD(?, INTERVAL 1 DAY)
             ORDER BY s.inicio`, [usuarioId, `${data} 00:00:00`, `${data} 00:00:00`]
        );
        return linhas.map((linha) => this.converter(linha));
    }

    public async listarConcluidas(usuarioId: string): Promise<SessaoRealizada[]> {
        const [planos] = await conexao.execute<RowDataPacket[]>(
            "SELECT sessoes FROM planos_semanais WHERE usuario_id = ?", [usuarioId]
        );
        const concluidas = new Set<string>();
        for (const linha of planos) {
            const sessoes = typeof linha.sessoes === "string" ? JSON.parse(linha.sessoes) as { id: string }[] : linha.sessoes as { id: string }[];
            for (const sessao of sessoes) concluidas.add(sessao.id);
        }
        if (!concluidas.size) return [];
        const [linhas] = await conexao.execute<SessaoBanco[]>(
            `SELECT s.id, s.tarefa_id, t.titulo, s.inicio, s.fim, s.duracao_segundos, s.tipo, s.plano_sessao_id, s.atividade
             FROM sessoes_estudo_realizadas s JOIN tarefas t ON t.id = s.tarefa_id
             WHERE s.usuario_id = ? AND s.plano_sessao_id IS NOT NULL ORDER BY s.inicio DESC`, [usuarioId]
        );
        return linhas.filter((linha) => concluidas.has(linha.id)).map((linha) => this.converter(linha));
    }

    private converter(linha: SessaoBanco): SessaoRealizada {
        return {
            id: linha.id, tarefaId: linha.tarefa_id, titulo: linha.titulo,
            inicio: new Date(linha.inicio).toISOString(), fim: new Date(linha.fim).toISOString(),
            duracaoMinutos: Math.floor(linha.duracao_segundos / 60), duracaoSegundos: linha.duracao_segundos, tipo: linha.tipo
            , planoSessaoId: linha.plano_sessao_id, atividade: linha.atividade
        };
    }
}
