/* ==========================================================================
   js/baloes.js - Balões de fala sobre os tokens (E6).
   Estado em memória (não vai para o localStorage): a lista de balões
   visíveis e o histórico curto do chat (20 mensagens, zerado ao recarregar).
   O balão é desenhado em ESPAÇO DE TELA (tamanho fixo, sem zoom) por cima
   de tudo que é mundo; o render chama desenhar() no fim do quadro.
   Segurança: só fillText/textContent; nunca innerHTML com texto digitado.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var FONTE = "600 15px system-ui, \"Segoe UI\", Roboto, sans-serif";
  var LINHA_ALTURA = 18;
  var PAD_X = 12;
  var PAD_Y = 8;
  var LARGURA_MAX = 240;          // largura máxima do corpo (px de tela)
  var LARGURA_TEXTO = LARGURA_MAX - PAD_X * 2;
  var RAIO = 10;
  var PONTA = 8;                  // altura do triângulo
  var MAX_LINHAS = 5;
  var HISTORICO_MAX = 20;

  var baloes = [];                // { tokenId, texto, inicio, duracao }
  var historico = [];             // { nome, texto }

  function agora() { return Date.now(); }

  function reduzido() {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // Duração (E6-6): 3000 + 60 por caractere, limitada a [3000, 8000] ms.
  function duracaoDe(texto) {
    var bruta = 3000 + 60 * texto.length;
    return Math.max(3000, Math.min(8000, bruta));
  }

  function tokenSelecionado() {
    var id = MESA.ferramentas.tokenSelecionado();
    if (!id) return null;
    return MESA.estado.cena().tokens.find(function (t) { return t.id === id; }) || null;
  }

  // Mostra/substitui o balão de um token (um por token, E6-5).
  function mostrar(token, texto) {
    if (!token) return false;
    var limpo = String(texto == null ? "" : texto).trim();
    if (!limpo) return false;
    limpo = limpo.slice(0, 140);

    baloes = baloes.filter(function (b) { return b.tokenId !== token.id; });
    baloes.push({
      tokenId: token.id,
      texto: limpo,
      inicio: agora(),
      duracao: duracaoDe(limpo)
    });
    MESA.estado.precisaRenderizar();
    return true;
  }

  // Teclas 1/2/3: fala pronta do token selecionado.
  function falarFala(indice) {
    var token = tokenSelecionado();
    if (!token) {
      MESA.interface.mostrarAviso("Selecione um token para falar.", 2000);
      return false;
    }
    var falas = Array.isArray(token.falas) ? token.falas : [];
    var texto = falas[indice - 1];
    if (texto === undefined || !String(texto).trim()) return false;
    return mostrar(token, texto);
  }

  // Chat livre: balão + histórico (o chamador repinta o histórico na tela).
  function falarChat(token, texto) {
    if (!token) return false;
    var limpo = String(texto == null ? "" : texto).trim();
    if (!limpo) return false;                    // só espaços: ignora
    limpo = limpo.slice(0, 140);
    mostrar(token, limpo);
    historico.push({ nome: token.nome, texto: limpo });
    if (historico.length > HISTORICO_MAX) historico.shift();
    return true;
  }

  function obterHistorico() { return historico; }

  function limparChat() { historico = []; }

  function temVisivel() {
    // Devolve true enquanto a lista tiver itens (inclusive os que acabaram
    // de expirar): assim o render faz MAIS UM quadro, que limpa o balão da
    // tela, e só então o ciclo de redesenho para (E6-6).
    return baloes.length > 0;
  }

  // ------------------------------------------------------------------
  // Quebra de linha por palavra; palavras gigantes quebram por caractere.
  // Retorna no máximo 5 linhas; a 5ª termina em "…" se houver mais texto.
  // ------------------------------------------------------------------
  function larguraDe(ctx, texto) { return ctx.measureText(texto).width; }

  function cortarComReticencias(ctx, texto, larguraMax) {
    var ret = "\u2026";
    var t = texto;
    while (t.length && larguraDe(ctx, t + ret) > larguraMax) {
      t = t.slice(0, -1);
    }
    return (t + ret).trim();
  }

  function quebrarLinhas(ctx, texto, larguraMax) {
    var palavras = texto.split(/\s+/).filter(function (p) { return p.length > 0; });
    var linhas = [];
    var atual = "";

    for (var i = 0; i < palavras.length; i++) {
      var palavra = palavras[i];
      var teste = atual ? atual + " " + palavra : palavra;

      if (larguraDe(ctx, teste) <= larguraMax) {
        atual = teste;
        continue;
      }
      if (atual) {
        linhas.push(atual);
        atual = "";
      }

      // Palavra sozinha maior que a largura: quebra por caractere.
      if (larguraDe(ctx, palavra) > larguraMax) {
        var pedaco = "";
        for (var c = 0; c < palavra.length; c++) {
          var tentativa = pedaco + palavra[c];
          if (larguraDe(ctx, tentativa) <= larguraMax) {
            pedaco = tentativa;
          } else {
            if (pedaco) linhas.push(pedaco);
            pedaco = palavra[c];
          }
        }
        atual = pedaco;
      } else {
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
    if (!linhas.length) linhas = [""];

    if (linhas.length > MAX_LINHAS) {
      linhas = linhas.slice(0, MAX_LINHAS);
      linhas[MAX_LINHAS - 1] = cortarComReticencias(ctx, linhas[MAX_LINHAS - 1], larguraMax);
    }
    return linhas;
  }

  // Caixa de cantos arredondados (sem depender de ctx.roundRect).
  function caminhoCaixa(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function limitar(n, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, n));
  }

  // ------------------------------------------------------------------
  // Desenho (chamado pelo render a cada quadro enquanto houver balão).
  // ------------------------------------------------------------------
  function desenhar(ctx, canvas, cena) {
    if (!baloes.length) return;
    var t = agora();
    baloes = baloes.filter(function (b) { return t < b.inicio + b.duracao; });
    if (!baloes.length) return;

    var dpr = window.devicePixelRatio || 1;
    var larguraTela = canvas.clientWidth;
    var semAnimacao = reduzido();

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONTE;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.imageSmoothingEnabled = true;

    for (var i = 0; i < baloes.length; i++) {
      desenharUm(ctx, cena, baloes[i], larguraTela, t, semAnimacao);
    }
    ctx.restore();
  }

  function desenharUm(ctx, cena, balao, larguraTela, t, semAnimacao) {
    var token = cena.tokens.find(function (tk) { return tk.id === balao.tokenId; });
    if (!token) return;
    if (MESA.nevoa && MESA.nevoa.celulaEscondida &&
        MESA.nevoa.celulaEscondida(cena, token.x, token.y)) return;

    var restante = balao.inicio + balao.duracao - t;
    var alfa = 1;
    if (!semAnimacao && restante < 400) alfa = Math.max(0, restante / 400);

    var cam = cena.camera;
    var tam = MESA.render.tamanhoDoToken(token, cena);
    var cx = (token.x - cam.x) * cam.zoom;
    var cy = (token.y - cam.y) * cam.zoom;
    var topoToken = cy - (tam.altura * cam.zoom) / 2;
    var baseToken = cy + (tam.altura * cam.zoom) / 2;

    // Altura reservada pelas barras de PV/SAN/PE (mesma conta do render).
    var barras = token.recursos ? (4 + 3 * 4 + 2 * 2) : 0;
    var pontaY = topoToken - barras * cam.zoom - 2;

    var linhas = quebrarLinhas(ctx, balao.texto, LARGURA_TEXTO);
    var maiorLinha = 0;
    for (var i = 0; i < linhas.length; i++) {
      maiorLinha = Math.max(maiorLinha, larguraDe(ctx, linhas[i]));
    }
    var larguraCaixa = limitar(Math.max(60, maiorLinha + PAD_X * 2), 60, LARGURA_MAX);
    var alturaCaixa = PAD_Y * 2 + linhas.length * LINHA_ALTURA;

    var paraBaixo = false;
    var caixaY = pontaY - PONTA - alturaCaixa;
    if (caixaY < 6) {
      // Sem espaço acima: tenta abaixo do token (ponta para cima).
      var pontaBaixo = baseToken + 2;
      if (pontaBaixo + PONTA + alturaCaixa <= canvasAltura(ctx)) {
        paraBaixo = true;
        caixaY = pontaBaixo + PONTA;
      } else {
        caixaY = 6; // último recurso: encosta no topo
      }
    }

    var caixaX = limitar(cx - larguraCaixa / 2, 6,
      Math.max(6, larguraTela - larguraCaixa - 6));
    var pontaX = limitar(cx, 6, Math.max(6, larguraTela - 6));
    var baseX = limitar(pontaX, caixaX + RAIO + 4, caixaX + larguraCaixa - RAIO - 4);

    ctx.globalAlpha = alfa;

    // Ponta (triângulo) primeiro: o corpo cobre a base.
    var pontaApexY = paraBaixo
      ? Math.min(baseToken + 2, caixaY + PONTA + 2)
      : Math.max(pontaY, caixaY + alturaCaixa + 2);
    var pontaBaseY = caixaY + (paraBaixo ? 0 : alturaCaixa);

    ctx.fillStyle = "#F2EFEA";
    ctx.beginPath();
    ctx.moveTo(baseX - 7, pontaBaseY);
    ctx.lineTo(baseX + 7, pontaBaseY);
    ctx.lineTo(pontaX, pontaApexY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#0E0F11";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX - 7, pontaBaseY);
    ctx.lineTo(pontaX, pontaApexY);
    ctx.lineTo(baseX + 7, pontaBaseY);
    ctx.stroke();

    // Corpo.
    caminhoCaixa(ctx, caixaX, caixaY, larguraCaixa, alturaCaixa, RAIO);
    ctx.fillStyle = "#F2EFEA";
    ctx.fill();
    ctx.strokeStyle = "#0E0F11";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Texto (sempre fillText: HTML aparece como texto literal).
    ctx.fillStyle = "#0E0F11";
    for (var l = 0; l < linhas.length; l++) {
      ctx.fillText(linhas[l], caixaX + PAD_X, caixaY + PAD_Y + l * LINHA_ALTURA);
    }
    ctx.globalAlpha = 1;
  }

  // Altura em unidades CSS do canvas.
  function canvasAltura(ctx) {
    var c = ctx.canvas;
    var dpr = window.devicePixelRatio || 1;
    return c.height / dpr;
  }

  MESA.baloes = {
    mostrar: mostrar,
    falarFala: falarFala,
    falarChat: falarChat,
    historico: obterHistorico,
    limparChat: limparChat,
    temVisivel: temVisivel,
    desenhar: desenhar
  };
})();
