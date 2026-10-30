import { requisicaoApi } from "./api";

export interface Tarefa {
    id: string;
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: string;
    dificuldade: number;
    duracaoEstimada: number;
    pesoAvaliacao: number;
    estado: "pendente" | "concluida";
    tempoEstudado: number;
}

export interface DadosNovaTarefa {
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: string;
    dificuldade: number;
    duracaoEstimada: number;
    pesoAvaliacao: number;
}

export type DadosEdicaoTarefa = DadosNovaTarefa;

const CABECALHOS_JSON = {
    "Content-Type": "application/json"
};

export function listarTarefas(): Promise<Tarefa[]> {
    return requisicaoApi<Tarefa[]>("/tarefas");
}

export function criarTarefa(
    dados: DadosNovaTarefa
): Promise<Tarefa> {
    return requisicaoApi<Tarefa>("/tarefas", {
        method: "POST",
        headers: CABECALHOS_JSON,
        body: JSON.stringify(dados)
    });
}

export async function editarTarefa(
    id: string,
    dados: DadosEdicaoTarefa
): Promise<void> {
    await requisicaoApi<void>(`/tarefas/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: CABECALHOS_JSON,
        body: JSON.stringify(dados)
    });
}

export async function concluirTarefa(id: string): Promise<void> {
    await requisicaoApi<void>(
        `/tarefas/${encodeURIComponent(id)}/concluir`,
        { method: "PATCH" }
    );
}

export async function reabrirTarefa(id: string): Promise<void> {
    await requisicaoApi<void>(
        `/tarefas/${encodeURIComponent(id)}/reabrir`,
        { method: "PATCH" }
    );
}

export async function excluirTarefa(id: string): Promise<void> {
    await requisicaoApi<void>(`/tarefas/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}
