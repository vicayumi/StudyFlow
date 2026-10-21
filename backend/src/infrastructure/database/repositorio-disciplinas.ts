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
    public async listar(): Promise<Disciplina[]> {
        const [linhas] = await conexao.query<DisciplinaBanco[]>(
            "SELECT id, nome, cor FROM disciplinas ORDER BY nome"
        );

        return linhas.map(
            linha => new Disciplina(linha.id, linha.nome, linha.cor)
        );
    }

    public async buscarPorId(id: string): Promise<Disciplina | null> {
        const [linhas] = await conexao.execute<DisciplinaBanco[]>(
            "SELECT id, nome, cor FROM disciplinas WHERE id = ?",
            [id]
        );

        if (linhas.length === 0) {
            return null;
        }

        const linha = linhas[0];

        return new Disciplina(linha.id, linha.nome, linha.cor);
    }

    public async criar(
        nome: string,
        cor: string = "#8B5CF6"
    ): Promise<Disciplina> {
        const disciplina = new Disciplina(
            randomUUID(),
            nome.trim(),
            cor
        );

        await conexao.execute<ResultSetHeader>(
            "INSERT INTO disciplinas (id, nome, cor) VALUES (?, ?, ?)",
            [disciplina.id, disciplina.nome, disciplina.cor]
        );

        return disciplina;
    }

    public async excluir(id: string): Promise<boolean> {
        const [resultado] = await conexao.execute<ResultSetHeader>(
            "DELETE FROM disciplinas WHERE id = ?",
            [id]
        );

        return resultado.affectedRows > 0;
    }
    public async atualizar(
    id: string,
    dados: { nome?: string; cor?: string }
): Promise<Disciplina | null> {
    const disciplina = await this.buscarPorId(id);

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
        "UPDATE disciplinas SET nome = ?, cor = ? WHERE id = ?",
        [disciplina.nome, disciplina.cor, id]
    );

    return disciplina;
    }
}