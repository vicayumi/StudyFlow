import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";

const pastaBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseBanco = process.env.DB_NAME?.trim();

if (!baseBanco || !/^[a-zA-Z0-9_]+$/.test(baseBanco)) {
    console.error("Configure DB_NAME em backend/.env com um nome simples, como studyflow.");
    process.exit(1);
}

if (/(^|_)(prod|production|live)(_|$)/i.test(baseBanco)) {
    console.error("Os testes não podem usar uma base cujo nome indique produção.");
    process.exit(1);
}

const bancoTeste = /_test$/i.test(baseBanco) ? baseBanco : `${baseBanco}_test`;
let conexaoAdmin;
try {
    conexaoAdmin = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true,
        connectTimeout: 5000
    });
    console.log(`Preparando banco isolado: ${bancoTeste}`);
    const schemaOriginal = await readFile(path.join(pastaBackend, "src/infrastructure/database/schema.sql"), "utf8");
    const schemaTeste = schemaOriginal.replace(
        /CREATE DATABASE IF NOT EXISTS studyflow\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci;\s*USE studyflow;/,
        `CREATE DATABASE IF NOT EXISTS \`${bancoTeste}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`${bancoTeste}\`;`
    );

    if (schemaTeste === schemaOriginal) {
        throw new Error("Não foi possível adaptar schema.sql ao banco de teste.");
    }

    await conexaoAdmin.query(schemaTeste);
} catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error(`Não foi possível preparar o MySQL local (${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "3306"}).`);
    console.error(detalhe);
    console.error("Confirme que o MySQL está ativo e que as credenciais de backend/.env podem criar o banco de teste.");
    process.exitCode = 1;
} finally {
    if (conexaoAdmin) await conexaoAdmin.end();
}

if (process.exitCode) process.exit(process.exitCode);

console.log("Executando fluxo integrado sem abrir uma porta HTTP local...");
const ambienteTeste = {
    ...process.env,
    DB_NAME: bancoTeste,
    RUN_MYSQL_INTEGRATION: "1"
};
const cliVitest = path.join(pastaBackend, "node_modules/vitest/vitest.mjs");
const processo = spawn(process.execPath, [cliVitest, "run", "src/tests/integracao-mysql.test.ts"], {
    cwd: pastaBackend,
    env: ambienteTeste,
    stdio: "inherit"
});

process.exitCode = await new Promise((resolve, reject) => {
    processo.once("error", reject);
    processo.once("exit", (codigo, sinal) => {
        if (sinal) reject(new Error(`Vitest encerrou com sinal ${sinal}.`));
        else resolve(codigo ?? 1);
    });
});
