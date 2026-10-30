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
}

export interface PlanoSemanal {
    dataInicio: string;
    estrategia: string;
    sessoes: SessaoPlanejada[];
    prioridades: PrioridadePlanejada[];
    tarefasSemTempo: TarefaSemTempo[];
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

export function gerarPlanoSemanal(dataInicio: string, estrategia: string): Promise<PlanoSemanal> {
    return requisicaoApi<PlanoSemanal>("/planejamento/gerar", {
        method: "POST",
        headers: CABECALHOS_JSON,
        body: JSON.stringify({ dataInicio, estrategia })
    });
}
