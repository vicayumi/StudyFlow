import type { Tarefa } from "../entities/tarefa.js";
import type { EstrategiaPrioridade } from "../interfaces/estrategia-prioridade.js";

export class EstrategiaUrgencia implements EstrategiaPrioridade {
    public calcularPrioridade(tarefa: Tarefa, dataAtual: Date): number {
        const dias = Math.ceil((tarefa.dataPrazo.getTime() - dataAtual.getTime()) / 86_400_000);
        return Math.round(Math.max(0, Math.min(100, dias <= 0 ? 100 : 100 / (dias + 1))) * 100) / 100;
    }

    public explicarPrioridade(tarefa: Tarefa, dataAtual: Date): string {
        const dias = Math.ceil((tarefa.dataPrazo.getTime() - dataAtual.getTime()) / 86_400_000);
        return dias <= 0 ? "Prazo vence hoje ou já passou." : `Prazo em ${dias} dia(s).`;
    }
}
