/* ==========================================================================
   js/arma.js - Modo arma (E6).
   O token guarda duas imagens (imagens.semArma / imagens.comArma) e o modo
   atual ("sem" | "com"). Este módulo só decide QUAL imagem usar e alterna
   o modo; o desenho/carregamento fica em js/render.js.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  // O token tem imagem com arma cadastrada?
  function temImagemComArma(token) {
    return !!(token && token.imagens && token.imagens.comArma);
  }

  // Modo EFETIVO: "com" só vale se a imagem existir.
  function modo(token) {
    if (!token) return "sem";
    return (token.modoArma === "com" && temImagemComArma(token)) ? "com" : "sem";
  }

  // Caminho da imagem a desenhar no modo atual.
  function imagem(token) {
    if (!token) return null;
    var imgs = token.imagens || {};
    if (modo(token) === "com") return imgs.comArma;
    return imgs.semArma || token.imagem || null;
  }

  // Define o modo ("sem" | "com"), salva e repinta. Devolve true se mudou.
  function definirModo(token, novo) {
    if (!token) return false;
    if (novo !== "com" && novo !== "sem") return false;
    if (novo === "com" && !temImagemComArma(token)) return false;
    if (token.modoArma === novo) return false;
    token.modoArma = novo;
    MESA.estado.salvar();
    MESA.estado.precisaRenderizar();
    if (MESA.interface) MESA.interface.atualizarPainelToken();
    return true;
  }

  // Alterna o modo de um token (true se alternou).
  function alternar(token) {
    if (!token || !temImagemComArma(token)) return false;
    return definirModo(token, modo(token) === "com" ? "sem" : "com");
  }

  // Atalho global A: age no token selecionado; sem seleção, avisa 2 s.
  function alternarSelecionado() {
    var id = MESA.ferramentas.tokenSelecionado();
    if (!id) {
      MESA.interface.mostrarAviso("Selecione um token.", 2000);
      return false;
    }
    var token = MESA.estado.cena().tokens.find(function (t) { return t.id === id; });
    return alternar(token);
  }

  // Nome da arma da ficha (ex.: "machado") ou null se não houver ataque.
  function nomeArmaDaFicha(token) {
    if (!token || !token.fichaId) return null;
    var fichas = (window.MESA_DADOS && window.MESA_DADOS.fichas) || {};
    var ficha = fichas[token.fichaId];
    if (!ficha || !Array.isArray(ficha.ataques) || !ficha.ataques.length) return null;
    return ficha.ataques[0].arma || null;
  }

  MESA.arma = {
    temImagemComArma: temImagemComArma,
    modo: modo,
    imagem: imagem,
    definirModo: definirModo,
    alternar: alternar,
    alternarSelecionado: alternarSelecionado,
    nomeArmaDaFicha: nomeArmaDaFicha
  };
})();
