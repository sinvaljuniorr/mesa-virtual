/* ==========================================================================
   js/principal.js - Inicialização do aplicativo.
   Carrega por ÚLTIMO: quando roda, todos os outros módulos já existem no
   objeto global MESA. Ordem de arranque:
     1) estado (memória + localStorage)
     2) render (canvas e laço de desenho)
     3) entrada (mouse, roda, teclado)
     4) ferramentas (barra)
     5) interface (banner, faixa, painel)
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  function iniciar() {
    MESA.estado.iniciar();
    MESA.render.iniciar();
    MESA.entrada.iniciar();
    MESA.ferramentas.iniciar();
    MESA.interface.iniciar();

    console.log("Mesa Virtual (Etapa 0) iniciada.");
  }

  // Espera o DOM estar pronto (o script já está no fim do body, então é
  // quase imediato, mas por segurança usamos DOMContentLoaded).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
