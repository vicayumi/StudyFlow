import { conexao } from "./conexao.js";

async function testarConexao(): Promise<void> {
    try {
        const [resultado] = await conexao.query(
            "SELECT DATABASE() AS banco"
        );

        console.log("Conexão com MySQL estabelecida!");
        console.log(resultado);
    } catch (erro) {
        console.error("Erro ao conectar ao MySQL:", erro);
        process.exitCode = 1;
    } finally {
        await conexao.end();
    }
}

testarConexao();