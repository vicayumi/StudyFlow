
import "dotenv/config";
import express from "express";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import rotasDisciplinas from "./http/routes/rotas-disciplinas.js";
import rotasTarefas from "./http/routes/rotas-tarefas.js";
import rotasPlanejamento from "./http/routes/rotas-planejamento.js";
import rotasAutenticacao from "./http/routes/rotas-autenticacao.js";
import rotasSessoesEstudo from "./http/routes/rotas-sessoes-estudo.js";
import { autenticar } from "./http/middleware/autenticar.js";
import { prepararBanco } from "./infrastructure/database/preparar-banco.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const origensPermitidas = (
    process.env.CORS_ORIGINS ?? "http://localhost:5173"
)
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean);

app.use(cors({
    origin: origensPermitidas
}));

app.use(express.json({ limit: "1mb" }));

app.get("/", (_requisicao, resposta) => {
    resposta.json({
        mensagem: "StudyFlow API está funcionando!"
    });
});

app.use("/api/autenticacao", rotasAutenticacao);
app.use("/api", autenticar);
app.use("/api/disciplinas", rotasDisciplinas);

app.use("/api/tarefas", rotasTarefas);
app.use("/api/planejamento", rotasPlanejamento);
app.use("/api/sessoes-estudo", rotasSessoesEstudo);

app.use((_requisicao: Request, resposta: Response) => {
    resposta.status(404).json({
        erro: "Rota não encontrada."
    });
});

app.use((
    erro: unknown,
    _requisicao: Request,
    resposta: Response,
    _proxima: NextFunction
) => {
    if (erro instanceof SyntaxError) {
        resposta.status(400).json({
            erro: "O corpo da requisição contém JSON inválido."
        });
        return;
    }

    console.error("Erro inesperado na API:", erro);
    resposta.status(500).json({
        erro: "Ocorreu um erro interno. Tente novamente."
    });
});

void prepararBanco()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`StudyFlow API rodando em http://localhost:${PORT}`);
        });
    })
    .catch((erro: unknown) => {
        console.error("Não foi possível preparar o banco de dados:", erro);
        process.exitCode = 1;
    });
