import { Tarefa } from "../entities/tarefa.js";
import { EstrategiaPrioridade } from "../interfaces/estrategia-prioridade.js";

export class EstrategiaCombinada implements EstrategiaPrioridade {
    public calcularPrioridade(
        tarefa: Tarefa,
        dataAtual: Date
    ): number {
        const milissegundosPorDia = 1000 * 60 * 60 * 24;

        const diferenca = tarefa.dataPrazo.getTime() - dataAtual.getTime();

        const diasRestantes = Math.ceil(
            diferenca / milissegundosPorDia
        );

        let urgencia: number;

        if (diasRestantes <= 0) {
            urgencia = 100;
        } else {
            urgencia = Math.max(
                0,
                Math.min(100, 100 / (diasRestantes + 1))
            );
        }

        const dificuldade = ((tarefa.dificuldade - 1) / 4) * 100;
        const peso = tarefa.pesoAvaliacao;

        const prioridade =
            0.4 * urgencia +
            0.3 * dificuldade +
            0.3 * peso;

        return Math.round(prioridade * 100) / 100;
    }
}