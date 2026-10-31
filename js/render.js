/* ==========================================================================
   js/render.js - Desenho no canvas (decisões D3 e D4).
   Um ÚNICO canvas desenha, nesta ordem: fundo -> mapa -> tokens -> (futuro:
   névoa, sobreposições). O desenho é SOB DEMANDA (flag needsRender).
   Etapa 1: tokens ordenados por "y" (o de menor y desenha primeiro; o de
   maior y fica visualmente POR CIMA), ancorados pelo CENTRO.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var canvas = null;
  var ctx = null;
  var imagemMapa = null;       // objeto Image do mapa desta cena
  var imagemFalhou = false;    // true se o arquivo não foi encontrado
  var needsRender = true;      // começa true para o primeiro desenho
  var caminhoCarregado = "";   // para recarregar só quando o fundo mudar

  // Cache de imagens de token: caminho -> { img: Image, ok: boolean }.
  // Carregar imagem em cada frame seria lento; aqui carrega UMA vez.
  var imagensDeToken = {};

  // Avisa: na próxima volta do requestAnimationFrame, redesenhe.
  function marcarNeedsRender() {
    needsRender = true;
  }

  // ---------------------------------------------------------------------
  // Redimensionamento: canvas interno segue o CSS multiplicado pelo
  // devicePixelRatio (retina não fica serrilhada). O render inteiro
  // desenha em unidades CSS.
  // ---------------------------------------------------------------------
  function redimensionar() {
    var dpr = window.devicePixelRatio || 1;
    var larguraCss = canvas.clientWidth;
    var alturaCss = canvas.clientHeight;

    if (canvas.width !== Math.round(larguraCss * dpr) ||
        canvas.height !== Math.round(alturaCss * dpr)) {
      canvas.width = Math.round(larguraCss * dpr);
      canvas.height = Math.round(alturaCss * dpr);
      marcarNeedsRender();
    }
  }

  // ---------------------------------------------------------------------
  // Largura e ALTURA de um token em pixels do MUNDO (decisão D9):
  //   largura = tamanho (quadrados) * metrosPorQuadrado * pxPorMetro
  //   altura  = proporção natural da imagem; monstro sem imagem = quadrado.
  // Também é usado pela entrada.js para o hit-test (clicar no token).
  // ---------------------------------------------------------------------
  function tamanhoDoToken(token, cena) {
    var largura = token.tamanho * cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro;
    var altura = largura;

    // E6: a CAIXA vem da imagem "sem arma" (as duas versões têm o mesmo
    // tamanho e ponto de ancoragem); se ela ainda não carregou, tenta a
    // imagem do modo atual. Sem imagem, o token é quadrado.
    var proporcao = proporcaoCarregada(caminhoBase(token));
    if (!proporcao) proporcao = proporcaoCarregada(caminhoAtual(token));
    if (proporcao) altura = largura * proporcao;

    return { largura: largura, altura: altura };
  }

  function proporcaoCarregada(caminho) {
    if (!caminho) return 0;
    var registro = imagensDeToken[caminho];
    if (registro && registro.ok && registro.img.naturalWidth > 0) {
      return registro.img.naturalHeight / registro.img.naturalWidth;
    }
    return 0;
  }

  // E6: caminho da imagem base (sem arma) e do modo atual.
  function caminhoBase(token) {
    if (token.imagens && token.imagens.semArma) return token.imagens.semArma;
    return token.imagem || null;
  }

  function caminhoAtual(token) {
    var atual = MESA.arma ? MESA.arma.imagem(token) : null;
    return atual || caminhoBase(token);
  }

  // ---------------------------------------------------------------------
  // Pede ao cache a imagem de um caminho (carrega uma única vez).
  // Falha -> registra e a mesa mostra a faixa "Arquivo não encontrado".
  // ---------------------------------------------------------------------
  function obterImagemPorCaminho(caminho) {
    if (!caminho) return null;
    var registro = imagensDeToken[caminho];
    if (!registro) {
      registro = { img: new Image(), ok: false };
      registro.img.onload = function () {
        registro.ok = true;
        if (MESA.interface) MESA.interface.esconderErro();
        marcarNeedsRender();
      };
      registro.img.onerror = function () {
        registro.ok = false;
        if (MESA.interface) MESA.interface.mostrarErro("Arquivo não encontrado: " + caminho);
        marcarNeedsRender();
      };
      registro.img.src = caminho;
      imagensDeToken[caminho] = registro;
    }
    return (registro.ok && registro.img.naturalWidth > 0) ? registro.img : null;
  }

  // Imagem do token no modo atual. Se o arquivo do modo falhar, usa a
  // OUTRA versão (sem/com arma) para o app não quebrar (E6).
  function obterImagem(token) {
    var atual = caminhoAtual(token);
    var img = obterImagemPorCaminho(atual);
    if (img) return img;

    var imgs = token.imagens || {};
    var alternativa = (atual === imgs.comArma) ? imgs.semArma : imgs.comArma;
    if (alternativa && alternativa !== atual) {
      return obterImagemPorCaminho(alternativa);
    }
    if (token.imagem && token.imagem !== atual) {
      return obterImagemPorCaminho(token.imagem);
    }
    return null;
  }

  function temAlgumaImagem(token) {
    return !!(caminhoBase(token) || (token.imagens && token.imagens.comArma));
  }

  // Carrega a imagem do mapa da cena (apenas quando o caminho muda).
  function carregarMapa(cena) {
    if (caminhoCarregado === cena.fundo && imagemMapa) return;

    caminhoCarregado = cena.fundo;
    imagemFalhou = false;
    imagemMapa = new Image();

    imagemMapa.onload = function () {
      if (cena.largura !== imagemMapa.naturalWidth || cena.altura !== imagemMapa.naturalHeight) {
        cena.largura = imagemMapa.naturalWidth;
        cena.altura = imagemMapa.naturalHeight;
        MESA.estado.salvar();
      }
      MESA.interface.esconderErro();
      marcarNeedsRender();
    };

    imagemMapa.onerror = function () {
      imagemFalhou = true;
      MESA.interface.mostrarErro("Arquivo não encontrado: " + cena.fundo);
      marcarNeedsRender();
    };

    imagemMapa.src = cena.fundo;
    marcarNeedsRender();
  }

  // ---------------------------------------------------------------------
  // Desenha UM token (imagem ou o círculo "M" do monstro de teste).
  // x, y do token = CENTRO. Se estiver selecionado, anel dourado ao redor.
  // ---------------------------------------------------------------------
  function desenharToken(token, cena, selecionado) {
    var t = tamanhoDoToken(token, cena);
    var xEsq = token.x - t.largura / 2;
    var yTopo = token.y - t.altura / 2;

    var morto = token.estado === "morto"; // E5 (Fatality)
    var img = obterImagem(token);

    if (img) {
      // Pixel art: suavização DESLIGADA para ficar nítida (decisão D4).
      ctx.imageSmoothingEnabled = false;
      if (morto) {
        // Cinza + X por cima (filter pode não existir em todos os browsers)
        try { ctx.filter = "grayscale(1)"; } catch (e) { /* ignora */ }
      }
      ctx.drawImage(img, xEsq, yTopo, t.largura, t.altura);
      try { ctx.filter = "none"; } catch (e) { /* ignora */ }
      if (morto) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xEsq, yTopo);
        ctx.lineTo(xEsq + t.largura, yTopo + t.altura);
        ctx.moveTo(xEsq + t.largura, yTopo);
        ctx.lineTo(xEsq, yTopo + t.altura);
        ctx.stroke();
      }
    } else if (temAlgumaImagem(token)) {
      // Imagem pedida mas ainda não carregou: círculo cinza provisório.
      desenharCirculoMonstro(token, t.largura, "#5A5E64");
    } else {
      // Monstro de teste (sem imagem): círculo vermelho com "M".
      desenharCirculoMonstro(token, t.largura, morto ? "#5A5E64" : "#9B1B30");
      if (morto) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xEsq, yTopo);
        ctx.lineTo(xEsq + t.largura, yTopo + t.altura);
        ctx.moveTo(xEsq + t.largura, yTopo);
        ctx.lineTo(xEsq, yTopo + t.altura);
        ctx.stroke();
      }
    }

    // E3: barras de PV/Sanidade/PE sobre tokens com "recursos".
    if (token.recursos) desenharBarras(token, t);

    // Anel de seleção SEMPRE por cima do token (docs 5.7: --gold, 2px).
    if (selecionado) {
      ctx.beginPath();
      ctx.strokeStyle = "#D4A72C";
      ctx.lineWidth = 2;
      ctx.arc(token.x, token.y, Math.max(t.largura, t.altura) / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------
  // BARRAS DE RECURSOS (E3): três faixas de 4px de altura (unidades do
  // MUNDO, com zoom), 2px entre elas, 4px acima da imagem; largura =
  // largura desenhada do token. Trilha rgba(14,15,17,0.85) + preencimento
  // proporcional a atual/max. Ordem: PV, Sanidade, PE.
  // ---------------------------------------------------------------------
  function desenharBarras(token, t) {
    var cores = { pv: "#D64545", san: "#7B88F0", pe: "#E08A2E" };
    var ordem = ["pv", "san", "pe"];
    var alturaBarra = 4;
    var espaco = 2;
    var recuo = 4 + 3 * alturaBarra + 2 * espaco;

    var xEsq = token.x - t.largura / 2;
    var yTopoFaixa = token.y - t.altura / 2 - recuo;

    for (var i = 0; i < ordem.length; i++) {
      var chave = ordem[i];
      var rec = token.recursos[chave];
      var y = yTopoFaixa + i * (alturaBarra + espaco);

      // Trilha.
      ctx.fillStyle = "rgba(14, 15, 17, 0.85)";
      ctx.fillRect(xEsq, y, t.largura, alturaBarra);

      // Preenchimento proporcional.
      var frac = Math.max(0, Math.min(1, rec.atual / rec.max));
      ctx.fillStyle = cores[chave];
      ctx.fillRect(xEsq, y, t.largura * frac, alturaBarra);
    }
  }

  // Círculo com a letra "M" (monstro de teste / fallback).
  function desenharCirculoMonstro(token, diametro, cor) {
    var raio = diametro / 2;
    ctx.beginPath();
    ctx.fillStyle = cor;
    ctx.arc(token.x, token.y, raio, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 " + Math.max(10, raio) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("M", token.x, token.y + raio * 0.04);
  }

  // ---------------------------------------------------------------------
  // Um desenho completo. A câmera é aplicada COMO transformação do
  // contexto: o código desenha em pontos do MUNDO e o zoom/pan acontece
  // sozinho (decisão D5).
  // ---------------------------------------------------------------------
  function desenhar() {
    var cena = MESA.estado.cena();
    var cam = cena.camera;
    var dpr = window.devicePixelRatio || 1;

    // Limpa tudo com a cor de fundo da página.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0E0F11";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // devicePixelRatio + câmera (pan e zoom).
    var fator = dpr * cam.zoom;
    ctx.setTransform(fator, 0, 0, fator, -cam.x * fator, -cam.y * fator);

    // 1) O mapa de fundo, inteiro, no tamanho natural (com suavização).
    ctx.imageSmoothingEnabled = true;
    if (imagemMapa && imagemMapa.complete && imagemMapa.naturalWidth > 0) {
      ctx.drawImage(imagemMapa, 0, 0);
    } else if (imagemFalhou) {
      ctx.fillStyle = "#3A3D42";
      ctx.fillRect(0, 0, 800, 600);
    }

    // 2) Grade por cima do mapa e ANTES dos tokens (decisão D3/CSS do
    //    fluxo da arquitetura).
    desenharGrade(cena, cam);

    // 2) Tokens ordenados por y (menor y primeiro => maior y fica por cima).
    //    E4: token sob CÉLULA ESCONDIDA da névoa NÃO é desenhado — invisível
    //    de verdade para todos (inclusive o mestre), como o usuário pediu.
    var tokens = cena.tokens.slice().sort(function (a, b) {
      return a.y - b.y;
    });
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (MESA.nevoa.celulaEscondida && MESA.nevoa.celulaEscondida(cena, token.x, token.y)) continue;
      desenharToken(token, cena, MESA.ferramentas.tokenSelecionado() === token.id);
    }

    // 2b) NÉVOA (E4): POR CIMA dos tokens (esconde o que não foi revelado).
    //     O mestre vê o mapa com alfa suave; na apresentação, quase opaca.
    if (cena.nevoa && cena.nevoa.visivel) {
      MESA.nevoa.garantir(cena);
      var off = MESA.nevoa.reconstruirOffscreen(cena);
      var px = (cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro) / 4;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = MESA.nevoa.alphaAtual(
        MESA.interface && MESA.interface.emApresentacao ? MESA.interface.emApresentacao() : false);
      ctx.drawImage(off, 0, 0, cena.nevoa.larguraCel * px, cena.nevoa.alturaCel * px);
      ctx.restore();
    }

    // 2c) Preview do retângulo de névoa (efêmero, só durante o gesto).
    var preview = MESA.ferramentas.retanguloPreview();
    if (preview) {
      ctx.save();
      ctx.fillStyle = "rgba(212, 167, 44, 0.25)";
      ctx.strokeStyle = "#D4A72C";
      ctx.lineWidth = 2 / cam.zoom;
      var rx = Math.min(preview.x1, preview.x2), ry = Math.min(preview.y1, preview.y2);
      var rw = Math.abs(preview.x2 - preview.x1), rh = Math.abs(preview.y2 - preview.y1);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // 2d) BALÕES (E6): espaço de tela, por cima da névoa e das barras.
    if (MESA.baloes) MESA.baloes.desenhar(ctx, canvas, cena);

    // 3) Sobreposições em espaço DE TELA (tamanho fixo, sem zoom):
    //    régua + rotação/íma. Depois do restore, voltamos ao espaço puro.
    desenharRuler(cena, cam);

    needsRender = false;
  }

  // ---------------------------------------------------------------------
  // GRADE: linhas a cada metrosPorQuadrado * pxPorMetro px de mundo.
  // Cor #FFFFFF com 18% de opacidade, 1px na TELA (espessura 1/zoom no
  // mundo). Desenhada DEPOIS do mapa e ANTES dos tokens (decisão D3).
  // ---------------------------------------------------------------------
  function desenharGrade(cena, cam) {
    if (!cena.grade.visivel) return;

    var passo = cena.escala.metrosPorQuadrado * cena.escala.pxPorMetro;
    var larguraCss = canvas.clientWidth;
    var alturaCss = canvas.clientHeight;

    // Quais colunas/linhas estão visíveis neste quadro (câmera).
    var primeiroX = Math.floor(cam.x / passo) * passo;
    var primeiroY = Math.floor(cam.y / passo) * passo;
    var fimX = cam.x + larguraCss / cam.zoom;
    var fimY = cam.y + alturaCss / cam.zoom;

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1 / cam.zoom; // 1px na tela, constante

    ctx.beginPath();
    for (var x = primeiroX; x <= fimX; x += passo) {
      ctx.moveTo(x, primeiroY);
      ctx.lineTo(x, fimY);
    }
    for (var y = primeiroY; y <= fimY; y += passo) {
      ctx.moveTo(Math.max(cam.x, primeiroX), y);
      ctx.lineTo(fimX, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------
  // RÉGUA (Etapa 2). Desenho em espaço de TELA: linha -gold de 3px com
  // contorno externo --bg de 1px e rótulo ao lado do ponto B:
  // "{m} m · ≈ {q} quadrados" (pt-BR, vírgula, uma casa decimal).
  // Distância = pixels do MUNDO / pxPorMetro (não muda com o zoom).
  // ---------------------------------------------------------------------
  function desenharRuler(cena, cam) {
    var medicao = MESA.ferramentas.medicao();
    if (!medicao.visivel || !medicao.inicio || !medicao.fim) return;

    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var i = MESA.coords.worldToScreen(medicao.inicio.x, medicao.inicio.y, cam);
    var f = MESA.coords.worldToScreen(medicao.fim.x, medicao.fim.y, cam);

    // Contorno escuro (1px) e linha dourada (3px).
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0E0F11";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(i.x, i.y);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();

    ctx.strokeStyle = "#D4A72C";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(i.x, i.y);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();

    // Rótulo: comprimento + quadrados, com vírgula decimal (pt-BR).
    var dx = medicao.fim.x - medicao.inicio.x;
    var dy = medicao.fim.y - medicao.inicio.y;
    var pxMundo = Math.sqrt(dx * dx + dy * dy);
    var metros = pxMundo / cena.escala.pxPorMetro;
    var quadrados = metros / cena.escala.metrosPorQuadrado;

    var texto = formatarMedicao(metros) + " m · ≈ " + formatarMedicao(quadrados) + " quadrados";

    // Fundo semi-escuro atrás do texto, ao lado do ponto B.
    ctx.font = "600 14px system-ui, \"Segoe UI\", Roboto, sans-serif";
    var larguraTexto = ctx.measureText(texto).width;
    var alturaTexto = 22;
    var centroTextoX = f.x + 12;
    var centroTextoY = f.y - 12;

    ctx.fillStyle = "rgba(14, 15, 17, 0.85)";
    ctx.fillRect(centroTextoX, centroTextoY - alturaTexto / 2, larguraTexto + 12, alturaTexto);

    ctx.fillStyle = "#E8E6E3";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, centroTextoX + 6, centroTextoY);
  }

  // Formato: uma casa decimal, vírgula decimal (pt-BR).
  function formatarMedicao(n) {
    return n.toFixed(1).replace(".", ",");
  }

  // Laço: roda sempre, mas só desenha quando algo mudou (decisão D4).
  function laco() {
    redimensionar();
    // E6: só há desenho contínuo enquanto existir balão visível (some
    // suave nos últimos 400 ms); sem balão, volta ao desenho sob demanda.
    if (MESA.baloes && MESA.baloes.temVisivel()) marcarNeedsRender();
    if (needsRender) desenhar();
    // E5: a bolha de rolagem acompanha o token e expira (a cada quadro).
    if (MESA.interface && MESA.interface.atualizarBolhaRolagem) {
      MESA.interface.atualizarBolhaRolagem();
    }
    requestAnimationFrame(laco);
  }

  function iniciar() {
    canvas = document.getElementById("tela");
    ctx = canvas.getContext("2d");

    carregarMapa(MESA.estado.cena());

    // E6: pré-carrega AS DUAS imagens de cada token (sem/com arma).
    var tokens = MESA.estado.cena().tokens || [];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      var imgs = token.imagens || {};
      if (token.imagem) obterImagemPorCaminho(token.imagem);
      if (imgs.semArma) obterImagemPorCaminho(imgs.semArma);
      if (imgs.comArma) obterImagemPorCaminho(imgs.comArma);
    }

    window.addEventListener("resize", function () {
      redimensionar();
    });

    laco();
  }

  MESA.render = {
    iniciar: iniciar,
    marcarNeedsRender: marcarNeedsRender,
    tamanhoDoToken: tamanhoDoToken
  };
})();
