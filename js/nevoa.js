/* ==========================================================================
   js/nevoa.js - Névoa de guerra (E4, decisão D10).
   A máscara é um Uint8Array com 1 byte por CÉLULA (célula = 1/4 de
   quadrado). Valores: 0 = revelado; 1 = escondido. O canvas offscreen é
   reconstruído só quando a máscara muda (needsRender) e é esticado no
   render com drawImage. No estado, os bytes vão COMPACTADOS em base64
   (1 bit por célula) para caber no localStorage.
   Nada de código dos repositórios estudados: implementação própria.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var dadosOffscreen = null;    // canvas offscreen (reconstruído quando sujo)
  var ctxOffscreen = null;
  var suja = false;             // máscara mudou? reconstruir offscreen


  var CELULAS_POR_QUADRADO = 4; // decisão D10 (1/4 de quadrado)
  var ALPHA_MESTRE = 0.35;      // o mestre VÊ por baixo da névoa
  var ALPHA_APRESENTACAO = 0.85; // na apresentação: quase opaca

  // -----------------------------------------------------------------
  // GEOMETRIA: tamanho da célula em px do mundo e grade de células.
  // -----------------------------------------------------------------
  function pixelPorCelula(cena) {
    return (cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro) / CELULAS_POR_QUADRADO;
  }

  function celulasDaCena(cena) {
    return {
      largura: Math.max(1, Math.ceil(cena.largura / pixelPorCelula(cena))),
      altura: Math.max(1, Math.ceil(cena.altura / pixelPorCelula(cena)))
    };
  }

  // -----------------------------------------------------------------
  // GARANTIR: cria a máscara (tudo escondido) se a cena não tiver.
  // Recalcula as dimensões se a escala/mapa mudaram (o conteúdo
  // anterior é mantido cell a cell quando possível).
  // -----------------------------------------------------------------
  function garantir(cena) {
    var dims = celulasDaCena(cena);
    var n = dims.largura * dims.altura;

    if (cena.nevoa && cena.nevoa.larguraCel === dims.largura &&
        cena.nevoa.alturaCel === dims.altura) {
      expandir(cena); // garante o Uint8Array em memória
      return cena.nevoa;
    }

    // Guarda o antigo (para copiar o que couber) só nas mesmas células.
    var antigo = (cena.nevoa && arrValido(cena.nevoa))
      ? cena.nevoa._arr.slice()
      : null;
    var antigoL = cena.nevoa ? cena.nevoa.larguraCel : 0;

    var arr = new Uint8Array(n);
    arr.fill(0); // tudo REVELADO quando nasce: só o que for pintado fica escondido

    if (antigo) {
      // copia o trecho que coincide nas dimensões
      for (var y = 0; y < Math.min(dims.altura, cena.nevoa.alturaCel); y++) {
        for (var x = 0; x < Math.min(dims.largura, antigoL); x++) {
          arr[y * dims.largura + x] = antigo[y * antigoL + x];
        }
      }
    }

    cena.nevoa = {
      larguraCel: dims.largura,
      alturaCel: dims.altura,
      dados: "" // preenchido no compactar()
    };
    cena.nevoa._arr = arr;
    suja = true;
    return cena.nevoa;
  }

  // -----------------------------------------------------------------
  // COMPACTAR (células -> base64, 1 bit por célula) e EXPANDIR.
  // Bit "1" = célula escondida.
  // -----------------------------------------------------------------
  function compactarParaSalvar(cena) {
    var nevoa = cena.nevoa;
    if (!nevoa || !arrValido(nevoa)) { if (nevoa) delete nevoa._arr; return; }
    var arr = nevoa._arr;
    var n = arr.length;
    var bytes = new Uint8Array(Math.ceil(n / 8)); // 1 bit por célula
    var i;
    for (i = 0; i < n; i++) {
      if (arr[i]) bytes[i >> 3] |= (1 << (i & 7));
    }
    var binario = "";
    var total = bytes.length;
    for (i = 0; i < total; i++) binario += String.fromCharCode(bytes[i]);
    nevoa.dados = btoa(binario);
    // O Uint8Array NÃO pode ir para o JSON (viraria objeto {0:1,...}).
    // No disco, a fonte de verdade é só "dados" (base64). Em memória,
    // o _arr volta via expandir() na próxima necessidade.
    delete nevoa._arr;
  }

  // O _arr em memória deve ser sempre um Uint8Array; qualquer outra coisa
  // (ex.: objeto vindo de um JSON antigo) é descartado.
  function arrValido(nevoa) {
    return nevoa._arr instanceof Uint8Array;
  }

  function expandir(cena) {
    var nevoa = cena.nevoa;
    if (!nevoa) return nevoa;
    if (arrValido(nevoa)) return nevoa; // já em memória
    delete nevoa._arr; // descarta objeto estragado (ex.: _arr de JSON)

    var n = nevoa.larguraCel * nevoa.alturaCel;
    var arr = new Uint8Array(n);
    var binario = "";
    try { binario = atob(nevoa.dados || ""); } catch (e) { binario = ""; }

    for (var i = 0; i < n; i++) {
      var byte = binario.charCodeAt(i >> 3) || 0;
      arr[i] = (byte & (1 << (i & 7))) ? 1 : 0;
    }
    nevoa._arr = arr;
    suja = true;
    return nevoa;
  }

  // -----------------------------------------------------------------
  // PINTAR: célula do ponto (x, y do mundo) -> revelar/esconder.
  // Retângulo: do ponto 1 ao ponto 2 (cantos quaisquer).
  // Devolve true se algo mudou.
  // -----------------------------------------------------------------
  function indiceDaCelula(cena, x, y) {
    var nevoa = garantir(cena);
    var px = pixelPorCelula(cena);
    var cx = Math.floor(x / px);
    var cy = Math.floor(y / px);
    if (cx < 0 || cy < 0 || cx >= nevoa.larguraCel || cy >= nevoa.alturaCel) return -1;
    return cy * nevoa.larguraCel + cx;
  }

  // E4: o ponto (x, y do mundo) está numa célula ESCONDIDA?
  // Usado pelo render para não desenhar tokens sob a névoa.
  function celulaEscondida(cena, x, y) {
    if (!cena.nevoa || !cena.nevoa.visivel) return false;
    var nevo = expandir(cena) || garantir(cena);
    if (!nevo.larguraCel || !nevo.alturaCel) return false;
    var i = indiceDaCelula(cena, x, y);
    if (i < 0) return false;
    return nevo._arr[i] === 1;
  }

  function definirCelula(cena, x, y, escondida) {
    var nevoa = expandir(cena) || garantir(cena);
    var i = indiceDaCelula(cena, x, y);
    if (i < 0) return false;
    if (nevoa._arr[i] === (escondida ? 1 : 0)) return false;
    nevoa._arr[i] = escondida ? 1 : 0;
    suja = true;
    return true;
  }

  function pintarRetangulo(cena, x1, y1, x2, y2, escondida) {
    var nevoa = expandir(cena) || garantir(cena);
    var px = pixelPorCelula(cena);
    var c1x = Math.max(0, Math.floor(Math.min(x1, x2) / px));
    var c1y = Math.max(0, Math.floor(Math.min(y1, y2) / px));
    var c2x = Math.min(nevoa.larguraCel - 1, Math.floor(Math.max(x1, x2) / px));
    var c2y = Math.min(nevoa.alturaCel - 1, Math.floor(Math.max(y1, y2) / px));
    for (var cy = c1y; cy <= c2y; cy++) {
      for (var cx = c1x; cx <= c2x; cx++) {
        var i = cy * nevoa.larguraCel + cx;
        nevoa._arr[i] = escondida ? 1 : 0;
      }
    }
    suja = true;
  }

  // Pincel seguindo o mouse: interpolação do último ponto ao novo
  // (linha de Bresenham em células, sem lacunas em gestos rápidos).
  function seguirPincel(cena, x1, y1, x2, y2, modo, raio) {
    var nevoa = expandir(cena) || garantir(cena);
    var px = pixelPorCelula(cena);
    var r = Math.max(0, Math.round(raio || 0)); // células ao redor
    var escondida = modo === "esconder";
    var c1x = Math.floor(x1 / px), c1y = Math.floor(y1 / px);
    var c2x = Math.floor(x2 / px), c2y = Math.floor(y2 / px);
    var dx = Math.abs(c2x - c1x), dy = -Math.abs(c2y - c1y);
    var sx = c1x < c2x ? 1 : -1, sy = c1y < c2y ? 1 : -1;
    var err = dx + dy;
    var mudou = false;
    while (true) {
      for (var oy = -r; oy <= r; oy++) {
        for (var ox = -r; ox <= r; ox++) {
          var cx = c1x + ox, cy = c1y + oy;
          if (cx < 0 || cy < 0 || cx >= nevoa.larguraCel || cy >= nevoa.alturaCel) continue;
          var i = cy * nevoa.larguraCel + cx;
          if (nevoa._arr[i] === (escondida ? 1 : 0)) continue;
          nevoa._arr[i] = escondida ? 1 : 0;
          mudou = true;
          suja = true;
        }
      }
      if (c1x === c2x && c1y === c2y) break;
      var e2 = 2 * err;
      if (e2 > dy) { err += dy; c1x += sx; }
      if (e2 < dx) { err += dx; c1y += sy; }
    }
    return mudou;
  }

  // -----------------------------------------------------------------
  // RECONSTRUÇÃO do offscreen: 1 célula = 1 pixel do offscreen
  // (1px = 0 revelado / preto = escondido). O render estica.
  // -----------------------------------------------------------------
  function reconstruirOffscreen(cena, dpr) {
    var nevoa = garantir(cena);
    if (!dadosOffscreen) {
      dadosOffscreen = document.createElement("canvas");
      ctxOffscreen = dadosOffscreen.getContext("2d");
    }
    if (dadosOffscreen.width !== nevoa.larguraCel ||
        dadosOffscreen.height !== nevoa.alturaCel) {
      dadosOffscreen.width = nevoa.larguraCel;
      dadosOffscreen.height = nevoa.alturaCel;
      suja = true;
    }
    if (suja) {
      var img = ctxOffscreen.createImageData(nevoa.larguraCel, nevoa.alturaCel);
      var celulas = nevoa._arr;
      for (var i = 0; i < celulas.length; i++) {
        img.data[i * 4] = 0;
        img.data[i * 4 + 1] = 0;
        img.data[i * 4 + 2] = 0;
        img.data[i * 4 + 3] = celulas[i] ? 255 : 0; // alfa por célula
      }
      ctxOffscreen.putImageData(img, 0, 0);
      suja = false;
    }
    return dadosOffscreen;
  }

  function alphaAtual(estado) {
    return estado ? ALPHA_APRESENTACAO : ALPHA_MESTRE;
  }

  // -----------------------------------------------------------------
  // API
  // -----------------------------------------------------------------
  MESA.nevoa = {
    garantir: garantir,
    expandir: expandir,
    definirCelula: definirCelula,
    pintarRetangulo: pintarRetangulo,
    seguirPincel: seguirPincel,
    indiceDaCelula: indiceDaCelula,
    celulaEscondida: celulaEscondida,
    compactarParaSalvar: compactarParaSalvar,
    reconstruirOffscreen: reconstruirOffscreen,
    alphaAtual: alphaAtual,
    estaSuja: function () { return suja; }
  };
})();
