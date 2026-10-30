import type { Tarefa } from "../entities/tarefa.js";
import type { EstrategiaPrioridade } from "../interfaces/estrategia-prioridade.js";

export class EstrategiaPeso implements EstrategiaPrioridade {
    public calcularPrioridade(tarefa: Tarefa, _dataAtual: Date): number {
        return Math.round(tarefa.pesoAvaliacao * 100) / 100;
    }

    public explicarPrioridade(tarefa: Tarefa, _dataAtual: Date): string {
        return `Peso da avaliação: ${tarefa.pesoAvaliacao}%.`;
    }
}
