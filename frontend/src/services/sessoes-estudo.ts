import { requisicaoApi } from "./api";

export interface SessaoRealizada {
    id: string;
    tarefaId: string;
    titulo: string;
    inicio: string;
    fim: string;
    duracaoMinutos: number;
    duracaoSegundos: number;
    tipo: "pomodoro" | "manual" | "cronometro" | "planejada";
    planoSessaoId?: string | null;
    atividade?: string | null;
}

export interface ResumoEstudoDiario {
    sessoes: SessaoRealizada[];
    totalSegundos: number;
}

export interface ResumoPeriodo {
    totalSegundos: number;
    dias: { data: string; totalSegundos: number }[];
}

export async function buscarResumoPeriodo(periodo: "semana" | "mes"): Promise<ResumoPeriodo> {
    return requisicaoApi<ResumoPeriodo>(`/sessoes-estudo/resumo?periodo=${periodo}`);
}

export async function buscarEstudoDoDia(data: string): Promise<ResumoEstudoDiario> {
    return requisicaoApi<ResumoEstudoDiario>(`/sessoes-estudo/hoje?data=${encodeURIComponent(data)}`);
}

export async function registrarEstudo(tarefaId: string, duracaoSegundos: number, tipo: "pomodoro" | "manual" | "cronometro", atividade?: string): Promise<SessaoRealizada> {
    return requisicaoApi<SessaoRealizada>("/sessoes-estudo/registrar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarefaId, duracaoSegundos, tipo, atividade })
    });
}

export async function concluirSessaoPlanejada(sessao: {
    id: string; tarefaId: string; inicio: string; fim: string; duracaoMinutos: number;
}): Promise<SessaoRealizada> {
    return requisicaoApi<SessaoRealizada>("/sessoes-estudo/planejada/concluir", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sessao, planoSessaoId: sessao.id })
    });
}
