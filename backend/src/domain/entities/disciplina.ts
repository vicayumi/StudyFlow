export class Disciplina {
    constructor(
        public readonly id: string,
        public nome: string,
        public cor: string = "#8B5CF6"
    ) {
        this.validar();
    }

    private validar(): void {
        if (!this.id.trim()) {
            throw new Error("O identificador é obrigatório.");
        }

        if (!this.nome.trim()) {
            throw new Error("O nome da disciplina é obrigatório.");
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(this.cor)) {
            throw new Error("A cor deve estar no formato hexadecimal.");
        }
    }

    public renomear(novoNome: string): void {
        if (!novoNome.trim()) {
            throw new Error("O nome da disciplina é obrigatório.");
        }

        this.nome = novoNome.trim();
    }

    public alterarCor(novaCor: string): void {
        if (!/^#[0-9A-Fa-f]{6}$/.test(novaCor)) {
            throw new Error("A cor deve estar no formato hexadecimal.");
        }

        this.cor = novaCor;
    }
}