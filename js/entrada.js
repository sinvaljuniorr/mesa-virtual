/* ==========================================================================
   js/entrada.js - Máquina de estados da entrada (mouse, roda, teclado).
   Decisão D6: um único "estado atual" define o que o mouse está fazendo:
     idle | panning | draggingToken | measuring | calibrating.
   Etapa 1: hit-test de tokens (ferramenta Selecionar), arraste do token
   só após 3px de deslocamento (evita movimento acidental) e seleção.
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var canvas = null;
  var LIMIAR_ARRASTAR = 3;     // px de deslocamento antes de mover o token

  // Informações do gesto em andamento (posições em pixels da TELA).
  var estado = "idle";
  var ultimaPosicao = { x: 0, y: 0 };
  var espacoPressionado = false;

  // Etapa 1: preparando um arraste de token (clicou nele, ainda não moveu).
  var arraste = {
    token: null,           // objeto do token arrastando
    offset: { x: 0, y: 0 } // distância mouse -> centro do token (mundo)
  };

  // E4: pontos do gesto de névoa (em coordenadas de mundo).
  var nevoaUltimo = { x: 0, y: 0 };
  var nevoaInicio = { x: 0, y: 0 };

  // Ferramenta ativa ("selecionar" | "mover" | "regua" | "calibrar" | "nevoa").
  var ferramenta = "selecionar";

  // ---------------------------------------------------------------
  // Cursor conforme a ferramenta e o estado (docs seção 5.7).
  // ---------------------------------------------------------------
  function atualizarCursor() {
    if (estado === "panning") { canvas.style.cursor = "grabbing"; return; }
    if (estado === "draggingToken") { canvas.style.cursor = "grabbing"; return; }

    switch (ferramenta) {
      case "selecionar": canvas.style.cursor = espacoPressionado ? "grab" : "default"; break;
      case "mover":      canvas.style.cursor = "grab"; break;
      case "regua":
      case "calibrar":
      case "nevoa":      canvas.style.cursor = "crosshair"; break;
    }
  }

  // ---------------------------------------------------------------
  // PAN: arrasta a câmera. dx/dy chegam em pixels DE TELA; o deslocamento
  // no mundo é dx / zoom (decisão D5).
  // ---------------------------------------------------------------
  function pan(dxTela, dyTela) {
    var cam = MESA.estado.cena().camera;
    cam.x -= dxTela / cam.zoom;
    cam.y -= dyTela / cam.zoom;
    MESA.estado.precisaRenderizar();
  }

  function obterPosicao(evento) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evento.clientX - rect.left,
      y: evento.clientY - rect.top
    };
  }

  // O ponto clicado em coordenadas de MUNDO.
  function pontoDoMundo(posicaoTela) {
    return MESA.coords.screenToWorld(posicaoTela.x, posicaoTela.y, MESA.estado.cena().camera);
  }

  // ---------------------------------------------------------------
  // Eventos do ponteiro.
  // ---------------------------------------------------------------
  function aoPressionar(evento) {
    // Captura o ponteiro para que o arraste continue mesmo saindo do
    // canvas. Pode falhar com ponteiros sintéticos (testes automático),
    // então protegemos: sem a captura a mesa segue funcionando.
    try { canvas.setPointerCapture(evento.pointerId); } catch (e) {}
    var pos = obterPosicao(evento);
    ultimaPosicao = pos;
    arraste.token = null;

    // Espaço segurando = pan temporário, independente da ferramenta.
    if (espacoPressionado || ferramenta === "mover") {
      estado = "panning";
    } else if (ferramenta === "regua") {
      // Etapa 2: régua medindo do ponto do mundo (com ímã).
      var m = pontoDoMundo(pos);
      MESA.ferramentas.iniciarMedicao(m.x, m.y);
      MESA.ferramentas.selecionarToken(null);
      estado = "measuring";
    } else if (ferramenta === "calibrar") {
      // Etapa 2: linha de calibração; ao soltar abre o diálogo.
      var c = pontoDoMundo(pos);
      MESA.ferramentas.iniciarMedicao(c.x, c.y);
      MESA.ferramentas.selecionarToken(null);
      estado = "calibrating";
    } else if (ferramenta === "nevoa") {
      // E4: pintar a névoa (pincel segue o mouse; retângulo guarda o início).
      var n = pontoDoMundo(pos);
      MESA.ferramentas.selecionarToken(null);
      nevoaUltimo = { x: n.x, y: n.y };
      nevoaInicio = { x: n.x, y: n.y };
      if (MESA.ferramentas.nevoaFormaAtual() === "pincel") {
        MESA.ferramentas.nevoaSeguir(n.x, n.y, n.x, n.y, evento.shiftKey);
      } else {
        MESA.ferramentas.retanguloPreview({ x1: n.x, y1: n.y, x2: n.x, y2: n.y });
      }
      estado = "nevoando";
    } else {
      // Ferramenta "Selecionar": acertou token? prepara arraste + seleção.
      var mundo = pontoDoMundo(pos);
      var token = MESA.ferramentas.tokenNoPonto(mundo.x, mundo.y);

      if (token) {
        MESA.ferramentas.selecionarToken(token.id);

        // Offset: onde o mouse pegou o token, relativo ao centro dele.
        arraste.token = token;
        arraste.offset = { x: mundo.x - token.x, y: mundo.y - token.y };
        estado = "idle"; // vira draggingToken só depois de 3px de movimento
      } else {
        MESA.ferramentas.selecionarToken(null); // vazio desmarca
        estado = "panning";
      }
    }
    atualizarCursor();
  }

  function aoMover(evento) {
    if (estado === "idle" && !arraste.token) return;
    var pos = obterPosicao(evento);

    if (arraste.token && estado === "idle") {
      // Arraste de token só começa após 3px de deslocamento (docs 5.7).
      var dxArranque = Math.abs(pos.x - ultimaPosicao.x);
      var dyArranque = Math.abs(pos.y - ultimaPosicao.y);
      if (dxArranque + dyArranque >= LIMIAR_ARRASTAR) {
        estado = "draggingToken";
      }
    }

    if (estado === "panning") {
      pan(pos.x - ultimaPosicao.x, pos.y - ultimaPosicao.y);
    } else if (estado === "draggingToken" && arraste.token) {
      var mundo = pontoDoMundo(pos);
      arraste.token.x = mundo.x - arraste.offset.x;
      arraste.token.y = mundo.y - arraste.offset.y;
      MESA.estado.precisaRenderizar();
    } else if (estado === "measuring" || estado === "calibrating") {
      // Régua e calibração acompanham o mouse enquanto arrasta.
      var fim = pontoDoMundo(pos);
      MESA.ferramentas.atualizarMedicao(fim.x, fim.y);
    } else if (estado === "nevoando") {
      // E4: névoa pinta durante o arraste (pincel) ou mostra o retângulo.
      var alvo = pontoDoMundo(pos);
      if (MESA.ferramentas.nevoaFormaAtual() === "pincel") {
        MESA.ferramentas.nevoaSeguir(nevoaUltimo.x, nevoaUltimo.y, alvo.x, alvo.y, evento.shiftKey);
        nevoaUltimo = alvo;
      } else {
        var p = MESA.ferramentas.retanguloPreview();
        if (p) { p.x2 = alvo.x; p.y2 = alvo.y; MESA.render.marcarNeedsRender(); }
      }
    }
    ultimaPosicao = pos;
  }

  function aoSoltar(evento) {
    if (estado === "idle" && !arraste.token) return;

    // Arrastou token? salva a nova posição (decisão D7).
    if (estado === "draggingToken") {
      MESA.estado.salvar();
      MESA.interface.atualizarPainelToken();
    }

    // Régua: encerra o gesto (a medição FICA na tela até Esc etc.).
    if (estado === "measuring") {
      MESA.ferramentas.finalizarMedicao();
    }

    // Calibração: encerra o gesto e abre o diálogo de metros.
    if (estado === "calibrating") {
      MESA.ferramentas.finalizarMedicao();
      MESA.interface.abrirDialogoCalibrar();
    }

    // Névoa: retângulo aplicado ao soltar; pincel já pintou no caminho.
    if (estado === "nevoando") {
      if (MESA.ferramentas.nevoaFormaAtual() === "retangulo") {
        MESA.ferramentas.retanguloPreview(null);
        MESA.ferramentas.nevoaRetangulo(nevoaInicio.x, nevoaInicio.y, nevoaUltimo.x, nevoaUltimo.y, evento && evento.shiftKey);
      } else {
        MESA.ferramentas.retanguloPreview(null);
      }
      salvarComAtraso();
    }

    estado = "idle";
    arraste.token = null;
    atualizarCursor();
  }

  // ---------------------------------------------------------------
  // Roda do mouse: zoom centrado no cursor, fator 1,1, limites 0,2 e 4.
  // ---------------------------------------------------------------
  function aoRodar(evento) {
    evento.preventDefault();
    var pos = obterPosicao(evento);
    var cam = MESA.estado.cena().camera;
    var novaCam = MESA.coords.zoomPara(pos.x, pos.y, MESA.coords.fatorDaRoda(evento), cam);
    cam.x = novaCam.x;
    cam.y = novaCam.y;
    cam.zoom = novaCam.zoom;
    MESA.estado.precisaRenderizar();
    salvarComAtraso();
  }

  // Debounce: só executa 300 ms depois do último pedido.
  var cronometroSalvar = null;
  function salvarComAtraso() {
    clearTimeout(cronometroSalvar);
    cronometroSalvar = setTimeout(function () {
      MESA.estado.salvar();
    }, 300);
  }

  // ---------------------------------------------------------------
  // Teclado.
  //   V/H/R/C/G/F/P: ferramentas e grade/apresentação.  Espaço: pan.
  //   A: modo arma do token selecionado (E6).
  //   1/2/3: falas prontas do token selecionado (E6).
  //   Enter: foca o chat (E6).
  //   + - : tamanho do token selecionado.  0: tamanho padrão.
  //   Tab: alterna o painel (APENAS fora de campos de formulário,
  //        para não quebrar a navegação por teclado - decisão D13).
  //   E6-3: fora de campos, como acima; DENTRO de input/textarea/select
  //   TODOS os atalhos ficam desligados (inclusive Espaço e Enter); só
  //   Esc age, tirando o foco do campo.
  // ---------------------------------------------------------------
  function aoTeclar(evento) {
    var tecla = evento.key.toLowerCase();

    var alvo = evento.target || document.body;
    var tag = (alvo.tagName || "").toUpperCase();
    var emCampo = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ||
                  !!alvo.isContentEditable;
    if (emCampo) {
      if (tecla === "escape") {
        evento.preventDefault();
        alvo.blur(); // devolve os atalhos; não mexe na ferramenta
      }
      return;
    }

    if (tecla === " " || evento.code === "Space") {
      espacoPressionado = true;
      atualizarCursor();
      evento.preventDefault();
      return;
    }

    switch (tecla) {
      case "v": MESA.ferramentas.selecionarFerramenta("selecionar"); break;
      case "h": MESA.ferramentas.selecionarFerramenta("mover"); break;
      case "r": MESA.ferramentas.selecionarFerramenta("regua"); break;
      case "c": MESA.ferramentas.selecionarFerramenta("calibrar"); break;
      case "g": MESA.ferramentas.alternarGrade(); break; // Etapa 2
      case "f": MESA.ferramentas.selecionarFerramenta("nevoa"); break; // E4
      case "p": MESA.interface.alternarApresentacao(); break; // E4
      case "a": MESA.arma.alternarSelecionado(); break; // E6
      case "1":
      case "2":
      case "3":
        MESA.baloes.falarFala(Number(tecla)); // E6
        break;
      case "enter":
        // E6: leva o foco ao chat (só com o painel visível e campo ativo).
        if (MESA.interface.focarChat()) evento.preventDefault();
        break;
      case "escape":
        // Névoa: Esc volta para a Selecionar (até o painel abrir de novo).
        if (MESA.ferramentas.ferramentaAtiva() === "nevoa") {
          MESA.ferramentas.selecionarFerramenta("selecionar");
          break;
        }
        aoEsc(); break;
      case "+":
      case "=":
        MESA.ferramentas.mudarTamanho(0.25);
        break;
      case "-":
      case "_":
        MESA.ferramentas.mudarTamanho(-0.25);
        break;
      case "0":
        MESA.ferramentas.tamanhoPadrao();
        break;
      case "tab":
        // O painel alterna pelo clique do botão (interface.js), mas Tab é
        // teclado: tratamos aqui para deixar o Tab do formulário intacto.
        MESA.interface.alternarPainel();
        evento.preventDefault();
        break;
    }
  }

  function aoSoltarTecla(evento) {
    if (evento.key === " ") {
      espacoPressionado = false;
      atualizarCursor();
    }
  }

  // Esc: cancela a médicao da régua, cancela a calibração em curso e
  // fecha o diálogo (docs 5.3). NÃO afeta seleção de token.
  function aoEsc() {
    if (MESA.interface && MESA.interface.fecharDialogoCalibrar()) return;
    MESA.ferramentas.limparMedicao();
  }

  function iniciar() {
    canvas = document.getElementById("tela");

    canvas.addEventListener("pointerdown", aoPressionar);
    canvas.addEventListener("pointermove", aoMover);
    canvas.addEventListener("pointerup", aoSoltar);
    canvas.addEventListener("pointercancel", aoSoltar);
    canvas.addEventListener("wheel", aoRodar, { passive: false });

    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("keyup", aoSoltarTecla);
  }

  MESA.entrada = {
    iniciar: iniciar,
    atualizarCursor: atualizarCursor,
    definirFerramenta: function (nova) {
      ferramenta = nova;
      atualizarCursor();
    },
    estadoAtual: function () {
      return { estado: estado, ferramenta: ferramenta };
    }
  };
})();
