/* ==========================================================================
   js/dados-iniciais.js - Junto os pedaços de dados em dados-iniciais (D8).
   Converte window.MESA_DADOS (definido em data/*.js) no formato do estado
   completo do jogo (cenas[] + cenaAtiva). A cópia é PROFUNDA
   (structuredClone) para que modificações não alterem os dados originais
   (importantes para o "Redefinir cena").
   ========================================================================== */

(function () {
  "use strict";

  var MESA = (window.MESA = window.MESA || {});

  var MESA_DADOS = window.MESA_DADOS;

  // Constrói o estado inicial no formato do modelo de dados (docs seção 6).
  // Copia profunda: o "Redefinir cena" volta exatamente a este conteúdo.
  function construir() {
    if (!MESA_DADOS || !MESA_DADOS.cena) {
      console.error("window.MESA_DADOS não foi definido (data/cena-casa.js).");
      return {
        versao: 1,
        cenaAtiva: "casa",
        cenas: []
      };
    }

    return {
      versao: MESA_DADOS.versao,
      cenaAtiva: MESA_DADOS.cena.id,
      cenas: [
        // Os tokens iniciais entram DENTRO da cena (docs seção 6).
        Object.assign(structuredClone(MESA_DADOS.cena), {
          tokens: structuredClone(MESA_DADOS.tokens || [])
        })
      ]
    };
  }

  MESA.dados = {
    construir: construir
  };
})();
