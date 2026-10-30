import { requisicaoApi } from "./api";

export interface Usuario {
    id: string;
    nome: string;
    email: string;
    nivelEstudo: string;
    instituicao: string;
    cursoSerie: string;
    cidade: string | null;
}

export interface DadosCadastro {
    nome: string;
    email: string;
    senha: string;
    nivelEstudo: string;
    instituicao: string;
    cursoSerie: string;
    cidade: string;
}

export type DadosPerfil = Omit<DadosCadastro, "senha">;

interface RespostaSessao {
    token: string;
    usuario: Usuario;
}

function salvarSessao(sessao: RespostaSessao): Usuario {
    localStorage.setItem("studyflow_token", sessao.token);
    return sessao.usuario;
}

export async function entrar(email: string, senha: string): Promise<Usuario> {
    return salvarSessao(await requisicaoApi<RespostaSessao>("/autenticacao/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    }));
}

export async function cadastrar(dados: DadosCadastro): Promise<Usuario> {
    return salvarSessao(await requisicaoApi<RespostaSessao>("/autenticacao/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    }));
}

export async function usuarioAtual(): Promise<Usuario> {
    const resposta = await requisicaoApi<{ usuario: Usuario }>("/autenticacao/me");
    return resposta.usuario;
}

export async function atualizarPerfil(dados: DadosPerfil): Promise<Usuario> {
    const resposta = await requisicaoApi<{ usuario: Usuario }>("/autenticacao/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
    return resposta.usuario;
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await requisicaoApi<{ mensagem: string }>("/autenticacao/me/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha })
    });
}

export async function sair(): Promise<void> {
    try {
        await requisicaoApi<void>("/autenticacao/logout", { method: "POST" });
    } finally {
        localStorage.removeItem("studyflow_token");
    }
}

export function limparToken(): void {
    localStorage.removeItem("studyflow_token");
}
