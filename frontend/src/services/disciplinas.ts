
export interface Disciplina {
    id: string;
    nome: string;
    cor: string;
}

const ENDERECO_API = "http://localhost:3000/api/disciplinas";

export async function listarDisciplinas(): Promise<Disciplina[]> {
    const resposta = await fetch(ENDERECO_API);

    if (!resposta.ok) {
        throw new Error("Não foi possível carregar as disciplinas.");
    }

    return resposta.json() as Promise<Disciplina[]>;
}

export async function criarDisciplina(
    nome: string,
    cor: string
): Promise<Disciplina> {
    const resposta = await fetch(ENDERECO_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome, cor })
    });

    const dados: unknown = await resposta.json();

    if (!resposta.ok) {
        const mensagem =
            typeof dados === "object" &&
            dados !== null &&
            "erro" in dados &&
            typeof dados.erro === "string"
                ? dados.erro
                : "Não foi possível cadastrar a disciplina.";

        throw new Error(mensagem);
    }

    return dados as Disciplina;

}

export async function atualizarDisciplina(
    id: string,
    dados: { nome: string; cor: string }
): Promise<Disciplina> {
    const resposta = await fetch(`${ENDERECO_API}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

    const resultado: unknown = await resposta.json();

    if (!resposta.ok) {
        const mensagem =
            typeof resultado === "object" &&
            resultado !== null &&
            "erro" in resultado &&
            typeof resultado.erro === "string"
                ? resultado.erro
                : "Não foi possível atualizar a disciplina.";

        throw new Error(mensagem);
    }

    return resultado as Disciplina;
}

export async function excluirDisciplina(id: string): Promise<void> {
    const resposta = await fetch(`${ENDERECO_API}/${id}`, {
        method: "DELETE"
    });

    if (!resposta.ok) {
        let mensagem = "Não foi possível excluir a disciplina.";

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
            // A resposta pode não conter um corpo JSON.
        }

        throw new Error(mensagem);
    }
}
