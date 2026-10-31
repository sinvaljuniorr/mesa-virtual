/* ==========================================================================
   data/tokens.js - Dados iniciais dos tokens da v1 (decisão D8).
   Em .js (não .json) por causa do file:// (decisão D2).
   O nome do agente é "Pierre" (renomeável no painel).
   E6: "imagens" guarda as duas versões do personagem (sem/com arma);
   "imagem" continua existindo para compatibilidade com estados antigos.
   As falas prontas vêm de data/falas.js (pelo id do token).
   ========================================================================== */

window.MESA_DADOS.tokens = [
  {
    id: "tok_personagem_01",
    nome: "Pierre",
    tipo: "personagem",               // "personagem" | "monstro"
    imagem: "assets/tokens/personagem-01.png",   // campo antigo (compatibilidade)
    imagens: {
      semArma: "assets/tokens/personagem-01.png",
      comArma: "assets/tokens/personagem-01-machado.png"
    },
    modoArma: "sem",                  // "sem" | "com"
    x: 400,
    y: 400,                           // centro do token (pixels do mundo)
    tamanho: 1,                       // largura em QUADRADOS (0,25 a 4)
    fichaId: "pierre",                // liga o token à ficha (data/ficha-pierre.js)
    // A ficha só traz um número por recurso: máximo inicial = atual (E3).
    recursos: {
      pv: { atual: 70, max: 70 },
      san: { atual: 80, max: 80 },
      pe: { atual: 50, max: 50 },
      rodadasMorrendo: 0,
      rodadasEnlouquecendo: 0
    }
  },
  {
    id: "tok_monstro_01",
    nome: "Monstro de teste",
    tipo: "monstro",
    imagem: null,                     // sem imagem = círculo desenhado em código
    imagens: { semArma: null, comArma: null },
    modoArma: "sem",
    x: 700,
    y: 400,
    tamanho: 1,
    recursos: null                    // sem ficha nem recursos (E3)
  },
  {
    id: "tok_dante",
    nome: "Dante",
    tipo: "personagem",
    imagem: "assets/tokens/dante.png", // campo antigo (compatibilidade)
    imagens: { semArma: "assets/tokens/dante.png", comArma: null },
    modoArma: "sem",
    x: 250,
    y: 250,                            // centro do token (pixels do mundo)
    tamanho: 1,
    recursos: null                     // sem ficha ainda (entra quando o mestre criar)
  },
  {
    id: "tok_duck",
    nome: "Duck",
    tipo: "personagem",
    imagem: "assets/tokens/duck.png",  // campo antigo (compatibilidade)
    imagens: { semArma: "assets/tokens/duck.png", comArma: null },
    modoArma: "sem",
    x: 250,
    y: 500,                            // centro do token (pixels do mundo)
    tamanho: 1,
    recursos: null                     // sem ficha ainda
  }
];
