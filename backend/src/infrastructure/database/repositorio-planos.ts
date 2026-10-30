import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";

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
    tarefasSemTempo: { id: string; titulo: string }[];
}

interface PlanoBanco extends RowDataPacket {
    id: string;
    data_inicio: string | Date;
    estrategia: string;
    sessoes: string | SessaoPlanoSalva[];
    prioridades: string | PrioridadePlanoSalva[];
    tarefas_sem_tempo: string | { id: string; titulo: string }[];
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

function deslocarData(data: string, dias: number): string {
    const [ano, mes, dia] = data.split("-").map(Number);
    const resultado = new Date(ano, mes - 1, dia + dias);
    return `${resultado.getFullYear()}-${String(resultado.getMonth() + 1).padStart(2, "0")}-${String(resultado.getDate()).padStart(2, "0")}`;
}

export class RepositorioPlanos {
    public async salvar(dados: DadosPlanoSalvo, usuarioId: string): Promise<void> {
        await conexao.execute<ResultSetHeader>(
            `INSERT INTO planos_semanais
                (id, usuario_id, data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                id = VALUES(id), estrategia = VALUES(estrategia),
                sessoes = VALUES(sessoes), prioridades = VALUES(prioridades),
                tarefas_sem_tempo = VALUES(tarefas_sem_tempo), criado_em = CURRENT_TIMESTAMP`,
            [randomUUID(), usuarioId, dados.dataInicio, dados.estrategia,
                JSON.stringify(dados.sessoes), JSON.stringify(dados.prioridades), JSON.stringify(dados.tarefasSemTempo)]
        );
    }

    public async buscarSemana(dataInicio: string, usuarioId: string): Promise<DadosPlanoSalvo | null> {
        const [linhas] = await conexao.execute<PlanoBanco[]>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo
             FROM planos_semanais WHERE usuario_id = ? AND data_inicio = ? LIMIT 1`,
            [usuarioId, dataInicio]
        );
        return linhas[0] ? this.converter(linhas[0]) : null;
    }

    public async listarSessoesDoMes(ano: number, mes: number, usuarioId: string): Promise<SessaoPlanoSalva[]> {
        const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
        const fimMes = `${ano + (mes === 12 ? 1 : 0)}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}-01`;
        const [linhas] = await conexao.execute<PlanoBanco[]>(
            `SELECT data_inicio, estrategia, sessoes, prioridades, tarefas_sem_tempo
             FROM planos_semanais
             WHERE usuario_id = ? AND data_inicio >= ? AND data_inicio < ?
             ORDER BY data_inicio DESC`,
            [usuarioId, deslocarData(inicioMes, -6), fimMes]
        );

        return linhas.flatMap((linha) => this.converter(linha).sessoes)
            .filter((sessao) => chaveDataLocal(sessao.inicio).slice(0, 7) === inicioMes.slice(0, 7));
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
            tarefasSemTempo: decodificar(linha.tarefas_sem_tempo)
        };
    }
}
