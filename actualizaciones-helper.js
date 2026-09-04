(function () {
    if (typeof window === 'undefined') return;

    // Helpers compartidos para la página principal.
    // Este archivo existe para evitar referencias rotas en el HTML
    // y para centralizar utilidades ligeras en un solo lugar.
    window.ositoPageHelpers = window.ositoPageHelpers || {};
    window.ositoPageHelpers.loaded = true;
})();
