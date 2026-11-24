import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";
import type { HorarioDisponivel } from "./repositorio-horarios.js";

export interface SessaoPlanoSalva {
    id: string;
    tarefaId: string;
    titulo: string;
    inicio: string;
    fim: string;
    duracaoMinutos: number;
    prioridade: number;
    explicacaoPrioridade: string;
}

export interface PrioridadePlanoSalva {
    tarefaId: string;
    titulo: string;
    prioridade: number;
    explicacao: string;
}

export interface DadosPlanoSalvo {
    dataInicio: string;
    estrategia: string;
    sessoes: SessaoPlanoSalva[];
    prioridades: PrioridadePlanoSalva[];
    tarefasSemTempo: { id: string; titulo: string; diasAtraso?: number }[];
    ajusteEstimativa?: { tarefasConcluidasUsadas: number; fator: number; adaptacaoAtiva: boolean };
}

export interface ItemHistoricoPlano {
    id: string;
    dataInicio: string;
    estrategia: string;
    criadoEm: string;
    totalSessoes: number;
    sessoes: SessaoPlanoSalva[];
    prioridades: PrioridadePlanoSalva[];
    tarefasSemTempo: { id: string; titulo: string; diasAtraso?: number }[];
    ajusteEstimativa?: { tarefasConcluidasUsadas: number; fator: number; adaptacaoAtiva: boolean };
}

interface PlanoBanco extends RowDataPacket {
    id: string;
    data_inicio: string | Date;
    estrategia: string;
    sessoes: string | SessaoPlanoSalva[];
    prioridades: string | PrioridadePlanoSalva[];
    tarefas_sem_tempo: string | { id: string; titulo: string; diasAtraso?: number }[];
    fator_estimativa?: number;
    tarefas_estimativa?: number;
}

function decodificar<T>(valor: string | T): T {
    return typeof valor === "string" ? JSON.parse(valor) as T : valor;
}

