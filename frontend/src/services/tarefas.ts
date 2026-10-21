
export interface Tarefa {
    id: string;
    disciplinaId: string;
    titulo: string;
    descricao: string;
    dataPrazo: string;
    dificuldade: number;
    duracaoEstimada: number;
    pesoAvaliacao: number;
    estado: "pendente" | "em andamento" | "concluida";
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

const ENDERECO_API = "http://localhost:3000/api/tarefas";

async function verificarResposta(resposta: Response): Promise<void> {
    if (resposta.ok) {
        return;
    }

    let mensagem = "Não foi possível realizar a operação.";

    try {
        const resultado: unknown = await resposta.json();

        if (
            typeof resultado === "object" &&
            resultado !== null &&
            "erro" in resultado &&
            typeof resultado.erro === "string"
        ) {
            mensagem = resultado.erro;
        }
    } catch {
        // Mantém a mensagem padrão se a resposta não tiver JSON.
    }

    throw new Error(mensagem);
}

export async function listarTarefas(): Promise<Tarefa[]> {
    const resposta = await fetch(ENDERECO_API);

    await verificarResposta(resposta);

    return resposta.json() as Promise<Tarefa[]>;
}

export async function criarTarefa(
    dados: DadosNovaTarefa
): Promise<Tarefa> {
    const resposta = await fetch(ENDERECO_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

    await verificarResposta(resposta);

    return resposta.json() as Promise<Tarefa>;
}

export async function editarTarefa(
    id: string,
    dados: DadosEdicaoTarefa
): Promise<void> {
    const resposta = await fetch(
        `${ENDERECO_API}/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        }
    );

    await verificarResposta(resposta);
}

export async function concluirTarefa(id: string): Promise<void> {
    const resposta = await fetch(
        `${ENDERECO_API}/${encodeURIComponent(id)}/concluir`,
        {
            method: "PATCH"
        }
    );

    await verificarResposta(resposta);
}

export async function excluirTarefa(id: string): Promise<void> {
    const resposta = await fetch(
        `${ENDERECO_API}/${encodeURIComponent(id)}`,
        {
            method: "DELETE"
        }
    );

    await verificarResposta(resposta);
}
