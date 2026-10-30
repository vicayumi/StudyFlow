import { requisicaoApi } from "./api";

export interface Disciplina {
    id: string;
    nome: string;
    cor: string;
}

const CABECALHOS_JSON = {
    "Content-Type": "application/json"
};

export function listarDisciplinas(): Promise<Disciplina[]> {
    return requisicaoApi<Disciplina[]>("/disciplinas");
}

export function criarDisciplina(
    nome: string,
    cor: string
): Promise<Disciplina> {
    return requisicaoApi<Disciplina>("/disciplinas", {
        method: "POST",
        headers: CABECALHOS_JSON,
        body: JSON.stringify({ nome, cor })
    });
}

export function atualizarDisciplina(
    id: string,
    dados: { nome: string; cor: string }
): Promise<Disciplina> {
    return requisicaoApi<Disciplina>(
        `/disciplinas/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: CABECALHOS_JSON,
            body: JSON.stringify(dados)
        }
    );
}

export async function excluirDisciplina(id: string): Promise<void> {
    await requisicaoApi<void>(
        `/disciplinas/${encodeURIComponent(id)}`,
        { method: "DELETE" }
    );
}