function chaveDataLocal(valor: string): string {
    const data = new Date(valor);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

export class RepositorioPlanos {
    public async salvar(dados: DadosPlanoSalvo, usuarioId: string): Promise<void> {
        const ajuste = dados.ajusteEstimativa ?? { fator: 1, tarefasConcluidasUsadas: 0, adaptacaoAtiva: false };
        const conn = await conexao.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute<ResultSetHeader>(
            `INSERT INTO planos_semanais
                (id, usuario_id, data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo, fator_estimativa, tarefas_estimativa)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                id = VALUES(id), estrategia = VALUES(estrategia),
                sessoes = VALUES(sessoes), prioridades = VALUES(prioridades),
                tarefas_sem_tempo = VALUES(tarefas_sem_tempo), fator_estimativa = VALUES(fator_estimativa),
                tarefas_estimativa = VALUES(tarefas_estimativa), criado_em = CURRENT_TIMESTAMP`,
            [randomUUID(), usuarioId, dados.dataInicio, dados.estrategia,
                JSON.stringify(dados.sessoes), JSON.stringify(dados.prioridades), JSON.stringify(dados.tarefasSemTempo), ajuste.fator, ajuste.tarefasConcluidasUsadas]
        );
        await conn.execute<ResultSetHeader>(
            `INSERT INTO historico_planejamentos
                (id, usuario_id, data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo, fator_estimativa, tarefas_estimativa)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [randomUUID(), usuarioId, dados.dataInicio, dados.estrategia,
                JSON.stringify(dados.sessoes), JSON.stringify(dados.prioridades), JSON.stringify(dados.tarefasSemTempo), ajuste.fator, ajuste.tarefasConcluidasUsadas]
        );
            await conn.commit();
        } catch (erro) {
            await conn.rollback();
            throw erro;
        } finally { conn.release(); }
    }

    public async listarHistorico(usuarioId: string): Promise<ItemHistoricoPlano[]> {
        const [linhas] = await conexao.execute<Array<RowDataPacket & {
            id: string; data_inicio: string | Date; estrategia: string; sessoes: string | SessaoPlanoSalva[];
            prioridades: string | PrioridadePlanoSalva[]; tarefas_sem_tempo: string | { id: string; titulo: string; diasAtraso?: number }[];
            criado_em: Date; fator_estimativa: number; tarefas_estimativa: number;
        }>>(
            `SELECT id, data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo, criado_em, fator_estimativa, tarefas_estimativa
             FROM historico_planejamentos WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 50`, [usuarioId]
        );
        return linhas.map((linha) => ({
            id: linha.id,
            dataInicio: linha.data_inicio instanceof Date
                ? `${linha.data_inicio.getFullYear()}-${String(linha.data_inicio.getMonth() + 1).padStart(2, "0")}-${String(linha.data_inicio.getDate()).padStart(2, "0")}`
                : String(linha.data_inicio).slice(0, 10),
            estrategia: linha.estrategia,
            criadoEm: new Date(linha.criado_em).toISOString(),
            sessoes: decodificar(linha.sessoes),
            prioridades: decodificar(linha.prioridades),
            tarefasSemTempo: decodificar(linha.tarefas_sem_tempo),
            ajusteEstimativa: { fator: Number(linha.fator_estimativa), tarefasConcluidasUsadas: Number(linha.tarefas_estimativa), adaptacaoAtiva: Number(linha.tarefas_estimativa) >= 3 },
            totalSessoes: decodificar<SessaoPlanoSalva[]>(linha.sessoes).length
        }));
    }

    public async buscarHistorico(id: string, usuarioId: string): Promise<DadosPlanoSalvo | null> {
        const [linhas] = await conexao.execute<Array<RowDataPacket & PlanoBanco>>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo, fator_estimativa, tarefas_estimativa
             FROM historico_planejamentos WHERE id = ? AND usuario_id = ? LIMIT 1`, [id, usuarioId]
        );
        return linhas[0] ? this.converter(linhas[0]) : null;
    }

    public async excluirHistorico(usuarioId: string, ids?: string[]): Promise<void> {
        if (ids === undefined) {
            await conexao.execute<ResultSetHeader>("DELETE FROM historico_planejamentos WHERE usuario_id = ?", [usuarioId]);
            return;
        }
        if (ids.length === 0) return;
        const lugares = ids.map(() => "?").join(", ");
        await conexao.execute<ResultSetHeader>(
            `DELETE FROM historico_planejamentos WHERE usuario_id = ? AND id IN (${lugares})`,
            [usuarioId, ...ids]
        );
    }

    public async moverSessao(id: string, inicio: Date, horarios: HorarioDisponivel[], usuarioId: string): Promise<SessaoPlanoSalva | null> {
        const conn = await conexao.getConnection();
        try {
            await conn.beginTransaction();
            const [linhas] = await conn.execute<Array<RowDataPacket & PlanoBanco & { id: string }>>(
                `SELECT id, data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo
                 FROM planos_semanais WHERE usuario_id = ? ORDER BY data_inicio FOR UPDATE`, [usuarioId]
            );
            const planos = linhas.map((linha) => ({ id: linha.id, dados: this.converter(linha) }));
            for (const plano of planos) {
                const sessao = plano.dados.sessoes.find((item) => item.id === id);
                if (!sessao) continue;
                const duracaoMs = new Date(sessao.fim).getTime() - new Date(sessao.inicio).getTime();
                const fim = new Date(inicio.getTime() + duracaoMs);
                const minutos = (data: Date) => data.getHours() * 60 + data.getMinutes();
                const horarioValido = horarios.some((horario) => {
                    if (horario.diaSemana !== inicio.getDay()) return false;
                    const [horaInicio, minutoInicio] = horario.horaInicio.split(":").map(Number);
                    const [horaFim, minutoFim] = horario.horaFim.split(":").map(Number);
                    return minutos(inicio) >= horaInicio * 60 + minutoInicio && minutos(fim) <= horaFim * 60 + minutoFim;
                });
                if (!horarioValido) throw new Error("Escolha um horário que caiba em um dos seus períodos disponíveis.");
                const colisao = planos.some((outroPlano) => outroPlano.dados.sessoes.some((outra) =>
                    outra.id !== id && new Date(outra.inicio).getTime() < fim.getTime() && new Date(outra.fim).getTime() > inicio.getTime()
                ));
                if (colisao) throw new Error("Esse horário se sobrepõe a outra sessão planejada.");
                sessao.inicio = inicio.toISOString();
                sessao.fim = fim.toISOString();
                plano.dados.sessoes.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
                await conn.execute<ResultSetHeader>(
                    `UPDATE planos_semanais SET sessoes = ? WHERE id = ? AND usuario_id = ?`,
                    [JSON.stringify(plano.dados.sessoes), plano.id, usuarioId]
                );
                await conn.commit();
                return sessao;
            }
            await conn.commit();
            return null;
        } catch (erro) {
            await conn.rollback();
            throw erro;
        } finally { conn.release(); }
    }

    public async buscarSemana(dataInicio: string, usuarioId: string): Promise<DadosPlanoSalvo | null> {
        const [linhas] = await conexao.execute<PlanoBanco[]>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo, fator_estimativa, tarefas_estimativa
             FROM planos_semanais WHERE usuario_id = ? AND data_inicio = ? LIMIT 1`,
            [usuarioId, dataInicio]
        );
        return linhas[0] ? this.converter(linhas[0]) : null;
    }

    public async listarSessoesDoMes(ano: number, mes: number, usuarioId: string): Promise<SessaoPlanoSalva[]> {
        const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
        const [linhas] = await conexao.execute<PlanoBanco[]>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo
             FROM planos_semanais WHERE usuario_id = ? ORDER BY data_inicio DESC`,
            [usuarioId]
        );

        return linhas.flatMap((linha) => this.converter(linha).sessoes)
            .filter((sessao) => chaveDataLocal(sessao.inicio).slice(0, 7) === inicioMes.slice(0, 7));
    }

    public async resumoPlanejado(periodo: "hoje" | "semana" | "mes", usuarioId: string): Promise<{
        totalMinutos: number;
        dias: { data: string; totalMinutos: number }[];
    }> {
        const hoje = new Date();
        const inicio = periodo === "mes"
            ? new Date(hoje.getFullYear(), hoje.getMonth(), 1)
            : new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (periodo === "semana" ? 6 : 0));
        const fimAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
        const formatar = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
        const [linhas] = await conexao.execute<PlanoBanco[]>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo
             FROM planos_semanais WHERE usuario_id = ? ORDER BY data_inicio DESC`,
            [usuarioId]
        );
        const inicioChave = formatar(inicio);
        const fimChave = formatar(fimAmanha);
        const totais = new Map<string, number>();
        for (const linha of linhas) {
            for (const sessao of this.converter(linha).sessoes) {
                const data = chaveDataLocal(sessao.inicio);
                if (data >= inicioChave && data < fimChave) {
                    totais.set(data, (totais.get(data) ?? 0) + sessao.duracaoMinutos);
                }
            }
        }
        const numeroDias = periodo === "semana" ? 7 : periodo === "hoje" ? 1 : hoje.getDate();
        const dias = Array.from({ length: numeroDias }, (_, indice) => {
            const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
            const data = formatar(dia);
            return { data, totalMinutos: totais.get(data) ?? 0 };
        });
        return { totalMinutos: dias.reduce((total, dia) => total + dia.totalMinutos, 0), dias };
    }

    private converter(linha: PlanoBanco): DadosPlanoSalvo {
        const dataInicio = linha.data_inicio instanceof Date
            ? `${linha.data_inicio.getFullYear()}-${String(linha.data_inicio.getMonth() + 1).padStart(2, "0")}-${String(linha.data_inicio.getDate()).padStart(2, "0")}`
            : String(linha.data_inicio).slice(0, 10);
        return {
            dataInicio,
            estrategia: linha.estrategia,
            sessoes: decodificar(linha.sessoes),
            prioridades: decodificar(linha.prioridades),
            tarefasSemTempo: decodificar(linha.tarefas_sem_tempo),
            ajusteEstimativa: {
                fator: Number(linha.fator_estimativa ?? 1),
                tarefasConcluidasUsadas: Number(linha.tarefas_estimativa ?? 0),
                adaptacaoAtiva: Number(linha.tarefas_estimativa ?? 0) >= 3
            }
        };
    }
}
