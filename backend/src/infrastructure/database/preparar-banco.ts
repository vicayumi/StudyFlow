import { conexao } from "./conexao.js";
import type { RowDataPacket } from "mysql2";

interface ColunaBanco extends RowDataPacket { COLUMN_NAME: string }
interface ColunaDuracaoBanco extends RowDataPacket { COLUMN_NAME: string; COLUMN_DEFAULT: string | number | null }
interface IndiceBanco extends RowDataPacket { INDEX_NAME: string }

const TABELAS_COM_USUARIO = ["disciplinas", "tarefas", "horarios_disponiveis"] as const;

export async function prepararBanco(): Promise<void> {
    await conexao.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id CHAR(36) NOT NULL PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            nivel_estudo VARCHAR(40) NOT NULL,
            instituicao VARCHAR(160) NOT NULL,
            curso_serie VARCHAR(120) NOT NULL,
            cidade VARCHAR(120) NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE = InnoDB
    `);
    await conexao.query(`
        CREATE TABLE IF NOT EXISTS sessoes_login (
            token_hash CHAR(64) NOT NULL PRIMARY KEY,
            usuario_id CHAR(36) NOT NULL,
            expira_em DATETIME NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sessoes_usuario (usuario_id),
            CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id)
                REFERENCES usuarios (id) ON DELETE CASCADE
        ) ENGINE = InnoDB
    `);
    await conexao.query(`
        CREATE TABLE IF NOT EXISTS planos_semanais (
            id CHAR(36) NOT NULL PRIMARY KEY,
            usuario_id CHAR(36) NOT NULL,
            data_inicio DATE NOT NULL,
            estrategia VARCHAR(30) NOT NULL,
            sessoes JSON NOT NULL,
            prioridades JSON NOT NULL,
            tarefas_sem_tempo JSON NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_planos_usuario_data (usuario_id, data_inicio),
            CONSTRAINT fk_planos_usuario FOREIGN KEY (usuario_id)
                REFERENCES usuarios (id) ON DELETE CASCADE
        ) ENGINE = InnoDB
    `);
    await conexao.query(`
        CREATE TABLE IF NOT EXISTS sessoes_estudo_realizadas (
            id CHAR(36) NOT NULL PRIMARY KEY,
            usuario_id CHAR(36) NOT NULL,
            tarefa_id CHAR(36) NOT NULL,
            plano_sessao_id VARCHAR(100) NULL,
            inicio DATETIME NOT NULL,
            fim DATETIME NOT NULL,
            duracao_segundos INT UNSIGNED NOT NULL,
            tipo ENUM('pomodoro', 'manual', 'planejada') NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_sessoes_usuario_inicio (usuario_id, inicio),
            UNIQUE KEY uq_sessao_plano_usuario (usuario_id, plano_sessao_id),
            CONSTRAINT fk_sessoes_estudo_usuario FOREIGN KEY (usuario_id)
                REFERENCES usuarios (id) ON DELETE CASCADE,
            CONSTRAINT fk_sessoes_estudo_tarefa FOREIGN KEY (tarefa_id)
                REFERENCES tarefas (id) ON DELETE CASCADE
        ) ENGINE = InnoDB
    `);
    const [colunasDuracao] = await conexao.execute<ColunaBanco[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessoes_estudo_realizadas' AND COLUMN_NAME = 'duracao_segundos'`
    );
    if (colunasDuracao.length === 0) {
        await conexao.query("ALTER TABLE sessoes_estudo_realizadas ADD COLUMN duracao_segundos INT UNSIGNED NOT NULL DEFAULT 0");
        await conexao.query("UPDATE sessoes_estudo_realizadas SET duracao_segundos = duracao_minutos * 60 WHERE duracao_segundos = 0");
    }
    const [colunasMinutos] = await conexao.execute<ColunaDuracaoBanco[]>(
        `SELECT COLUMN_NAME, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessoes_estudo_realizadas' AND COLUMN_NAME = 'duracao_minutos'`
    );
    if (colunasMinutos.length > 0 && colunasMinutos[0].COLUMN_DEFAULT === null) {
        await conexao.query("ALTER TABLE sessoes_estudo_realizadas MODIFY COLUMN duracao_minutos INT UNSIGNED NOT NULL DEFAULT 0");
    }
    await conexao.query("ALTER TABLE sessoes_estudo_realizadas MODIFY COLUMN tipo ENUM('pomodoro', 'manual', 'cronometro', 'planejada') NOT NULL");
    const [colunasAtividade] = await conexao.execute<ColunaBanco[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessoes_estudo_realizadas' AND COLUMN_NAME = 'atividade'`
    );
    if (colunasAtividade.length === 0) {
        await conexao.query("ALTER TABLE sessoes_estudo_realizadas ADD COLUMN atividade VARCHAR(100) NULL");
    }
    for (const tabela of ["sessoes_estudo_realizadas"] as const) {
        const [indices] = await conexao.execute<IndiceBanco[]>(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'idx_sessoes_usuario_inicio'`,
            [tabela]
        );
        if (indices.length === 0) {
            await conexao.query(`ALTER TABLE \`${tabela}\` ADD INDEX idx_sessoes_usuario_inicio (usuario_id, inicio)`);
        }
    }

    for (const tabela of TABELAS_COM_USUARIO) {
        const [colunas] = await conexao.execute<ColunaBanco[]>(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'usuario_id'`,
            [tabela]
        );

        if (colunas.length === 0) {
            await conexao.query(`ALTER TABLE \`${tabela}\` ADD COLUMN usuario_id CHAR(36) NULL`);
        }

        const nomeIndice = `idx_${tabela}_usuario`;
        const [indices] = await conexao.execute<IndiceBanco[]>(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
            [tabela, nomeIndice]
        );

        if (indices.length === 0) {
            await conexao.query(`ALTER TABLE \`${tabela}\` ADD INDEX \`${nomeIndice}\` (usuario_id)`);
        }
    }
}
