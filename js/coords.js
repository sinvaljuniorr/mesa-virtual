/* ==========================================================================
   js/coords.js - Sistema de coordenadas (decisão D5).
   O mundo é o espaço do mapa em pixels (sem zoom). A câmera guarda qual
   pedaço do mundo está visível e com que aumento. Funções PURAS: recebem
   dados, devolvem números, não mexem no estado global.
   ========================================================================== */

(function () {
  "use strict";

  // O objeto global único do projeto (decisão D14). O primeiro script o cria.
  var MESA = (window.MESA = window.MESA || {});

  var LIMITES = {
    zoomMin: 0.2,
    zoomMax: 4,
    fatorRoda: 1.1           // aumento por passo da roda do mouse
  };

  // Converte um ponto da TELA (pixels do navegador) para o MUNDO (pixels do
  // mapa). "cam" é {x, y, zoom}: canto superior esquerdo da vista no mundo.
  function screenToWorld(sx, sy, cam) {
    return {
      x: cam.x + sx / cam.zoom,
      y: cam.y + sy / cam.zoom
    };
  }

  // Converte um ponto do MUNDO para a TELA. É o caminho inverso do acima.
  function worldToScreen(wx, wy, cam) {
    return {
      x: (wx - cam.x) * cam.zoom,
      y: (wy - cam.y) * cam.zoom
    };
  }

  // Converte um ponto da TELA para a célula da GRADE.
  // Cada célula mede (metrosPorQuadrado * pxPorMetro) pixels do mundo.
  function worldToGrid(wx, wy, cam, cena) {
    var passoPx = cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro;
    return {
      col: Math.floor(wx / passoPx),
      row: Math.floor(wy / passoPx)
    };
  }

  // O inverso: centro de uma célula da grade em coordenadas de mundo.
  function gridToWorld(col, row, cam, cena) {
    var passoPx = cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro;
    return {
      x: (col + 0.5) * passoPx,
      y: (row + 0.5) * passoPx
    };
  }

  // Zoom centrado no CURSOR: o ponto do mundo que está sob o mouse precisa
  // continuar exatamente sob o mouse depois do aumento (critério de pronto).
  // LIMITES de 0,2 a 4 aplicados aqui.
  function zoomPara(sx, sy, fator, cam) {
    var novoZoom = Math.min(LIMITES.zoomMax, Math.max(LIMITES.zoomMin, cam.zoom * fator));

    // Ponto do mundo sob o cursor ANTES do zoom...
    var mundo = screenToWorld(sx, sy, cam);

    // ...deve ficar no mesmo lugar depois: cam.x = mundo.x - sx / novoZoom.
    return {
      x: mundo.x - sx / novoZoom,
      y: mundo.y - sy / novoZoom,
      zoom: novoZoom
    };
  }

  // Converte o deltaY da roda para o "fator de zoom" do passo.
  // A decisão é fixa: 1,1 por passo (seção 5.3), como a spec exige — o
  // deltaMode só serve para descobrir a DIREÇÃO (para cima = aproxima).
  function fatorDaRoda(eventoRoda) {
    return eventoRoda.deltaY < 0 ? LIMITES.fatorRoda : 1 / LIMITES.fatorRoda;
  }

  // Este módulo se anexa ao objeto global MESA (criado no primero script).
  MESA.coords = {
    LIMITES: LIMITES,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    worldToGrid: worldToGrid,
    gridToWorld: gridToWorld,
    zoomPara: zoomPara,
    fatorDaRoda: fatorDaRoda
  };
})();
