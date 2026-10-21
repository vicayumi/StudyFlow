
import express from "express";
import cors from "cors";
import rotasDisciplinas from "./http/routes/rotas-disciplinas.js";
import rotasTarefas from "./http/routes/rotas-tarefas.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/", (_requisicao, resposta) => {
    resposta.json({
        mensagem: "StudyFlow API está funcionando!"
    });
});

app.use("/api/disciplinas", rotasDisciplinas);

app.use("/api/tarefas", rotasTarefas);

app.listen(PORT, () => {
    console.log(`StudyFlow API rodando em http://localhost:${PORT}`);
});
