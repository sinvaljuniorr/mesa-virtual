/* ==========================================================================
   data/ficha-pierre.js - Ficha de papel do Pierre (transcrita da ficha
   anexada; ver README para editar). Em .js (não .json) por causa do file://
   (decisão D2). Nada é recalculado: os números são os da ficha.
   ========================================================================== */

window.MESA_DADOS.fichas = {
  pierre: {
    id: "pierre",
    nome: "Pierre",
    jogador: "Sinval",
    origem: "",
    classe: "Combatente",
    patente: "Veterano",
    nex: 20,

    atributos: { agi: 11, for: 12, int: 9, pre: 8, vig: 10 },

    defesa: 70,
    esquiva: 5,
    bloqueio: 10,
    protecao: "pesada",

    // null = fica em branco na ficha (não aparece na interface).
    resistencias: { corte: 4, impacto: 6, perfuracao: 2, balistico: null, danoMental: null },
    deslocamento: null,

    pericias: {
      atletismo: 7, luta: 8, intuicao: 4, medicina: 5,
      sobrevivencia: 3, diplomacia: 6, intimidacao: 2, pontaria: 1
    },

    ataques: [{
      arma: "machado",
      tipo: "corpo a corpo",
      ataque: "2d20",
      alcance: "curto",
      dano: "40",
      critico: "",   // em branco na ficha
      // Grafia mantida como está escrita na ficha ("Lacinante").
      especial: ["Lacinante", "Sanguinária predadora"]
    }]
  }
};
