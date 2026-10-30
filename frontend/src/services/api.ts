export async function requisicaoApi<T>(
    caminho: string,
    opcoes: RequestInit = {}
): Promise<T> {
    let resposta: Response;

    try {
        const cabecalhos = new Headers(opcoes.headers);
        const token = localStorage.getItem("studyflow_token");
        if (token) cabecalhos.set("Authorization", `Bearer ${token}`);
        resposta = await fetch(`/api${caminho}`, { ...opcoes, headers: cabecalhos });
    } catch {
        throw new Error(
            "Não foi possível conectar à API. Confira se o backend está rodando."
        );
    }

    if (!resposta.ok) {
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
            // Mantém a mensagem padrão quando a resposta não contém JSON.
        }

        throw new Error(mensagem);
    }

    if (resposta.status === 204) {
        return undefined as T;
    }

    return resposta.json() as Promise<T>;
}
