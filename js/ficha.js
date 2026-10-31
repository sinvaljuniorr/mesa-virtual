/* ==========================================================================
   js/ficha.js - Funções PURAS da ficha (E3). Conhecidas pelo análise no
   ordemparanormal_fvtt: recurso com { atual, max } e operações que não
   mudam o estado por efeito colateral (quem chama grava no token).
   Nada de regra de Ordem Paranormal inventada: as regras dos estados
   "Morrendo" e "Enlouquecendo" NÃO são automatizadas.
   ========================================================================== */

(function () {
  "use strict";

  // Limita o VALOR ATUAL: inteiro, entre 0 e o máximo.
  function limitarValor(valor, maximo) {
    var n = Math.round(Number(valor));
    if (!isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > maximo) n = maximo;
    return n;
  }

  // Limita o MÁXIMO: inteiro, no mínimo 1.
  function limitarMaximo(valor) {
    var n = Math.round(Number(valor));
    if (!isFinite(n) || n < 1) n = 1;
    return n;
  }

  // Aplica uma MUDANÇA (positiva = cura/ganho; negativa = dano/gasto)
  // no recurso { atual, max }. Devolve novo objeto (não muda o original).
  // Chave "recurso" = "pv" | "san" | "pe".
  // Regra do painel (E3): o recurso voltando acima de 0 zera as rodadas
  // do estado correspondente (Morrendo/Enlouquecendo).
  function aplicarMudanca(recursos, recurso, quantidade) {
    var alvo = recursos[recurso];
    var novoMax = limitarMaximo(alvo.max);
    var novoAtual = limitarValor(alvo.atual + Math.round(Number(quantidade) || 0), novoMax);
    var copia = JSON.parse(JSON.stringify(recursos));
    copia[recurso] = { atual: novoAtual, max: novoMax };
    if (copia[recurso].atual > 0 && alvo.atual <= 0) {
      if (recurso === "pv") copia.rodadasMorrendo = 0;
      if (recurso === "san") copia.rodadasEnlouquecendo = 0;
    }
    return copia;
  }

  // Troca o valor atual diretamente (campo numérico do painel).
  function definirAtual(recursos, recurso, valor) {
    var alvo = recursos[recurso];
    var novoMax = limitarMaximo(alvo.max);
    return aplicarMudanca(recursos, recurso, limitarValor(valor, novoMax) - alvo.atual);
  }

  // Troca o máximo. Se o máximo cair abaixo do atual, o atual acompanha.
  function definirMaximo(recursos, recurso, valor) {
    var max = limitarMaximo(valor);
    var copia = JSON.parse(JSON.stringify(recursos));
    copia[recurso].max = max;
    copia[recurso].atual = limitarValor(copia[recurso].atual, max);
    return copia;
  }

  // Estado derivado: faixa visível e rodadas válidas.
  //   pv <= 0  => "Morrendo";  san <= 0 => "Enlouquecendo".
  // Rodadas ficam no intervalo 0..3 (três caixas na ficha).
  function estados(recursos) {
    return {
      morrendo: recursos.pv.atual <= 0,
      rodadasMorrendo: limitarRodadas(recursos.rodadasMorrendo || 0),
      enlouquecendo: recursos.san.atual <= 0,
      rodadasEnlouquecendo: limitarRodadas(recursos.rodadasEnlouquecendo || 0)
    };
  }

  function limitarRodadas(n) {
    var v = Math.round(Number(n));
    if (!isFinite(v) || v < 0) v = 0;
    if (v > 3) v = 3;
    return v;
  }

  // Perícias TREINADAS, ordenadas do maior para o menor valor.
  // Formato por linha: "Luta 8" (nome com maiúscula inicial).
  function periciasTreinadas(pericias) {
    var NOME = {
      atletismo: "Atletismo", luta: "Luta", intuicao: "Intuição",
      medicina: "Medicina", sobrevivencia: "Sobrevivência",
      diplomacia: "Diplomacia", intimidacao: "Intimidação", pontaria: "Pontaria"
    };
    var lista = [];
    for (var chave in pericias) {
      if (pericias[chave] === null || pericias[chave] === undefined || pericias[chave] === "") continue;
      lista.push({ nome: NOME[chave] || chave, valor: pericias[chave] });
    }
    lista.sort(function (a, b) { return b.valor - a.valor; });
    return lista;
  }

  MESA.ficha = {
    limitarValor: limitarValor,
    limitarMaximo: limitarMaximo,
    aplicarMudanca: aplicarMudanca,
    definirAtual: definirAtual,
    definirMaximo: definirMaximo,
    estados: estados,
    periciasTreinadas: periciasTreinadas
  };
})();
