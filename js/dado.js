/* ==========================================================================
   js/dado.js - Rolador de d20 (E5). Modelos confirmados na Fase 1
   (d20-roll.mjs / d20-die.mjs do ordemparanormal_fvtt):
     - crítico no 20 NATURAL, falha crítica no 1 NATURAL;
     - vantagem/desvantagem: rola 2d20 e pega o maior/menor;
     - modificador somado ao resultado do dado.
   Funções PURAS: nada de regra inventada além desses comportamentos.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  function dado() {
    return Math.floor(Math.random() * 20) + 1;
  }

  // Opções: { vantagem: bool, desvantagem: bool, modificador: número,
  //           rotulo: string opcional (ex.: "Luta") }.
  // Devolve { dados, dado, modificador, total, critico, falha }.
  // critico/falha consideram o DADO NATURAL escolhido (com vantagem, o
  // 20 de um dos dados é crítico — como no D20Roll estudado).
  function rolar(opcoes) {
    var o = opcoes || {};
    var mod = Math.round(Number(o.modificador) || 0);
    var dados = [];

    if (o.vantagem && o.desvantagem) { // anula (padrão usual; [L] confirmar no livro)
      o = { modificador: mod };
    }

    if (o.vantagem || o.desvantagem) {
      var a = dado(), b = dado();
      dados = [a, b];
      var escolhido = o.vantagem ? Math.max(a, b) : Math.min(a, b);
      return {
        dados: dados,
        dado: escolhido,
        modificador: mod,
        total: escolhido + mod,
        critico: escolhido === 20,
        falha: escolhido === 1,
        vantagem: !!o.vantagem,
        desvantagem: !!o.desvantagem,
        rotulo: o.rotulo || ""
      };
    }

    var n = dado();
    dados = [n];
    return {
      dados: dados,
      dado: n,
      modificador: mod,
      total: n + mod,
      critico: n === 20,
      falha: n === 1,
      vantagem: false,
      desvantagem: false,
      rotulo: o.rotulo || ""
    };
  }

  // Texto pt-BR do resultado (usado na bolha e no histórico).
  function texto(r) {
    var base = "d20 " + (r.rotulo ? r.rotulo + " " : "") + "→ " + r.total;
    var detalhe = "(" + r.dado + (r.modificador ? (r.modificador > 0 ? "+" : "") + r.modificador : "");
    if (r.dados.length > 1) detalhe = "(dados " + r.dados.join(", ") + ", escolhido " + r.dado;
    else detalhe = "(dado " + r.dado;
    if (r.modificador) detalhe += (r.modificador > 0 ? " +" : " −") + Math.abs(r.modificador);
    detalhe += ")";
    base += " " + detalhe;
    if (r.critico) base = "CRÍTICO! " + base;
    else if (r.falha) base = "FALHA CRÍTICA! " + base;
    else if (r.vantagem) base = "Vantagem: " + base;
    else if (r.desvantagem) base = "Desvantagem: " + base;
    return base;
  }

  MESA.dado = {
    rolar: rolar,
    texto: texto
  };
})();
