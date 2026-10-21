import { describe, expect, it } from "vitest";
import { Tarefa } from "../domain/entities/tarefa.js";
import { EstrategiaCombinada } from "../domain/strategies/estrategia-combinada.js";
import { GeradorPlanejamento } from "../application/services/gerador-planejamento.js";

describe("GeradorPlanejamento", () => {
    const dataAtual = new Date("2026-10-20T08:00:00");

    function criarTarefa(
        id: string,
        duracaoEstimada: number,
        dataPrazo = new Date("2026-10-20T12:00:00")
    ): Tarefa {
        return new Tarefa(
            id,
            `Tarefa ${id}`,
            "Atividade de teste",
            dataPrazo,
            3,
            duracaoEstimada,
            50
        );
    }

    const gerador = new GeradorPlanejamento(
        new EstrategiaCombinada()
    );

    it("deve distribuir tarefas sem sobrepor sessões", () => {
        const tarefas = [
            criarTarefa("1", 60),
            criarTarefa("2", 60)
        ];

        const resultado = gerador.gerar(
            tarefas,
            [{
                inicio: new Date("2026-10-20T09:00:00"),
                fim: new Date("2026-10-20T10:30:00")
            }],
            dataAtual
        );

        const sessoesOrdenadas = [...resultado.sessoes].sort(
            (a, b) => a.inicio.getTime() - b.inicio.getTime()
        );

        for (let indice = 1; indice < sessoesOrdenadas.length; indice++) {
            expect(
                sessoesOrdenadas[indice].inicio.getTime()
            ).toBeGreaterThanOrEqual(
                sessoesOrdenadas[indice - 1].fim.getTime()
            );
        }
    });

    it("deve respeitar o prazo da tarefa", () => {
        const tarefa = criarTarefa(
            "3",
            90,
            new Date("2026-10-20T10:00:00")
        );

        const resultado = gerador.gerar(
            [tarefa],
            [{
                inicio: new Date("2026-10-20T09:00:00"),
                fim: new Date("2026-10-20T12:00:00")
            }],
            dataAtual
        );

        for (const sessao of resultado.sessoes) {
            expect(sessao.fim.getTime()).toBeLessThanOrEqual(
                tarefa.dataPrazo.getTime()
            );
        }
    });

    it("deve identificar tarefas sem tempo suficiente", () => {
        const tarefa = criarTarefa("4", 120);

        const resultado = gerador.gerar(
            [tarefa],
            [{
                inicio: new Date("2026-10-20T09:00:00"),
                fim: new Date("2026-10-20T10:00:00")
            }],
            dataAtual
        );

        expect(resultado.tarefasSemTempo).toContain("4");
    });

    it("não deve agendar tarefas concluídas", () => {
        const tarefa = criarTarefa("5", 60);
        tarefa.concluir();

        const resultado = gerador.gerar(
            [tarefa],
            [{
                inicio: new Date("2026-10-20T09:00:00"),
                fim: new Date("2026-10-20T11:00:00")
            }],
            dataAtual
        );

        expect(resultado.sessoes).toHaveLength(0);
        expect(resultado.tarefasSemTempo).toHaveLength(0);
    });
});