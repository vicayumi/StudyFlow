import { describe, expect, it } from "vitest";
import { Tarefa } from "../domain/entities/tarefa.js";
import { EstrategiaCombinada } from "../domain/strategies/estrategia-combinada.js";
import { EstrategiaDificuldade } from "../domain/strategies/estrategia-dificuldade.js";
import { EstrategiaPeso } from "../domain/strategies/estrategia-peso.js";
import { EstrategiaUrgencia } from "../domain/strategies/estrategia-urgencia.js";

describe("Estratégias de prioridade", () => {
    const hoje = new Date("2026-11-09T12:00:00");

    function tarefa(opcoes: {
        dificuldade?: number;
        peso?: number;
        prazo?: Date;
    } = {}): Tarefa {
        return new Tarefa(
            "tarefa-teste",
            "Lista de exercícios",
            "Resolver os exercícios",
            opcoes.prazo ?? new Date("2026-11-12T12:00:00"),
            opcoes.dificuldade ?? 3,
            60,
            opcoes.peso ?? 20
        );
    }

    it("calcula urgência maior para prazos mais próximos", () => {
        const estrategia = new EstrategiaUrgencia();
        const proxima = estrategia.calcularPrioridade(tarefa({ prazo: new Date("2026-11-10T12:00:00") }), hoje);
        const distante = estrategia.calcularPrioridade(tarefa({ prazo: new Date("2026-11-19T12:00:00") }), hoje);

        expect(proxima).toBeGreaterThan(distante);
        expect(estrategia.explicarPrioridade(tarefa({ prazo: new Date("2026-11-10T12:00:00") }), hoje)).toContain("1 dia");
    });

    it("dá pontuação proporcional à dificuldade", () => {
        const estrategia = new EstrategiaDificuldade();

        expect(estrategia.calcularPrioridade(tarefa({ dificuldade: 1 }), hoje)).toBe(0);
        expect(estrategia.calcularPrioridade(tarefa({ dificuldade: 5 }), hoje)).toBe(100);
        expect(estrategia.explicarPrioridade(tarefa({ dificuldade: 4 }), hoje)).toContain("4 de 5");
    });

    it("usa o peso da avaliação como prioridade", () => {
        const estrategia = new EstrategiaPeso();

        expect(estrategia.calcularPrioridade(tarefa({ peso: 0 }), hoje)).toBe(0);
        expect(estrategia.calcularPrioridade(tarefa({ peso: 75 }), hoje)).toBe(75);
        expect(estrategia.explicarPrioridade(tarefa({ peso: 75 }), hoje)).toContain("75%");
    });

    it("combina urgência, dificuldade e peso com os coeficientes definidos", () => {
        const estrategia = new EstrategiaCombinada();
        const atividade = tarefa({
            prazo: new Date("2026-11-10T12:00:00"),
            dificuldade: 3,
            peso: 20
        });

        // Urgência: 50; dificuldade: 50; peso: 20.
        expect(estrategia.calcularPrioridade(atividade, hoje)).toBe(41);
        expect(estrategia.explicarPrioridade(atividade, hoje)).toContain("dificuldade (3/5)");
    });
});
