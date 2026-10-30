import type { Tarefa } from "../entities/tarefa.js";
import type { EstrategiaPrioridade } from "../interfaces/estrategia-prioridade.js";

export class EstrategiaDificuldade implements EstrategiaPrioridade {
    public calcularPrioridade(tarefa: Tarefa, _dataAtual: Date): number {
        return Math.round(((tarefa.dificuldade - 1) / 4) * 10000) / 100;
    }

    public explicarPrioridade(tarefa: Tarefa, _dataAtual: Date): string {
        return `Dificuldade informada: ${tarefa.dificuldade} de 5.`;
    }
}
