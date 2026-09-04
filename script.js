exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { messages, systemPrompt } = JSON.parse(event.body);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages
            })
        });

        const data = await response.json();
        const texto = data.content.map(i => i.type === "text" ? i.text : "").filter(Boolean).join("\n");

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ respuesta: texto })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error al conectar con la IA." })
        };
    }
};

// Utilidades del Chat en Vivo integradas en El Sótano de Osito
if (typeof window !== 'undefined') {
    window.LiveChatUtils = {
        obtenerUsuarioActual: function() {
            return localStorage.getItem('osito_ai_nombre') || 'Invitado';
        }
    };
}