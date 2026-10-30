import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";

const scryptAsync = promisify(scrypt);

export interface DadosCadastro {
    nome: string;
    email: string;
    senha: string;
    nivelEstudo: string;
    instituicao: string;
    cursoSerie: string;
    cidade: string | null;
}

export type DadosPerfil = Omit<DadosCadastro, "senha">;

export interface PerfilUsuario {
    id: string;
    nome: string;
    email: string;
    nivelEstudo: string;
    instituicao: string;
    cursoSerie: string;
    cidade: string | null;
}

interface UsuarioBanco extends RowDataPacket, PerfilUsuario {
    senha_hash: string;
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

async function criarHashSenha(senha: string): Promise<string> {
    const sal = randomBytes(16).toString("hex");
    const hash = await scryptAsync(senha, sal, 64) as Buffer;
    return `${sal}:${hash.toString("hex")}`;
}

async function verificarSenha(senha: string, armazenada: string): Promise<boolean> {
    const [sal, hashHex] = armazenada.split(":");
    if (!sal || !hashHex) return false;
    const hashSalvo = Buffer.from(hashHex, "hex");
    const hashInformado = await scryptAsync(senha, sal, hashSalvo.length) as Buffer;
    return hashSalvo.length === hashInformado.length && timingSafeEqual(hashSalvo, hashInformado);
}

export class RepositorioAutenticacao {
    public async cadastrar(dados: DadosCadastro): Promise<{ usuario: PerfilUsuario; token: string }> {
        const id = randomUUID();
        const senhaHash = await criarHashSenha(dados.senha);
        const token = randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const conexaoTransacao = await conexao.getConnection();

        try {
            await conexaoTransacao.beginTransaction();
            await conexaoTransacao.execute(
                `INSERT INTO usuarios
                    (id, nome, email, senha_hash, nivel_estudo, instituicao, curso_serie, cidade)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, dados.nome, dados.email, senhaHash, dados.nivelEstudo, dados.instituicao, dados.cursoSerie, dados.cidade]
            );

            // Na primeira conta, preserva os dados legados do espaço pessoal existente.
            for (const tabela of ["disciplinas", "tarefas", "horarios_disponiveis"]) {
                await conexaoTransacao.query(`UPDATE \`${tabela}\` SET usuario_id = ? WHERE usuario_id IS NULL`, [id]);
            }

            await conexaoTransacao.execute(
                "INSERT INTO sessoes_login (token_hash, usuario_id, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))",
                [tokenHash, id]
            );
            await conexaoTransacao.commit();

            return {
                usuario: {
                    id,
                    nome: dados.nome,
                    email: dados.email,
                    nivelEstudo: dados.nivelEstudo,
                    instituicao: dados.instituicao,
                    cursoSerie: dados.cursoSerie,
                    cidade: dados.cidade
                },
                token
            };
        } catch (erro) {
            await conexaoTransacao.rollback();
            throw erro;
        } finally {
            conexaoTransacao.release();
        }
    }

    public async entrar(email: string, senha: string): Promise<{ usuario: PerfilUsuario; token: string } | null> {
        const [usuarios] = await conexao.execute<UsuarioBanco[]>(
            `SELECT id, nome, email, senha_hash AS senha_hash, nivel_estudo AS nivelEstudo,
                    instituicao, curso_serie AS cursoSerie, cidade
             FROM usuarios WHERE email = ? LIMIT 1`,
            [email]
        );
        const usuario = usuarios[0];
        if (!usuario || !(await verificarSenha(senha, usuario.senha_hash))) return null;

        const token = randomBytes(32).toString("hex");
        await conexao.execute(
            "INSERT INTO sessoes_login (token_hash, usuario_id, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))",
            [hashToken(token), usuario.id]
        );
        return { usuario: this.perfil(usuario), token };
    }

    public async buscarPorToken(token: string): Promise<PerfilUsuario | null> {
        const [usuarios] = await conexao.execute<UsuarioBanco[]>(
            `SELECT u.id, u.nome, u.email, u.senha_hash, u.nivel_estudo AS nivelEstudo,
                    u.instituicao, u.curso_serie AS cursoSerie, u.cidade
             FROM sessoes_login s JOIN usuarios u ON u.id = s.usuario_id
             WHERE s.token_hash = ? AND s.expira_em > NOW() LIMIT 1`,
            [hashToken(token)]
        );
        return usuarios[0] ? this.perfil(usuarios[0]) : null;
    }

    public async atualizarPerfil(id: string, dados: DadosPerfil): Promise<PerfilUsuario | null> {
        await conexao.execute(
            `UPDATE usuarios
             SET nome = ?, email = ?, nivel_estudo = ?, instituicao = ?, curso_serie = ?, cidade = ?
             WHERE id = ?`,
            [dados.nome, dados.email, dados.nivelEstudo, dados.instituicao, dados.cursoSerie, dados.cidade, id]
        );

        const [usuarios] = await conexao.execute<UsuarioBanco[]>(
            `SELECT id, nome, email, senha_hash, nivel_estudo AS nivelEstudo,
                    instituicao, curso_serie AS cursoSerie, cidade
             FROM usuarios WHERE id = ? LIMIT 1`,
            [id]
        );
        return usuarios[0] ? this.perfil(usuarios[0]) : null;
    }

    public async alterarSenha(id: string, senhaAtual: string, novaSenha: string): Promise<boolean> {
        const [usuarios] = await conexao.execute<UsuarioBanco[]>(
            "SELECT id, senha_hash FROM usuarios WHERE id = ? LIMIT 1",
            [id]
        );
        const usuario = usuarios[0];
        if (!usuario || !(await verificarSenha(senhaAtual, usuario.senha_hash))) return false;

        const senhaHash = await criarHashSenha(novaSenha);
        await conexao.execute("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [senhaHash, id]);
        return true;
    }

    public async sair(token: string): Promise<void> {
        await conexao.execute("DELETE FROM sessoes_login WHERE token_hash = ?", [hashToken(token)]);
    }

    private perfil(usuario: UsuarioBanco): PerfilUsuario {
        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            nivelEstudo: usuario.nivelEstudo,
            instituicao: usuario.instituicao,
            cursoSerie: usuario.cursoSerie,
            cidade: usuario.cidade
        };
    }
}
