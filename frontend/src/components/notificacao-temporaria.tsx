import { useEffect, useState } from "react";

interface NotificacaoTemporariaProps {
    mensagem: string;
    tipo: "erro" | "sucesso";
}

export default function NotificacaoTemporaria({ mensagem, tipo }: NotificacaoTemporariaProps) {
    const [visivel, setVisivel] = useState(Boolean(mensagem));

    useEffect(() => {
        if (!mensagem) {
            setVisivel(false);
            return;
        }

        setVisivel(true);
        const temporizador = window.setTimeout(() => setVisivel(false), 5000);
        return () => window.clearTimeout(temporizador);
    }, [mensagem]);

    if (!mensagem || !visivel) return null;

    return (
        <div className={`notificacao-app ${tipo}`} role={tipo === "erro" ? "alert" : "status"}>
            <span>{mensagem}</span>
            <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar notificação">×</button>
        </div>
    );
}
