import { Tarefa } from "../entities/tarefa.js";

export interface EstrategiaPrioridade {
    calcularPrioridade(tarefa: Tarefa, dataAtual: Date): number;
    explicarPrioridade(tarefa: Tarefa, dataAtual: Date): string;
}
