CREATE DATABASE IF NOT EXISTS studyflow
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE studyflow;

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
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS sessoes_login (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    usuario_id CHAR(36) NOT NULL,
    expira_em DATETIME NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessoes_usuario (usuario_id),
    CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE = InnoDB;

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
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS sessoes_estudo_realizadas (
    id CHAR(36) NOT NULL PRIMARY KEY,
    usuario_id CHAR(36) NOT NULL,
    tarefa_id CHAR(36) NOT NULL,
    plano_sessao_id VARCHAR(100) NULL,
    inicio DATETIME NOT NULL,
    fim DATETIME NOT NULL,
    duracao_segundos INT UNSIGNED NOT NULL,
    tipo ENUM('pomodoro', 'manual', 'cronometro', 'planejada') NOT NULL,
    atividade VARCHAR(100) NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessoes_usuario_inicio (usuario_id, inicio),
    UNIQUE KEY uq_sessao_plano_usuario (usuario_id, plano_sessao_id),
    CONSTRAINT fk_sessoes_estudo_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_sessoes_estudo_tarefa FOREIGN KEY (tarefa_id)
        REFERENCES tarefas (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS disciplinas (
    id CHAR(36) NOT NULL PRIMARY KEY,
    usuario_id CHAR(36) NULL,
    nome VARCHAR(100) NOT NULL,
    cor CHAR(7) NOT NULL DEFAULT '#8B5CF6',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS horarios_disponiveis (
    id CHAR(36) NOT NULL PRIMARY KEY,
    usuario_id CHAR(36) NULL,
    dia_semana TINYINT UNSIGNED NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_horarios_dia_inicio (dia_semana, hora_inicio)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS tarefas (
    id CHAR(36) NOT NULL PRIMARY KEY,
    usuario_id CHAR(36) NULL,
    disciplina_id CHAR(36) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    data_prazo DATETIME NOT NULL,
    dificuldade TINYINT UNSIGNED NOT NULL,
    duracao_estimada INT UNSIGNED NOT NULL,
    tempo_estudado INT UNSIGNED NOT NULL DEFAULT 0,
    peso_avaliacao DECIMAL(5, 2) NOT NULL DEFAULT 0,
    estado ENUM('pendente', 'concluida') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tarefas_disciplina_prazo (disciplina_id, data_prazo),
    CONSTRAINT fk_tarefas_disciplina
        FOREIGN KEY (disciplina_id)
        REFERENCES disciplinas (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;
