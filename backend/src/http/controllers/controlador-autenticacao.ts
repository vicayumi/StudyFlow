import type { Request, Response } from "express";
import { RepositorioAutenticacao, type DadosCadastro, type DadosPerfil } from "../../infrastructure/database/repositorio-autenticacao.js";

export class ControladorAutenticacao {
    private readonly repositorio = new RepositorioAutenticacao();

    public cadastrar = async (requisicao: Request, resposta: Response): Promise<void> => {
        const corpo = requisicao.body ?? {};
        const dados = this.validarCadastro(corpo);
        if (typeof dados === "string") {
            resposta.status(400).json({ erro: dados });
            return;
        }

        try {
            const sessao = await this.repositorio.cadastrar(dados);
            resposta.status(201).json(sessao);
        } catch (erro) {
            if (this.codigoErro(erro) === "ER_DUP_ENTRY") {
                resposta.status(409).json({ erro: "Este e-mail já está cadastrado." });
                return;
            }
            console.error("Erro ao cadastrar usuário:", erro);
            resposta.status(500).json({ erro: "Não foi possível criar sua conta." });
        }
    };

    public entrar = async (requisicao: Request, resposta: Response): Promise<void> => {
        const { email, senha } = requisicao.body ?? {};
        if (typeof email !== "string" || typeof senha !== "string" || !email.trim() || !senha) {
            resposta.status(400).json({ erro: "Informe seu e-mail e sua senha." });
            return;
        }
        try {
            const sessao = await this.repositorio.entrar(email.trim().toLowerCase(), senha);
            if (!sessao) {
                resposta.status(401).json({ erro: "E-mail ou senha incorretos." });
                return;
            }
            resposta.json(sessao);
        } catch (erro) {
            console.error("Erro ao entrar:", erro);
            resposta.status(500).json({ erro: "Não foi possível entrar agora." });
        }
    };

    public atual = async (requisicao: Request, resposta: Response): Promise<void> => {
        const token = requisicao.get("authorization")?.slice(7).trim() ?? "";
        try {
            const usuario = await this.repositorio.buscarPorToken(token);
            if (!usuario) {
                resposta.status(401).json({ erro: "Sua sessão expirou. Entre novamente." });
                return;
            }
            resposta.json({ usuario });
        } catch {
            resposta.status(500).json({ erro: "Não foi possível carregar sua conta." });
        }
    };

    public atualizarPerfil = async (requisicao: Request, resposta: Response): Promise<void> => {
        const dados = this.validarPerfil(requisicao.body ?? {});
        if (typeof dados === "string") {
            resposta.status(400).json({ erro: dados });
            return;
        }

        try {
            const usuario = await this.repositorio.atualizarPerfil(requisicao.usuarioId!, dados);
            if (!usuario) {
                resposta.status(404).json({ erro: "Não foi possível localizar sua conta." });
                return;
            }
            resposta.json({ usuario });
        } catch (erro) {
            if (this.codigoErro(erro) === "ER_DUP_ENTRY") {
                resposta.status(409).json({ erro: "Este e-mail já está cadastrado em outra conta." });
                return;
            }
            console.error("Erro ao atualizar perfil:", erro);
            resposta.status(500).json({ erro: "Não foi possível atualizar seus dados." });
        }
    };

    public alterarSenha = async (requisicao: Request, resposta: Response): Promise<void> => {
        const senhaAtual = typeof requisicao.body?.senhaAtual === "string" ? requisicao.body.senhaAtual : "";
        const novaSenha = typeof requisicao.body?.novaSenha === "string" ? requisicao.body.novaSenha : "";
        if (!senhaAtual || senhaAtual.length > 128) {
            resposta.status(400).json({ erro: "Informe sua senha atual." });
            return;
        }
        if (novaSenha.length < 10 || novaSenha.length > 128) {
            resposta.status(400).json({ erro: "A nova senha deve ter entre 10 e 128 caracteres." });
            return;
        }

        try {
            const alterada = await this.repositorio.alterarSenha(requisicao.usuarioId!, senhaAtual, novaSenha);
            if (!alterada) {
                resposta.status(401).json({ erro: "A senha atual está incorreta." });
                return;
            }
            resposta.json({ mensagem: "Senha alterada com sucesso." });
        } catch (erro) {
            console.error("Erro ao alterar senha:", erro);
            resposta.status(500).json({ erro: "Não foi possível alterar sua senha." });
        }
    };

    public sair = async (requisicao: Request, resposta: Response): Promise<void> => {
        const token = requisicao.get("authorization")?.slice(7).trim() ?? "";
        try {
            await this.repositorio.sair(token);
            resposta.status(204).send();
        } catch {
            resposta.status(500).json({ erro: "Não foi possível encerrar sua sessão." });
        }
    };

    private validarCadastro(corpo: Record<string, unknown>): DadosCadastro | string {
        const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
        const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
        const senha = typeof corpo.senha === "string" ? corpo.senha : "";
        const nivelEstudo = typeof corpo.nivelEstudo === "string" ? corpo.nivelEstudo.trim() : "";
        const instituicao = typeof corpo.instituicao === "string" ? corpo.instituicao.trim() : "";
        const cursoSerie = typeof corpo.cursoSerie === "string" ? corpo.cursoSerie.trim() : "";
        const cidade = typeof corpo.cidade === "string" && corpo.cidade.trim() ? corpo.cidade.trim() : null;

        if (nome.length < 2 || nome.length > 100) return "Informe seu nome (de 2 a 100 caracteres).";
        if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido.";
        if (senha.length < 10 || senha.length > 128) return "A senha deve ter entre 10 e 128 caracteres.";
        if (!["fundamental", "medio", "tecnico", "superior", "outro"].includes(nivelEstudo)) return "Selecione seu nível de estudo.";
        if (instituicao.length < 2 || instituicao.length > 160) return "Informe onde você estuda.";
        if (cursoSerie.length < 2 || cursoSerie.length > 120) return "Informe seu curso, série ou ano.";
        if (cidade && cidade.length > 120) return "A cidade deve ter até 120 caracteres.";

        return { nome, email, senha, nivelEstudo, instituicao, cursoSerie, cidade };
    }

    private validarPerfil(corpo: Record<string, unknown>): DadosPerfil | string {
        const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
        const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
        const nivelEstudo = typeof corpo.nivelEstudo === "string" ? corpo.nivelEstudo.trim() : "";
        const instituicao = typeof corpo.instituicao === "string" ? corpo.instituicao.trim() : "";
        const cursoSerie = typeof corpo.cursoSerie === "string" ? corpo.cursoSerie.trim() : "";
        const cidade = typeof corpo.cidade === "string" && corpo.cidade.trim() ? corpo.cidade.trim() : null;

        if (nome.length < 2 || nome.length > 100) return "Informe seu nome (de 2 a 100 caracteres).";
        if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido.";
        if (!["fundamental", "medio", "tecnico", "superior", "outro"].includes(nivelEstudo)) return "Selecione seu nível de estudo.";
        if (instituicao.length < 2 || instituicao.length > 160) return "Informe onde você estuda.";
        if (cursoSerie.length < 2 || cursoSerie.length > 120) return "Informe seu curso, série ou ano.";
        if (cidade && cidade.length > 120) return "A cidade deve ter até 120 caracteres.";

        return { nome, email, nivelEstudo, instituicao, cursoSerie, cidade };
    }

    private codigoErro(erro: unknown): string | undefined {
        if (typeof erro === "object" && erro !== null && "code" in erro && typeof erro.code === "string") return erro.code;
        return undefined;
    }
}
