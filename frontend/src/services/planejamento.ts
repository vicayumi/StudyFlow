import { requisicaoApi } from "./api";

export interface HorarioDisponivel {
    id: string;
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
}

export interface DadosHorarioDisponivel {
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
}

export interface SessaoPlanejada {
    id: string;
    tarefaId: string;
    titulo: string;
    inicio: string;
    fim: string;
    duracaoMinutos: number;
    prioridade: number;
    explicacaoPrioridade: string;
    concluida?: boolean;
}

export interface HistoricoPlanejamento {
    id: string;
    dataInicio: string;
    estrategia: string;
    criadoEm: string;
    totalSessoes: number;
}

export interface ResumoEstimativas {
    tarefasConcluidasUsadas: number;
    fator: number;
    adaptacaoAtiva: boolean;
}

export interface PrioridadePlanejada {
    tarefaId: string;
    titulo: string;
    prioridade: number;
    explicacao: string;
}

export interface EstrategiaPlanejamento {
    id: string;
    nome: string;
    descricao: string;
}

export interface TarefaSemTempo {
    id: string;
    titulo: string;
    diasAtraso?: number;
}

export interface PlanoSemanal {
    dataInicio: string;
    estrategia: string;
    sessoes: SessaoPlanejada[];
    prioridades: PrioridadePlanejada[];
    tarefasSemTempo: TarefaSemTempo[];
    ajusteEstimativa?: ResumoEstimativas;
}

export interface ResumoPlanejado {
    totalMinutos: number;
    dias: { data: string; totalMinutos: number }[];
}

const CABECALHOS_JSON = {
    "Content-Type": "application/json"
};

export function listarHorariosDisponiveis(): Promise<HorarioDisponivel[]> {
    return requisicaoApi<HorarioDisponivel[]>("/planejamento/horarios");
}

export function criarHorarioDisponivel(
    dados: DadosHorarioDisponivel
): Promise<HorarioDisponivel> {
    return requisicaoApi<HorarioDisponivel>("/planejamento/horarios", {
        method: "POST",
        headers: CABECALHOS_JSON,
        body: JSON.stringify(dados)
    });
}

export function atualizarHorarioDisponivel(
    id: string,
    dados: DadosHorarioDisponivel
): Promise<HorarioDisponivel> {
    return requisicaoApi<HorarioDisponivel>(
        `/planejamento/horarios/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: CABECALHOS_JSON,
            body: JSON.stringify(dados)
        }
    );
}

export async function excluirHorarioDisponivel(id: string): Promise<void> {
    await requisicaoApi<void>(
        `/planejamento/horarios/${encodeURIComponent(id)}`,
        { method: "DELETE" }
    );
}

export function listarEstrategiasPlanejamento(): Promise<EstrategiaPlanejamento[]> {
    return requisicaoApi<EstrategiaPlanejamento[]>("/planejamento/estrategias");
}

export function buscarPlanoSemanal(dataInicio: string): Promise<PlanoSemanal> {
    return requisicaoApi<PlanoSemanal>(`/planejamento/semanal?dataInicio=${encodeURIComponent(dataInicio)}`);
}

export function listarSessoesCalendario(ano: number, mes: number): Promise<SessaoPlanejada[]> {
    return requisicaoApi<SessaoPlanejada[]>(`/planejamento/calendario?ano=${ano}&mes=${mes}`);
}

export function moverSessaoCalendario(id: string, data: string, hora: string): Promise<SessaoPlanejada> {
    return requisicaoApi<SessaoPlanejada>(`/planejamento/calendario/${encodeURIComponent(id)}/mover`, {
        method: "PUT", headers: CABECALHOS_JSON, body: JSON.stringify({ data, hora })
    });
}

export function listarHistoricoPlanejamentos(): Promise<HistoricoPlanejamento[]> {
    return requisicaoApi<HistoricoPlanejamento[]>("/planejamento/historico");
}

export async function excluirHistoricoPlanejamentos(ids?: string[]): Promise<void> {
    await requisicaoApi<void>("/planejamento/historico", {
        method: "DELETE",
        headers: CABECALHOS_JSON,
        ...(ids ? { body: JSON.stringify({ ids }) } : {})
    });
}

export function buscarPlanejamentoHistorico(id: string): Promise<PlanoSemanal> {
    return requisicaoApi<PlanoSemanal>(`/planejamento/historico/${encodeURIComponent(id)}`);
}

export function buscarResumoEstimativas(): Promise<ResumoEstimativas> {
    return requisicaoApi<ResumoEstimativas>("/planejamento/estimativas");
}

export function buscarResumoPlanejado(periodo: "hoje" | "semana" | "mes"): Promise<ResumoPlanejado> {
    return requisicaoApi<ResumoPlanejado>(`/planejamento/resumo?periodo=${periodo}`);
}

export function gerarPlanoSemanal(
    dataInicio: string,
    estrategia: string,
    incluirTarefasFuturas: boolean
): Promise<PlanoSemanal> {
    return requisicaoApi<PlanoSemanal>("/planejamento/gerar", {
        method: "POST",
        headers: CABECALHOS_JSON,
        body: JSON.stringify({ dataInicio, estrategia, incluirTarefasFuturas })
    });
}
