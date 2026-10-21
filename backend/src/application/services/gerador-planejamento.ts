import { Tarefa } from "../../domain/entities/tarefa.js";
import { SessaoEstudo } from "../../domain/entities/sessao-estudo.js";
import { EstrategiaPrioridade } from "../../domain/interfaces/estrategia-prioridade.js";

export interface HorarioDisponivel {
    inicio: Date;
    fim: Date;
}

export interface ResultadoPlanejamento {
    sessoes: SessaoEstudo[];
    tarefasSemTempo: string[];
}

export class GeradorPlanejamento {
    constructor(
        private readonly estrategia: EstrategiaPrioridade
    ) {}

    public gerar(
        tarefas: Tarefa[],
        horarios: HorarioDisponivel[],
        dataAtual: Date
    ): ResultadoPlanejamento {
        const sessoes: SessaoEstudo[] = [];
        const tarefasSemTempo: string[] = [];

        // Mantém somente intervalos válidos e futuros.
        const intervalosLivres = horarios
            .filter(horario => horario.fim > horario.inicio)
            .map(horario => ({
                inicio: new Date(
                    Math.max(
                        horario.inicio.getTime(),
                        dataAtual.getTime()
                    )
                ),
                fim: new Date(horario.fim)
            }))
            .filter(intervalo => intervalo.fim > intervalo.inicio)
            .sort(
                (a, b) =>
                    a.inicio.getTime() - b.inicio.getTime()
            );

        const tarefasOrdenadas = tarefas
            .filter(
                tarefa =>
                    tarefa.obterEstado() !== "concluida"
            )
            .sort(
                (a, b) =>
                    this.estrategia.calcularPrioridade(b, dataAtual) -
                    this.estrategia.calcularPrioridade(a, dataAtual)
            );

        let contadorSessoes = 0;

        for (const tarefa of tarefasOrdenadas) {
            let minutosRestantes = tarefa.obterTempoRestante();

            for (
                let indice = 0;
                indice < intervalosLivres.length &&
                minutosRestantes > 0;
            ) {
                const intervalo = intervalosLivres[indice];

                if (intervalo.inicio >= tarefa.dataPrazo) {
                    indice++;
                    continue;
                }

                const fimDisponivel = Math.min(
                    intervalo.fim.getTime(),
                    tarefa.dataPrazo.getTime()
                );

                const minutosDisponiveis =
                    (fimDisponivel - intervalo.inicio.getTime()) /
                    60000;

                if (minutosDisponiveis <= 0) {
                    indice++;
                    continue;
                }

                const minutosAgendados = Math.min(
                    minutosRestantes,
                    minutosDisponiveis
                );

                const inicio = new Date(intervalo.inicio);
                const fim = new Date(
                    inicio.getTime() + minutosAgendados * 60000
                );

                sessoes.push(
                    new SessaoEstudo(
                        `sessao-${++contadorSessoes}`,
                        tarefa.id,
                        inicio,
                        fim
                    )
                );

                minutosRestantes -= minutosAgendados;

                // Reserva o intervalo utilizado, evitando sobreposição.
                if (fim >= intervalo.fim) {
                    intervalosLivres.splice(indice, 1);
                } else {
                    intervalo.inicio = fim;
                    indice++;
                }
            }

            if (minutosRestantes > 0) {
                tarefasSemTempo.push(tarefa.id);
            }
        }

        return { sessoes, tarefasSemTempo };
    }
}