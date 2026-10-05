// Utilidades del Chat en Vivo e IA integradas en El Sótano de Osito
if (typeof window !== 'undefined') {
    window.LiveChatUtils = {
        obtenerUsuarioActual: function() {
            return localStorage.getItem('osito_ai_nombre') || 'Invitado';
        }
    };
}
