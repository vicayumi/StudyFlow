export class SessaoEstudo {
    constructor(
        public readonly id: string,
        public readonly tarefaId: string,
        public readonly inicio: Date,
        public readonly fim: Date
    ) {
        if (this.fim <= this.inicio) {
            throw new Error("O fim deve ser posterior ao início.");
        }
    }

    public obterDuracao(): number {
        return (this.fim.getTime() - this.inicio.getTime()) / 60000;
    }
}