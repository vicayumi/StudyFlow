import { describe, expect, it } from "vitest";
import { Tarefa } from "../domain/entities/tarefa.js";

describe("Classe Tarefa", () => {
    function criarTarefa(): Tarefa {
        return new Tarefa(
            "tarefa-1",
            "Lista de exercícios",
            "Resolver os exercícios da disciplina",
            new Date("2026-11-10T12:00:00"),
            3,
            120,
            20
        );
    }

    it("deve criar uma tarefa com estado pendente", () => {
        const tarefa = criarTarefa();

        expect(tarefa.obterEstado()).toBe("pendente");
    });

    it("deve concluir uma tarefa", () => {
        const tarefa = criarTarefa();

        tarefa.concluir();

        expect(tarefa.obterEstado()).toBe("concluida");
    });

    it("não deve permitir dificuldade fora do intervalo", () => {
        expect(() => {
            criarTarefa().atualizarDificuldade(6);
        }).toThrow(
            "A dificuldade deve ser um número inteiro entre 1 e 5."
        );
    });

    it("não deve permitir duração estimada negativa", () => {
        expect(() => {
            new Tarefa(
                "tarefa-2",
                "Prova",
                "Estudar para a prova",
                new Date("2026-11-10T12:00:00"),
                4,
                -30
            );
        }).toThrow(
            "A duração estimada deve ser maior que zero."
        );
    });

    it("deve calcular o tempo restante", () => {
        const tarefa = criarTarefa();

        tarefa.registrarTempoEstudado(45);

        expect(tarefa.obterTempoEstudado()).toBe(45);
        expect(tarefa.obterTempoRestante()).toBe(75);
    });

    it("deve manter a tarefa pendente ao registrar tempo estudado", () => {
        const tarefa = criarTarefa();

        tarefa.registrarTempoEstudado(30);

        expect(tarefa.obterEstado()).toBe("pendente");
    });

    it("não deve permitir registrar mais tempo que o restante", () => {
        const tarefa = criarTarefa();

        expect(() => {
            tarefa.registrarTempoEstudado(121);
        }).toThrow(
            "O tempo registrado não pode ultrapassar o tempo restante."
        );
    });

    it("não deve permitir registrar tempo negativo", () => {
        const tarefa = criarTarefa();

        expect(() => {
            tarefa.registrarTempoEstudado(-10);
        }).toThrow(
            "O tempo estudado deve ser maior que zero."
        );
    });

    it("não deve permitir registrar estudo após a conclusão", () => {
        const tarefa = criarTarefa();

        tarefa.concluir();

        expect(() => {
            tarefa.registrarTempoEstudado(10);
        }).toThrow(
            "Não é possível registrar estudo em uma tarefa concluída."
        );
    });
});
