export type EstadoTarefa =
    | "pendente"
    | "concluida";

export class Tarefa {
    private estado: EstadoTarefa = "pendente";
    private tempoEstudado = 0;

    constructor(
        public readonly id: string,
        public titulo: string,
        public descricao: string,
        public dataPrazo: Date,
        public dificuldade: number,
        public duracaoEstimada: number,
        public readonly pesoAvaliacao: number = 0
    ) {
        this.validarDados();
    }

    private validarDados(): void {
        if (!this.id.trim()) {
            throw new Error(
                "O identificador da tarefa é obrigatório."
            );
        }

        if (!this.titulo.trim()) {
            throw new Error(
                "O título da tarefa é obrigatório."
            );
        }

        if (Number.isNaN(this.dataPrazo.getTime())) {
            throw new Error("A data do prazo é inválida.");
        }

        if (
            !Number.isInteger(this.dificuldade) ||
            this.dificuldade < 1 ||
            this.dificuldade > 5
        ) {
            throw new Error(
                "A dificuldade deve ser um número inteiro entre 1 e 5."
            );
        }

        if (
            !Number.isFinite(this.duracaoEstimada) ||
            this.duracaoEstimada <= 0
        ) {
            throw new Error(
                "A duração estimada deve ser maior que zero."
            );
        }

        if (
            !Number.isFinite(this.pesoAvaliacao) ||
            this.pesoAvaliacao < 0 ||
            this.pesoAvaliacao > 100
        ) {
            throw new Error(
                "O peso da avaliação deve estar entre 0 e 100."
            );
        }
    }

    public obterEstado(): EstadoTarefa {
        return this.estado;
    }

    public obterTempoEstudado(): number {
        return this.tempoEstudado;
    }

    public obterTempoRestante(): number {
        return Math.max(
            0,
            this.duracaoEstimada - this.tempoEstudado
        );
    }

    public registrarTempoEstudado(minutos: number): void {
        if (this.estado === "concluida") {
            throw new Error(
                "Não é possível registrar estudo em uma tarefa concluída."
            );
        }

        if (!Number.isFinite(minutos) || minutos <= 0) {
            throw new Error(
                "O tempo estudado deve ser maior que zero."
            );
        }

        if (minutos > this.obterTempoRestante()) {
            throw new Error(
                "O tempo registrado não pode ultrapassar o tempo restante."
            );
        }

        this.tempoEstudado += minutos;
    }

    public concluir(): void {
        if (this.estado === "concluida") {
            throw new Error("A tarefa já foi concluída.");
        }

        this.estado = "concluida";
    }

    public reabrir(): void {
        if (this.estado !== "concluida") {
            throw new Error("Somente tarefas concluídas podem ser reabertas.");
        }

        this.estado = "pendente";
    }

    public atualizarDificuldade(novaDificuldade: number): void {
        if (
            !Number.isInteger(novaDificuldade) ||
            novaDificuldade < 1 ||
            novaDificuldade > 5
        ) {
            throw new Error(
                "A dificuldade deve ser um número inteiro entre 1 e 5."
            );
        }

        this.dificuldade = novaDificuldade;
    }

    public atualizarPrazo(novoPrazo: Date): void {
        if (Number.isNaN(novoPrazo.getTime())) {
            throw new Error("A nova data do prazo é inválida.");
        }

        this.dataPrazo = novoPrazo;
    }
}
