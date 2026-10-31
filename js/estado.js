/* ==========================================================================
   js/estado.js - O estado único do jogo na memória + persistência (D7/D8).
   Um ÚNICO objeto JavaScript guarda toda a mesa (cenaAtiva, cenas, escala,
   câmera...). É salvo automaticamente no localStorage (chave "mesaRPG.v1")
   e pode ser exportado/importado como arquivo JSON (Etapa 1).
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;
  var CHAVE = "mesaRPG.v1";

  // O estado em memória. Só este módulo o troca de referencia; os demais
  // leem MESA.estado.atual.cena() para trabalhar com a cena ativa.
  var atual = null;

  // Monta o estado inicial a partir de window.MESA_DADOS (dados-iniciais.js).
  function estadoInicial() {
    var entrada = MESA.dados.construir();  // vindo de dados-iniciais.js
    return entrada;
  }

  // ---------------------------------------------------------------
  // Validação: um estado carregado (do localStorage ou de importação)
  // precisa ter a forma mínima esperada. Evita dados corrompidos.
  // ---------------------------------------------------------------
  function eValido(estado) {
    if (!estado || typeof estado !== "object") return false;
    // v1 (antes da E3), v2 (antes da E4), v3 (antes da E6) e v4 (atual)
    // são válidos e passam pela migração.
    if (estado.versao !== 1 && estado.versao !== 2 &&
        estado.versao !== 3 && estado.versao !== 4) return false;
    if (!Array.isArray(estado.cenas) || estado.cenas.length === 0) return false;
    for (var i = 0; i < estado.cenas.length; i++) {
      var cena = estado.cenas[i];
      if (!cena || !cena.id || typeof cena.escala !== "object") return false;
      if (!cena.escala || typeof cena.escala.pxPorMetro !== "number") return false;
    }
    return true;
  }

  // ---------------------------------------------------------------
  // MIGRAÇÃO (E3): estado v1 -> v2. Nada se perde (posição, tamanho,
  // escala, câmera, grade). No token do Pierre (por id):
  //   - recebe fichaId + recursos se não tiver;
  //   - se o nome ainda for "Personagem 1" (nunca editado), passa a
  //     "Pierre". Nome já editado pelo mestre não muda.
  // O Monstro de teste continua sem ficha e sem recursos.
  // ---------------------------------------------------------------
  function migrarEstado(estado) {
    if (estado.versao >= 2) return estado;

    var iniciais = MESA.dados.construir(); // versão atual dos dados (v2)
    var iniciaisPierre = null;
    for (var i = 0; i < iniciais.cenas.length; i++) {
      var tokensIniciais = iniciais.cenas[i].tokens || [];
      for (var k = 0; k < tokensIniciais.length; k++) {
        if (tokensIniciais[k].id === "tok_personagem_01") iniciaisPierre = tokensIniciais[k];
      }
    }

    for (var c = 0; c < estado.cenas.length; c++) {
      var tokens = estado.cenas[c].tokens;
      if (!Array.isArray(tokens)) continue;
      for (var t = 0; t < tokens.length; t++) {
        var token = tokens[t];
        if (!token || token.id !== "tok_personagem_01") continue;

        // Nome antigo nunca editado -> novo nome.
        if (token.nome === "Personagem 1") token.nome = "Pierre";

        if (!token.fichaId && iniciaisPierre) token.fichaId = iniciaisPierre.fichaId;
        if (!token.recursos && iniciaisPierre && iniciaisPierre.recursos) {
          // Cópia profunda para o estado ter objeto próprio.
          token.recursos = JSON.parse(JSON.stringify(iniciaisPierre.recursos));
        }
      }
    }

    estado.versao = 2;
    return estado;
  }

  // ---------------------------------------------------------------
  // MIGRAÇÃO v2 -> v3 (E4): cada cena ganha "nevoa" (desligada e sem
  // máscara; a máscara é criada com preguiça quando a névoa é ligada).
  // ---------------------------------------------------------------
  function migrarEstado3(estado) {
    if (estado.versao >= 3) return estado;
    for (var i = 0; i < estado.cenas.length; i++) {
      var cena = estado.cenas[i];
      if (!cena.nevoa) {
        cena.nevoa = { visivel: false, larguraCel: 0, alturaCel: 0, dados: "" };
      }
      if (typeof cena.nevoa.visivel !== "boolean") cena.nevoa.visivel = false;
      if (!cena.nevoa.dados) cena.nevoa.dados = "";
    }
    estado.versao = 3;
    return estado;
  }

  function migrarTudo(estado) {
    migrarEstado(estado);
    migrarEstado3(estado);
    migrarEstado4(estado);
    return estado;
  }

  // ---------------------------------------------------------------
  // MIGRAÇÃO v3 -> v4 (E6): modo arma + falas prontas.
  //   - "imagem" antiga vira "imagens.semArma";
  //   - "comArma" é preenchido a partir dos DADOS INICIAIS (para o Pierre
  //     salvo antes da E6 ganhar a imagem com machado);
  //   - "modoArma" padrão "sem";
  //   - "falas" vem de data/falas.js quando o token ainda não tiver.
  // Nada existente é perdido (posição, tamanho, escala, câmera, ficha,
  // recursos e névoa continuam intactos).
  // ---------------------------------------------------------------
  function garantirCamposE6(estado) {
    var mapa = {};
    try {
      var iniciais = MESA.dados.construir();
      for (var i = 0; i < iniciais.cenas.length; i++) {
        var lista = iniciais.cenas[i].tokens || [];
        for (var j = 0; j < lista.length; j++) {
          if (lista[j] && lista[j].id) mapa[lista[j].id] = lista[j];
        }
      }
    } catch (erro) { /* sem dados iniciais: segue só com o que existe */ }

    var falasIniciais = (window.MESA_DADOS && window.MESA_DADOS.falas) || {};

    for (var c = 0; c < estado.cenas.length; c++) {
      var tokens = estado.cenas[c].tokens;
      if (!Array.isArray(tokens)) continue;
      for (var t = 0; t < tokens.length; t++) {
        var token = tokens[t];
        if (!token || !token.id) continue;

        // Imagens com/sem arma.
        var imgs = token.imagens;
        if (!imgs || typeof imgs !== "object") imgs = {};
        if (!imgs.semArma) imgs.semArma = token.imagem || null;
        if (!Object.prototype.hasOwnProperty.call(imgs, "comArma")) imgs.comArma = null;

        var base = mapa[token.id];
        if (base && base.imagens) {
          if (!imgs.semArma && base.imagens.semArma) imgs.semArma = base.imagens.semArma;
          if (!imgs.comArma && base.imagens.comArma) imgs.comArma = base.imagens.comArma;
        }
        token.imagens = imgs;
        if (!token.imagem) token.imagem = imgs.semArma || null;

        // Modo arma.
        if (token.modoArma !== "com") token.modoArma = "sem";
        if (token.modoArma === "com" && !imgs.comArma) token.modoArma = "sem";

        // Falas prontas (3; [] = token sem falas).
        if (!Array.isArray(token.falas)) {
          var padrao = falasIniciais[token.id];
          token.falas = Array.isArray(padrao) ? padrao.slice(0, 3) : [];
        } else if (token.falas.length > 0) {
          token.falas = token.falas.slice(0, 3);
          while (token.falas.length < 3) token.falas.push("");
        }
      }
    }
    return estado;
  }

  function migrarEstado4(estado) {
    garantirCamposE6(estado);
    if (estado.versao < 4) estado.versao = 4;
    return estado;
  }

  // ---------------------------------------------------------------
  // REPOSIÇÃO DE TOKENS FALTANTES.
  // Estados antigos (salvos antes de um token existir) podem não ter
  // todos os tokens. Regra da v1.1: cada token dos DADOS INICIAIS que
  // não existir no estado salvo (pelo id) volta com nome/posição
  // originais. Assim o Pierre e o monstro SEMPRE aparecem ao abrir o
  // index, mesmo com localStorage antigo. Tokens que o mestre criou
  // ou moveu continuam intactos.
  // ---------------------------------------------------------------
  function reporTokensFaltantes(estado) {
    var iniciais = MESA.dados.construir();
    for (var i = 0; i < estado.cenas.length; i++) {
      var cena = estado.cenas[i];
      if (!Array.isArray(cena.tokens)) {
        cena.tokens = [];
      }
      for (var t = 0; t < iniciais.cenas.length; t++) {
        var origem = iniciais.cenas[t];
        if (origem.id !== cena.id || !Array.isArray(origem.tokens)) continue;
        for (var k = 0; k < origem.tokens.length; k++) {
          var base = origem.tokens[k];
          var existe = false;
          for (var j = 0; j < cena.tokens.length; j++) {
            if (cena.tokens[j] && cena.tokens[j].id === base.id) { existe = true; break; }
          }
          if (!existe) cena.tokens.push(JSON.parse(JSON.stringify(base)));
        }
      }
    }
    return estado;
  }

  // Salva o estado atual no localStorage. try/catch porque a gravação pode
  // falhar (quota cheia, modo privado); a mesa não pode travar por isso.
  function salvar() {
    try {
      if (MESA.nevoa) MESA.nevoa.compactarParaSalvar(cena()); // E4: máscara compacta
      localStorage.setItem(CHAVE, JSON.stringify(atual));
    } catch (erro) {
      console.warn("Não foi possível salvar no localStorage:", erro);
      if (MESA.interface) MESA.interface.mostrarErro("Falha ao salvar o estado (armazenamento cheio?).");
    }
  }

  // Tenta ler o estado salvo. Se não existir ou for inválido, devolve null
  // (o chamador então usa os dados iniciais - decisão D8).
  function carregarSalvo() {
    try {
      var texto = localStorage.getItem(CHAVE);
      if (!texto) return null;
      var dados = JSON.parse(texto);
      if (!eValido(dados)) return null;
      return migrarTudo(dados); // v1/v2 -> v3 na leitura também
    } catch (erro) {
      return null;
    }
  }

  // Inicia o estado: prioridade para o localStorage; senão, dados iniciais.
  // Estados antigos/com token faltante ganham os tokens iniciais de volta.
  function iniciar() {
    var salvo = carregarSalvo();
    if (salvo) {
      migrarTudo(salvo);
      reporTokensFaltantes(salvo);
      garantirCamposE6(salvo); // tokens repostos também ganham falas (E6)
      atual = salvo;
    } else {
      atual = estadoInicial();
      garantirCamposE6(atual); // falas prontas nos dados iniciais (E6)
    }
    salvar(); // grava tanto na 1ª execução quanto já com tokens repostos
    return atual;
  }

  // Redefinir: volta ao estado inicial e apaga o que estava salvo (D8).
  function redefinir() {
    atual = estadoInicial();
    garantirCamposE6(atual);
    try {
      localStorage.removeItem(CHAVE);
    } catch (erro) { /* sem efeito fatal */ }
    salvar();
    return atual;
  }

  // A cena que o mestre está vendo agora (atalho para os módulos).
  function cena() {
    return atual.cenas[0]; // v1: uma única cena "casa"
  }

  // needsRender: marca que algo mudou e o canvas precisa redesenhar (D4).
  function precisaRenderizar() {
    if (MESA.render) MESA.render.marcarNeedsRender();
  }

  // ---------------------------------------------------------------
  // Exportar: estado atual -> arquivo JSON bonito (blob download).
  // FileReader/Blob funcionam em file:// (decisão D2/D7).
  // ---------------------------------------------------------------
  function exportar() {
    if (MESA.nevoa) MESA.nevoa.compactarParaSalvar(cena()); // E4: máscara compacta
    var texto = JSON.stringify(atual, null, 2);
    var blob = new Blob([texto], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mesa-ordem-paranormal.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  // ---------------------------------------------------------------
  // Importar: recebe o TEXTO do arquivo, valida e troca o estado.
  // Inválido: mensagem exata e o estado atual NÃO é alterado (docs 5.3).
  // ---------------------------------------------------------------
  function importarTexto(texto) {
    var dados;
    try {
      dados = JSON.parse(texto);
    } catch (erro) {
      if (MESA.interface) MESA.interface.mostrarErro("Arquivo inválido. Use um JSON exportado por esta mesa.");
      return false;
    }
    if (!eValido(dados)) {
      if (MESA.interface) MESA.interface.mostrarErro("Arquivo inválido. Use um JSON exportado por esta mesa.");
      return false;
    }
    reporTokensFaltantes(dados);
    migrarTudo(dados);
    atual = dados;
    salvar();
    MESA.render.marcarNeedsRender();
    if (MESA.interface) {
      MESA.interface.atualizarEscala(cena());
      MESA.interface.atualizarPainelToken();
    }
    return true;
  }

  // Exporta a API deste módulo.
  MESA.estado = {
    iniciar: iniciar,
    salvar: salvar,
    redefinir: redefinir,
    cena: cena,
    eValido: eValido,
    precisaRenderizar: precisaRenderizar,
    exportar: exportar,
    importarTexto: importarTexto,
    obterAtual: function () { return atual; }
  };
})();
