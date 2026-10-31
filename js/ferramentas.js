/* ==========================================================================
   js/ferramentas.js - As quatro ferramentas da barra (docs seção 5.3):
     Selecionar (V) | Mover mapa (H) | Régua (R) | Calibrar escala (C).
   Na Etapa 0, "Régua" e "Calibrar" apenas trocam o cursor (ficam funcionais
   na Etapa 2). Este módulo atualiza os botões da barra e conversa com
   entrada.js (que executa os gestos de cada ferramenta).
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var botoes = {};        // id de botão por nome de ferramenta
  var ferramentaAtiva = "selecionar";

  // Mapeamento ferramenta -> id do botão na barra.
  var MAPA_BOTOES = {
    selecionar: "bt-selecionar",
    mover: "bt-mover",
    regua: "bt-regua",
    calibrar: "bt-calibrar",
    nevoa: "bt-nevoa"
  };

  // E4: preview de um retângulo de névoa em curso (efêmero).
  var nevoaPreviewRetangulo = null; // {x1,y1,x2,y2} ou null

  // Troca a ferramenta ativa: atualiza botões, dica e limpa a régua.
  function selecionarFerramenta(nome) {
    if (!MAPA_BOTOES[nome]) return;
    ferramentaAtiva = nome;

    // Destaca só o botão da ferramenta ativa (classe .ativa do CSS).
    for (var nomeFerr in MAPA_BOTOES) {
      var bt = document.getElementById(MAPA_BOTOES[nomeFerr]);
      if (nomeFerr === nome) bt.classList.add("ativa");
      else bt.classList.remove("ativa");
    }

    // Trocar de ferramenta CLAREIA a régua (docs 5.5).
    MESA.ferramentas.limparMedicao();

    // Dica da ferramenta (docs 5.3, textos exatos).
    if (nome === "regua") {
      MESA.interface.mostrarDica("Arraste de um ponto a outro. Esc cancela.");
    } else if (nome === "calibrar") {
      MESA.interface.mostrarDica("Arraste sobre uma distância que você conhece (por exemplo, o comprimento de um cômodo).");
    } else if (nome === "nevoa") {
      MESA.nevoaTextosDica ? MESA.nevoaTextosDica(nome) : null;
      MESA.interface.mostrarDica(
        "Arraste para pintar a névoa. Shift troca o modo (revelar/esconder). Esc volta para Selecionar.");
    } else {
      MESA.interface.esconderDica();
    }

    // Névoa (E4): trocar de ferramenta descarta o retângulo em curso.
    descartarPreviewNevoa();

    // A entrada muda o cursor e o comportamento do mouse.
    MESA.entrada.definirFerramenta(nome);
  }

  // ---------------------------------------------------------------
  // Seleção de token (Etapa 1). A seleção é efêmera: não é salva.
  // ---------------------------------------------------------------
  var tokenSelecionadoId = null;

  function selecionarToken(id) {
    tokenSelecionadoId = id;
    MESA.interface.atualizarPainelToken();
    MESA.estado.precisaRenderizar();
  }

  function tokenSelecionado() {
    return tokenSelecionadoId;
  }

  // Hit-test: devolve o token SOB o ponto (coordenadas de mundo), ou null.
  // Percorre de trás para frente: o último token desenhado é o que vence
  // (docs 5.7). Usa o tamanho calculado pelo render (largura/altura reais).
  function tokenNoPonto(x, y) {
    var cena = MESA.estado.cena();
    for (var i = cena.tokens.length - 1; i >= 0; i--) {
      var token = cena.tokens[i];
      var t = MESA.render.tamanhoDoToken(token, cena);
      var metadeL = t.largura / 2;
      var metadeA = t.altura / 2;
      if (x >= token.x - metadeL && x <= token.x + metadeL &&
          y >= token.y - metadeA && y <= token.y + metadeA) {
        // E4: token sob célula escondida é invisível -> não é clicável
        // (repare a névoa para mexer nele).
        if (MESA.nevoa.celulaEscondida && MESA.nevoa.celulaEscondida(cena, token.x, token.y)) continue;
        return token;
      }
    }
    return null;
  }

  // Tamanho do token selecionado (docs 5.4): passo 0,25; entre 0,25 e 4.
  function mudarTamanho(delta) {
    var token = cena().tokens.find(function (t) { return t.id === tokenSelecionadoId; });
    if (!token) return;

    var novo = Math.round((token.tamanho + delta) * 4) / 4; // passo de 0,25
    token.tamanho = Math.max(0.25, Math.min(4, novo));
    MESA.estado.precisaRenderizar();
    MESA.interface.atualizarPainelToken();
    salvarComAtraso();
  }

  function tamanhoPadrao() {
    var token = cena().tokens.find(function (t) { return t.id === tokenSelecionadoId; });
    if (!token) return;
    token.tamanho = 1; // padrão da v1
    MESA.estado.precisaRenderizar();
    MESA.interface.atualizarPainelToken();
    salvarComAtraso();
  }

  var cronometroSalvar = null;
  function salvarComAtraso() {
    clearTimeout(cronometroSalvar);
    cronometroSalvar = setTimeout(function () {
      MESA.estado.salvar();
    }, 300);
  }

  // A cena ativa (atalho usado acima).
  function cena() { return MESA.estado.cena(); }

  // Liga os cliques dos botões às ferramentas.
  function iniciar() {
    for (var nomeFerr in MAPA_BOTOES) {
      var bt = document.getElementById(MAPA_BOTOES[nomeFerr]);
      bt.addEventListener("click", function () {
        selecionarFerramenta(this.getAttribute("data-ferramenta"));
      });
      bt.setAttribute("data-ferramenta", nomeFerr);
    }

    // Estado inicial da barra: "Selecionar" ativa.
    selecionarFerramenta("selecionar");
  }

  // ---------------------------------------------------------------
  // RÉGUA (Etapa 2). A medição é efêmera: fica na tela até nova
  // medição, troca de ferramenta ou Esc. NÃO é salva no estado.
  //   inicio/fim = pontos do MUNDO (com ímã nos tokens).
  // ---------------------------------------------------------------
  var medicao = { visivel: false, inicio: null, fim: null };

  function iniciarMedicao(x, y) {
    medicao.visivel = true;
    medicao.inicio = imantar(x, y);
    medicao.fim = medicao.inicio;
    MESA.estado.precisaRenderizar();
  }

  function atualizarMedicao(x, y) {
    if (!medicao.visivel) return;
    medicao.fim = imantar(x, y);
    MESA.estado.precisaRenderizar();
  }

  function finalizarMedicao() {
    // mantém visível até Esc / trocar ferramenta / nova medição
    MESA.estado.precisaRenderizar();
  }

  function limparMedicao() {
    medicao.visivel = false;
    medicao.inicio = null;
    medicao.fim = null;
    MESA.estado.precisaRenderizar();
  }

  function medicaoAtual() { return medicao; }

  // ÍMÃ (docs 5.5): se o ponto cai sobre um token, vai para o CENTRO dele.
  // Assim, de token a token, o rótulo mede distância token->token.
  function imantar(x, y) {
    var token = tokenNoPonto(x, y);
    if (token) return { x: token.x, y: token.y };
    return { x: x, y: y };
  }

  // ---------------------------------------------------------------
  // GRADE (Etapa 2): alterna por botão ou tecla G; salva no estado.
  // A grade em si é desenhada pelo render (linhas por quadrado).
  // ---------------------------------------------------------------
  function alternarGrade() {
    var c = cena();
    c.grade.visivel = !c.grade.visivel;
    MESA.estado.precisaRenderizar();
    salvarComAtraso();
  }

  // ---------------------------------------------------------------
  // Calibração (Etapa 2): o diálogo pede os metros; a fórmula é
  // pxPorMetro = comprimento da linha (mundo, px) / metros.
  // ---------------------------------------------------------------
  function calibrarComMedicao(metros) {
    if (!medicao.visivel || !medicao.inicio || !medicao.fim) return false;
    var dx = medicao.fim.x - medicao.inicio.x;
    var dy = medicao.fim.y - medicao.inicio.y;
    var px = Math.sqrt(dx * dx + dy * dy);
    if (px <= 0) return false;

    cena().escala.pxPorMetro = Math.round(px / metros * 10) / 10;
    cena().escala.calibrada = true;
    MESA.estado.salvar();
    MESA.interface.atualizarEscala(cena());
    MESA.estado.precisaRenderizar();
    return true;
  }

  // ---------------------------------------------------------------
  // NÉVOA (E4): forma pincel/retângulo e modo revelar/esconder.
  // A máscara vive em js/nevoa.js (D10); o arraste é feito pela
  // entrada.js, que chama MESA.ferramentas.nevoaPincel etc.
  // ---------------------------------------------------------------
  var nevoaForma = "pincel";   // "pincel" | "retangulo"
  var nevoaModo = "revelar";   // "revelar" | "esconder"

  function nevoaFormaAtual() { return nevoaForma; }
  function nevoaModoAtual() { return nevoaModo; }

  function definirNevoaForma(forma) {
    nevoaForma = forma === "retangulo" ? "retangulo" : "pincel";
  }

  function definirNevoaModo(modo) {
    nevoaModo = modo === "esconder" ? "esconder" : "revelar";
  }

  // Pincel em um trecho do gesto (último -> atual), com Shift = modo trocado.
  function nevoaSeguir(x1, y1, x2, y2, usarShift) {
    var cenaAtual = MESA.estado.cena();
    if (!cenaAtual.nevoa || !cenaAtual.nevoa.visivel) return false;
    var modo = usarShift ? (nevoaModo === "revelar" ? "esconder" : "revelar") : nevoaModo;
    var raio = nevoaForma === "pincel" ? raioPincel() : 0;
    return MESA.nevoa.seguirPincel(cenaAtual, x1, y1, x2, y2, modo, raio);
  }

  function nevoaRetangulo(x1, y1, x2, y2, usarShift) {
    var cenaAtual = MESA.estado.cena();
    if (!cenaAtual.nevoa || !cenaAtual.nevoa.visivel) return false;
    var modo = usarShift ? (nevoaModo === "revelar" ? "esconder" : "revelar") : nevoaModo;
    MESA.nevoa.pintarRetangulo(cenaAtual, x1, y1, x2, y2, modo === "esconder");
    return true;
  }

  function raioPincel() {
    var el = document.getElementById("campo-nevoa-pincel");
    var n = Math.round(Number(el && el.value));
    if (!isFinite(n) || n < 0) n = 1;
    return Math.min(n, 6);
  }

  function nevoaLigada() {
    var n = cena().nevoa;
    return !!(n && n.visivel);
  }

  function alternarNevoa() {
    var cenaAtual = cena();
    if (!cenaAtual.nevoa) cenaAtual.nevoa = { visivel: false, larguraCel: 0, alturaCel: 0, dados: "" };
    cenaAtual.nevoa.visivel = !cenaAtual.nevoa.visivel;
    if (cenaAtual.nevoa.visivel) MESA.nevoa.garantir(cenaAtual); // cria a máscara (tudo escondido)
    MESA.estado.precisaRenderizar();
    MESA.interface.atualizarNevoa();
    salvarComAtraso();
  }

  // Zera a máscara: tudo revelado (ou tudo escondido).
  function nevoaPreencher(tudoEscondido) {
    var cenaAtual = cena();
    MESA.nevoa.garantir(cenaAtual);
    cenaAtual.nevoa._arr.fill(tudoEscondido ? 1 : 0);
    MESA.estado.precisaRenderizar();
    salvarComAtraso();
  }

  // E4: trocar de ferramenta descarta o preview de retângulo.
  function descartarPreviewNevoa() {
    nevoaPreviewRetangulo = null;
    MESA.render.marcarNeedsRender();
  }

  MESA.ferramentas = {
    iniciar: iniciar,
    selecionarFerramenta: selecionarFerramenta,
    ferramentaAtiva: function () { return ferramentaAtiva; },
    selecionarToken: selecionarToken,
    tokenSelecionado: tokenSelecionado,
    tokenNoPonto: tokenNoPonto,
    mudarTamanho: mudarTamanho,
    tamanhoPadrao: tamanhoPadrao,
    medicao: medicaoAtual,
    iniciarMedicao: iniciarMedicao,
    atualizarMedicao: atualizarMedicao,
    finalizarMedicao: finalizarMedicao,
    limparMedicao: limparMedicao,
    alternarGrade: alternarGrade,
    calibrarComMedicao: calibrarComMedicao,
    // E4: névoa
    nevoaLigada: nevoaLigada,
    alternarNevoa: alternarNevoa,
    nevoaPreencher: nevoaPreencher,
    nevoaSeguir: nevoaSeguir,
    nevoaRetangulo: nevoaRetangulo,
    nevoaFormaAtual: nevoaFormaAtual,
    nevoaModoAtual: nevoaModoAtual,
    definirNevoaForma: definirNevoaForma,
    definirNevoaModo: definirNevoaModo,
    descartarPreviewNevoa: descartarPreviewNevoa,
    retanguloPreview: function (v) {
      if (v === undefined) return nevoaPreviewRetangulo;
      nevoaPreviewRetangulo = v;
      MESA.render.marcarNeedsRender();
      return nevoaPreviewRetangulo;
    }
  };
})();
