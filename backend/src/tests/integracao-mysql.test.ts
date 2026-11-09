import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositorioTarefas } from "../infrastructure/database/repositorio-tarefas.js";
import { conexao } from "../infrastructure/database/conexao.js";

const solicitouIntegracao = process.env.RUN_MYSQL_INTEGRATION === "1";
const bancoConfigurado = process.env.DB_NAME ?? "";
if (solicitouIntegracao && !/_test$/i.test(bancoConfigurado)) {
    throw new Error("Por segurança, os testes de integração só rodam se DB_NAME terminar com _test.");
}
const executarIntegracao = solicitouIntegracao && /_test$/i.test(bancoConfigurado);

describe.skipIf(!executarIntegracao)("Integração do repositório de tarefas com MySQL", () => {
    const repositorio = new RepositorioTarefas();
    let usuarioId = "";
    let disciplinaId = "";

    beforeEach(async () => {
        usuarioId = randomUUID();
        disciplinaId = randomUUID();
        await conexao.execute(
            `INSERT INTO usuarios (id, nome, email, senha_hash, nivel_estudo, instituicao, curso_serie)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, "Usuário de teste", `${usuarioId}@exemplo.test`, "hash-de-teste", "medio", "Instituição de teste", "1º ano"]
        );
        await conexao.execute(
            "INSERT INTO disciplinas (id, usuario_id, nome, cor) VALUES (?, ?, ?, ?)",
            [disciplinaId, usuarioId, "Disciplina de teste", "#8B5CF6"]
        );
    });

    afterEach(async () => {
        if (usuarioId) await conexao.execute("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
    });

    afterAll(async () => {
        if (executarIntegracao) await conexao.end();
    });

    it("cria, consulta e conclui uma tarefa persistida", async () => {
        const tarefaCriada = await repositorio.criar({
            disciplinaId,
            titulo: "Tarefa de integração",
            descricao: "Verifica a persistência no banco de teste.",
            dataPrazo: new Date("2030-12-20T12:00:00"),
            dificuldade: 3,
            duracaoEstimada: 45,
            pesoAvaliacao: 20
        }, usuarioId);

        const tarefasAntes = await repositorio.listarTodas(usuarioId);
        expect(tarefasAntes).toHaveLength(1);
        expect(tarefasAntes[0].id).toBe(tarefaCriada.id);
        expect(tarefasAntes[0].estado).toBe("pendente");

        expect(await repositorio.concluir(tarefaCriada.id, usuarioId)).toBe(true);
        const tarefasDepois = await repositorio.listarTodas(usuarioId);
        expect(tarefasDepois[0].estado).toBe("concluida");
    });
});
