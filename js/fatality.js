/* ==========================================================================
   js/fatality.js - Execução das Fatalities (E5, decisão D11).
   Fluxo: escolhe no menu -> escurece o fundo -> pré-carrega SÓ os frames
   da fatality escolhida -> toca UMA vez no ritmo (fps) -> no fim, muda o
   token para estado "morto" (D12/E5) e remove a sobreposição.
   Som opcional via <audio> com caminho local (funciona em file://; o
   toque vem do clique do usuário, então autoplay é permitido).
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var cacheImagens = {};   // url -> Image (pré-carregadas; UMA por arquivo)
  var tocando = null;      // estado da animação em curso

  // Pré-carrega todos os frames de uma fatality (só da escolhida).
  function carregarFrames(item) {
    return new Promise(function (ok) {
      var pendentes = item.frames.length;
      if (!pendentes) return ok();
      var urls = item.frames.map(function (f) { return item.pasta + f; });
      urls.forEach(function (url) {
        if (cacheImagens[url]) { pendentes--; return; }
        var im = new Image();
        im.onload = function () { if (--pendentes === 0) ok(); };
        im.onerror = function () { if (--pendentes === 0) ok(); };
        im.src = url;
        cacheImagens[url] = im;
      });
      if (pendentes === 0) ok();
    });
  }

  function listar() {
    return window.MESA_FATALITIES || [];
  }

  // Toca a fatality "nome" sobre o token (ou na tela, se alvo "tela").
  function tocar(nome, tokenId) {
    if (tocando) return false;
    var item = listar().find(function (f) { return f.nome === nome; });
    if (!item || !item.frames || !item.frames.length) return false;

    var token = tokenId
      ? MESA.estado.cena().tokens.find(function (t) { return t.id === tokenId; })
      : null;

    // prefers-reduced-motion: sem animação, vai direto ao "morto".
    var reduzido = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) { finalizar(item, token); return true; }

    return iniciarAnimacao(item, token);
  }

  function iniciarAnimacao(item, token) {
    return carregarFrames(item).then(function () {
      tocando = item;
      var overlay = document.getElementById("overlay-fatality");
      var tela = document.getElementById("tela-fatality");
      var escuro = document.getElementById("escuro-fatality");
      var audio = item.som ? new Audio(item.som) : null;

      var dpr = window.devicePixelRatio || 1;
      tela.width = Math.round(window.innerWidth * dpr);
      tela.height = Math.round(window.innerHeight * dpr);
      var ctx = tela.getContext("2d");

      escuro.classList.remove("oculta");
      overlay.classList.remove("oculta");
      if (audio) audio.play().catch(function () { /* sem som, segue */ });

      // Área de desenho: "tela" = fullscreen; "token" = caixa do token.
      var cam = MESA.estado.cena().camera;
      var rec;
      if (item.alvo === "token" && token) {
        var t = MESA.render.tamanhoDoToken(token, MESA.estado.cena());
        var lado = Math.max(t.largura, t.altura) * cam.zoom * 2.2; // um pouco maior
        rec = {
          x: (token.x - cam.x) * cam.zoom + t.largura * cam.zoom / 2 - lado / 2,
          y: (token.y - cam.y) * cam.zoom + t.altura * cam.zoom / 2 - lado / 2,
          w: lado, h: lado
        };
      } else {
        rec = { x: 0, y: 0, w: tela.width, h: tela.height };
      }

      var indice = 0;
      var intervalo = 1000 / Math.max(1, Math.round(item.fps || 12));
      var ultimo = 0;

      function quadro(agora) {
        if (indice >= item.frames.length) { // toca UMA vez e termina
          if (audio) audio.pause();
          finalizar(item, token);
          return;
        }
        if (agora - ultimo >= intervalo) {
          ultimo = agora;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, tela.width, tela.height);
          var im = cacheImagens[item.pasta + item.frames[indice]];
          if (im && im.complete && im.naturalWidth > 0) {
            // "contain": o quadro inteiro cabe na área, sem esticar
            var prop = im.naturalWidth / im.naturalHeight;
            var w = rec.w, h = w / prop;
            if (h > rec.h) { h = rec.h; w = h * prop; }
            ctx.drawImage(im, rec.x + (rec.w - w) / 2, rec.y + (rec.h - h) / 2, w, h);
          }
          indice++;
        }
        requestAnimationFrame(quadro);
      }
      requestAnimationFrame(quadro);

      // Clique no escuro pula a animação (prático em mesas longas).
      escuro.onclick = function () {
        if (audio) audio.pause();
        finalizar(item, token);
      };
      return true;
    });
  }

  // Fim: remove sobreposições e muda o alvo para "morto" (D12/E5).
  function finalizar(item, token) {
    tocando = null;
    var escuro = document.getElementById("escuro-fatality");
    escuro.onclick = null; // sem handler velho de uma run anterior
    document.getElementById("overlay-fatality").classList.add("oculta");
    escuro.classList.add("oculta");
    if (token) {
      token.estado = "morto";
      MESA.estado.salvar();
    }
    MESA.estado.precisaRenderizar();
    MESA.interface.atualizarPainelToken();
  }

  MESA.fatality = {
    listar: listar,
    tocar: tocar,
    tocando: function () { return !!tocando; }
  };
})();
