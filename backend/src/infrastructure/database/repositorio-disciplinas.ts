import { randomUUID } from "node:crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { conexao } from "./conexao.js";
import { Disciplina } from "../../domain/entities/disciplina.js";

interface DisciplinaBanco extends RowDataPacket {
    id: string;
    nome: string;
    cor: string;
}

export class RepositorioDisciplinas {
    public async listar(usuarioId: string): Promise<Disciplina[]> {
        const [linhas] = await conexao.query<DisciplinaBanco[]>(
            "SELECT id, nome, cor FROM disciplinas WHERE usuario_id = ? ORDER BY nome",
            [usuarioId]
        );

        return linhas.map(
            linha => new Disciplina(linha.id, linha.nome, linha.cor)
        );
    }

    public async buscarPorId(id: string, usuarioId: string): Promise<Disciplina | null> {
        const [linhas] = await conexao.execute<DisciplinaBanco[]>(
            "SELECT id, nome, cor FROM disciplinas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );

        if (linhas.length === 0) {
            return null;
        }

        const linha = linhas[0];

        return new Disciplina(linha.id, linha.nome, linha.cor);
    }

    public async criar(
        nome: string,
        usuarioId: string,
        cor: string = "#8B5CF6"
    ): Promise<Disciplina> {
        const disciplina = new Disciplina(
            randomUUID(),
            nome.trim(),
            cor
        );

        await conexao.execute<ResultSetHeader>(
            "INSERT INTO disciplinas (id, usuario_id, nome, cor) VALUES (?, ?, ?, ?)",
            [disciplina.id, usuarioId, disciplina.nome, disciplina.cor]
        );

        return disciplina;
    }

    public async excluir(id: string, usuarioId: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            "DELETE FROM disciplinas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );

        return resultado.affectedRows > 0;
    }
    public async atualizar(
    id: string,
    dados: { nome?: string; cor?: string },
    usuarioId: string
): Promise<Disciplina | null> {
    const disciplina = await this.buscarPorId(id, usuarioId);

    if (!disciplina) {
        return null;
    }

    if (dados.nome !== undefined) {
        disciplina.renomear(dados.nome);
    }

    if (dados.cor !== undefined) {
        disciplina.alterarCor(dados.cor);
    }

    await conexao.execute(
        "UPDATE disciplinas SET nome = ?, cor = ? WHERE id = ? AND usuario_id = ?",
        [disciplina.nome, disciplina.cor, id, usuarioId]
    );

    return disciplina;
    }
}
