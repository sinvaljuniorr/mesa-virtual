/* ==========================================================================
   js/interface.js - Elementos HTML por cima do canvas (decisão D3):
   faixa de erro, banner de escala, painel do mestre (Cena + Token
   selecionado) e os botões de ação (Exportar/Importar/Redefinir/Painel).
   ========================================================================== */

(function () {
  "use strict";

  var MESA = window.MESA;

  var faixaErro = null;
  var bannerEscala = null;
  var infoEscala = null;
  var estadoEscala = null;

  // Painel do token (Etapa 1)
  var painelVazio = null;        // "Clique em um token para editar."
  var painelControles = null;    // nome + tamanho
  var campoNome = null;
  var campoTamanho = null;
  var infoTamanho = null;
  var btMenos = null;
  var btMais = null;

  var painelAside = null;

  // Ficha (E3): elementos da seção no painel.
  var tokenSemFicha = null;
  var fichaBlocos = null;
  var fichaNome = null;
  var fichaLinhaClasse = null;
  var fichaAtributos = null;
  var fichaDefesa = null;
  var fichaProtecao = null;
  var fichaResistencias = null;
  var fichaAtaque = null;
  var fichaAtaqueEspecial = null;
  var fichaPericias = null;
  var campoQuantidade = null;
  var campoValorPv = null, campoMaxPv = null, preenchimentoPv = null;
  var campoValorSan = null, campoMaxSan = null, preenchimentoSan = null;
  var campoValorPe = null, campoMaxPe = null, preenchimentoPe = null;
  var faixaMorrendo = null, rodadasMorrendo = null, avisoMorrendo = null;
  var faixaEnlouquecendo = null, rodadasEnlouquecendo = null, avisoEnlouquecendo = null;
  var caixasMorrendo = [], caixasEnlouquecendo = [];

  // Mostra a faixa vermelha de erro no topo do canvas.
  function mostrarErro(mensagem) {
    faixaErro.textContent = mensagem;
    faixaErro.classList.remove("oculta");
  }

  // Esconde a faixa de erro.
  function esconderErro() {
    // guarda: imagens podem terminar de carregar antes de iniciar()
    if (faixaErro) faixaErro.classList.add("oculta");
  }

  // Formata um número no padrão pt-BR (vírgula decimal, uma casa).
  function formatarNumero(numero) {
    return numero.toFixed(1).replace(".", ",");
  }

  // Atualiza as linhas "Escala: 1 metro = n px" e "Escala provisória".
  function atualizarEscala(cena) {
    var n = formatarNumero(cena.escala.pxPorMetro);
    infoEscala.textContent = "1 metro = " + n + " px";
    estadoEscala.textContent = cena.escala.calibrada ? "Escala calibrada" : "Escala provisória";
    bannerEscala.classList.toggle("oculta", cena.escala.calibrada);
  }

  // ---------------------------------------------------------------
  // Painel do token: preenche nome/tamanho do token selecionado, ou
  // mostra "Clique em um token para editar." quando nada está marcado.
  // ---------------------------------------------------------------
  function atualizarPainelToken() {
    var id = MESA.ferramentas.tokenSelecionado();
    var token = id
      ? MESA.estado.cena().tokens.find(function (t) { return t.id === id; })
      : null;

    if (!token) {
      painelVazio.classList.remove("oculta");
      painelControles.classList.add("oculta");
      atualizarChat(null);      // E6: sem seleção, chat desabilitado
      atualizarBotaoFatality(); // E5: sem token, sem fatality
      return;
    }

    painelVazio.classList.add("oculta");
    painelControles.classList.remove("oculta");

    // Nome: só reescreve se o campo não estiver com o foco (não luta
    // contra o usuário enquanto ele digita).
    if (document.activeElement !== campoNome) campoNome.value = token.nome;

    campoTamanho.value = token.tamanho;
    infoTamanho.textContent = formatarNumero(token.tamanho);

    // Botões de tamanho desabilitam nos limites (0,25 e 4).
    btMenos.disabled = token.tamanho <= 0.25;
    btMais.disabled = token.tamanho >= 4;

    // E6: arma, falas e chat do token selecionado.
    atualizarArma(token);
    atualizarFalas(token);
    atualizarChat(token);

    // E3: ficha (apenas se o token TIVER ficha).
    atualizarFicha(token);

    // E5: botão Fatality (manifest pode mudar sem recarregar).
    atualizarBotaoFatality();
  }

  // ---------------------------------------------------------------
  // E6: ARMA — mostra o modo atual e desabilita se não houver imagem
  // com arma. "Arma: {nome}" vem do primeiro ataque da ficha.
  // ---------------------------------------------------------------
  function atualizarArma(token) {
    var tem = MESA.arma.temImagemComArma(token);
    var modo = MESA.arma.modo(token);

    btArmaSem.disabled = !tem;
    btArmaCom.disabled = !tem;
    btArmaSem.classList.toggle("ativa", modo === "sem");
    btArmaCom.classList.toggle("ativa", modo === "com");
    btArmaSem.setAttribute("aria-checked", modo === "sem" ? "true" : "false");
    btArmaCom.setAttribute("aria-checked", modo === "com" ? "true" : "false");
    armaSemImagem.classList.toggle("oculta", tem);

    var nome = MESA.arma.nomeArmaDaFicha(token);
    if (nome) {
      armaFicha.textContent = "Arma: " + nome;
      armaFicha.classList.remove("oculta");
    } else {
      armaFicha.textContent = "";
      armaFicha.classList.add("oculta");
    }
  }

  // ---------------------------------------------------------------
  // E6: FALAS — 3 campos editáveis. Token sem falas prontas (monstros)
  // mostra a mensagem e esconde os controles.
  // ---------------------------------------------------------------
  function atualizarFalas(token) {
    var falas = Array.isArray(token.falas) ? token.falas : [];
    var tem = falas.length > 0;
    falasVazio.classList.toggle("oculta", tem);
    falasControles.classList.toggle("oculta", !tem);

    for (var i = 0; i < 3; i++) {
      var texto = tem ? (falas[i] || "") : "";
      if (document.activeElement !== camposFala[i]) camposFala[i].value = texto;
      botoesFalar[i].disabled = !String(texto).trim();
    }
  }

  // Grava uma fala no token (chamado no blur/Enter e antes de "Falar").
  function salvarFala(indice, valor) {
    var token = tokenAtivo();
    if (!token || !Array.isArray(token.falas) || !token.falas.length) return;
    token.falas[indice] = String(valor == null ? "" : valor).slice(0, 80);
    MESA.estado.salvar();
    botoesFalar[indice].disabled = !token.falas[indice].trim();
  }

  function restaurarFalas() {
    var token = tokenAtivo();
    if (!token) return;
    if (!window.confirm("Restaurar as 3 falas deste token para o padrão?")) return;

    var padrao = (window.MESA_DADOS.falas && window.MESA_DADOS.falas[token.id]) || [];
    token.falas = padrao.slice(0, 3);
    while (token.falas.length < 3) token.falas.push("");
    MESA.estado.salvar();
    atualizarFalas(token);
  }

  // ---------------------------------------------------------------
  // E6: CHAT — "Falar como", envio e histórico curto (20 mensagens).
  // O histórico vive em js/baloes.js (efêmero, não é salvo).
  // ---------------------------------------------------------------
  function atualizarChat(token) {
    if (token) {
      chatRotulo.textContent = "Falar como: " + token.nome;
      campoChat.disabled = false;
      btEnviarChat.disabled = !campoChat.value.trim();
    } else {
      chatRotulo.textContent = "Selecione um token para falar.";
      campoChat.disabled = true;
      btEnviarChat.disabled = true;
    }
  }

  function pintarChat() {
    var itens = MESA.baloes.historico();
    historicoChat.textContent = "";
    if (!itens.length) {
      var vazio = document.createElement("p");
      vazio.className = "rotulo-auxiliar";
      vazio.textContent = "Nenhuma mensagem ainda.";
      historicoChat.appendChild(vazio);
      return;
    }
    for (var i = 0; i < itens.length; i++) {
      var linha = document.createElement("p");
      linha.className = "linha-chat";
      linha.textContent = itens[i].nome + ": " + itens[i].texto; // nunca innerHTML
      historicoChat.appendChild(linha);
    }
  }

  function enviarChat() {
    var token = tokenAtivo();
    if (!token) return;
    var texto = campoChat.value.trim();
    if (!texto) return;

    MESA.baloes.falarChat(token, texto);
    campoChat.value = "";
    campoChat.blur();            // devolve os atalhos ao mapa
    btEnviarChat.disabled = true;
    pintarChat();
    historicoChat.scrollTop = historicoChat.scrollHeight;
  }

  // Enter global (fora de campos) chama isto: foca o chat.
  // Devolve true se o foco realmente foi para o chat.
  function focarChat() {
    if (!painelVisivel()) return false;
    if (campoChat.disabled) return false;
    campoChat.focus();
    return document.activeElement === campoChat;
  }

  function painelVisivel() {
    return !painelAside.classList.contains("oculta");
  }

  // Faixa de aviso por tempo (mesmo estilo/posição da faixa de erro).
  function mostrarAviso(mensagem, duracao) {
    mostrarErro(mensagem);
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(esconderErro, duracao || 2000);
  }

  // ---------------------------------------------------------------
  // FICHA (E3). Preenche a seção a partir de window.MESA_DADOS.fichas
  // (dados fixos — nesta etapa não se editam pela interface) e dos
  // recursos { pv, san, pe, rodadas... } que ficam no TOKEN (salvos).
  // ---------------------------------------------------------------
  function atualizarFicha(token) {
    var temFicha = !!(token.fichaId && MESA_DADOS.fichas &&
                      MESA_DADOS.fichas[token.fichaId]);
    tokenSemFicha.classList.toggle("oculta", temFicha);
    fichaBlocos.classList.toggle("oculta", !temFicha);
    if (!temFicha) return;

    var ficha = MESA_DADOS.fichas[token.fichaId];
    fichaNome.textContent = ficha.nome;
    fichaLinhaClasse.textContent =
      ficha.classe + " · " + ficha.patente + " · NEX " + ficha.nex + "%";

    // Blocos de texto (dados fixos da ficha).
    fichaAtributos.textContent = "AGI " + ficha.atributos.agi +
      " · FOR " + ficha.atributos.for + " · INT " + ficha.atributos.int +
      " · PRE " + ficha.atributos.pre + " · VIG " + ficha.atributos.vig;

    var pedacos = ["Defesa " + ficha.defesa, "Esquiva " + ficha.esquiva,
                   "Bloqueio " + ficha.bloqueio];
    fichaDefesa.textContent = pedacos.join(" · ");

    fichaProtecao.textContent = ficha.protecao ? "Proteção: " + ficha.protecao : "";

    var resistencias = [];
    var NOMES_RES = { corte: "Corte", impacto: "Impacto", perfuracao: "Perfuração",
                      balistico: "Balístico", danoMental: "Dano mental" };
    for (var chave in NOMES_RES) {
      var valor = ficha.resistencias[chave];
      if (valor !== null && valor !== undefined && valor !== "") {
        resistencias.push(NOMES_RES[chave] + " " + valor);
      }
    }
    fichaResistencias.textContent =
      resistencias.length ? "Resistências: " + resistencias.join(" · ") : "";

    var ataque = ficha.ataques[0];
    var linhas = [ataque.arma, ataque.tipo, "Ataque " + ataque.ataque,
                  "Alcance " + ataque.alcance, "Dano " + ataque.dano];
    if (ataque.critico) linhas.push("Crítico " + ataque.critico);
    fichaAtaque.textContent = linhas.join(" · ");
    fichaAtaqueEspecial.textContent = (ataque.especial && ataque.especial.length)
      ? "Especial: " + ataque.especial.join("; ") : "";

    var pericias = MESA.ficha.periciasTreinadas(ficha.pericias);
    fichaPericias.textContent = pericias.map(function (p) {
      return p.nome + " " + p.valor;
    }).join("\n");

    atualizarRecursos(token);
  }

  // Preenche as linhas de recursos (barra, atual, máximo, faixas/rodadas).
  function atualizarRecursos(token) {
    if (!token.recursos) return;
    var rec = token.recursos;

    atualizarUmRecurso(rec.pv, campoValorPv, campoMaxPv, preenchimentoPv, "pv");
    atualizarUmRecurso(rec.san, campoValorSan, campoMaxSan, preenchimentoSan, "san");
    atualizarUmRecurso(rec.pe, campoValorPe, campoMaxPe, preenchimentoPe, "pe");

    var est = MESA.ficha.estados(rec);

    // Faixas e rodadas só quando o recurso está em 0.
    faixaMorrendo.classList.toggle("oculta", !est.morrendo);
    rodadasMorrendo.classList.toggle("oculta", !est.morrendo);
    faixaEnlouquecendo.classList.toggle("oculta", !est.enlouquecendo);
    rodadasEnlouquecendo.classList.toggle("oculta", !est.enlouquecendo);

    // Caixas sincronizadas com o estado (sem reescrever a focada).
    sincronizarCaixas(caixasMorrendo, est.rodadasMorrendo);
    sincronizarCaixas(caixasEnlouquecendo, est.rodadasEnlouquecendo);
    avisoMorrendo.classList.toggle("oculta", est.rodadasMorrendo < 3);
    avisoEnlouquecendo.classList.toggle("oculta", est.rodadasEnlouquecendo < 3);
  }

  function atualizarUmRecurso(recurso, campoValor, campoMax, preenchimento, chave) {
    if (document.activeElement !== campoValor) campoValor.value = recurso.atual;
    if (document.activeElement !== campoMax) campoMax.value = recurso.max;

    var frac = Math.max(0, Math.min(1, recurso.atual / recurso.max));
    preenchimento.style.width = Math.round(frac * 100) + "%";

    var barra = preenchimento.parentElement;
    barra.setAttribute("aria-valuenow", String(recurso.atual));
    barra.setAttribute("aria-valuemax", String(recurso.max));
  }

  // Marca/desmarca as caixas de rodada refletindo o estado (uma por vez).
  function sincronizarCaixas(caixas, marcadas) {
    for (var i = 0; i < caixas.length; i++) {
      var focada = document.activeElement === caixas[i];
      if (!focada) caixas[i].checked = i < marcadas;
    }
  }

  // Token do recursos ATUALMENTE selecionado (atalho dos handlers).
  function tokenAtivo() {
    var id = MESA.ferramentas.tokenSelecionado();
    return id ? MESA.estado.cena().tokens.find(function (t) { return t.id === id; }) : null;
  }

  // Aplica novos recursos no token e repinta (painel + barras).
  function aplicarRecursos(novosRecursos) {
    var token = tokenAtivo();
    if (!token) return;
    token.recursos = novosRecursos;
    MESA.estado.precisaRenderizar();
    atualizarRecursos(token);
    salvarComAtraso();
  }

  // Mudança de ±Quantidade nos botões − / + e campos de um recurso.
  // NOME = "pv" | "san" | "pe" (chave no objeto recursos do token).
  function quantidadeAtual() {
    var n = Math.round(Number(campoQuantidade.value));
    return isFinite(n) && n >= 1 ? n : 1;
  }

  function ouvirRecurso(NOME, ids) {
    var btMenos = document.getElementById(ids.menos);
    var btMais = document.getElementById(ids.mais);
    var campoValor = document.getElementById(ids.valor);
    var campoMax = document.getElementById(ids.max);

    btMenos.addEventListener("click", function () {
      var token = tokenAtivo();
      if (token && token.recursos) {
        aplicarRecursos(MESA.ficha.aplicarMudanca(token.recursos, NOME, -quantidadeAtual()));
      }
    });
    btMais.addEventListener("click", function () {
      var token = tokenAtivo();
      if (token && token.recursos) {
        aplicarRecursos(MESA.ficha.aplicarMudanca(token.recursos, NOME, quantidadeAtual()));
      }
    });
    campoValor.addEventListener("change", function () {
      var token = tokenAtivo();
      if (!token || !token.recursos) return;
      // Valor vazio/inválido volta ao último valor válido: a função pura
      // limita; campo vazio recebe o valor atual do estado de volta.
      var novo = MESA.ficha.definirAtual(token.recursos, NOME, campoValor.value);
      aplicarRecursos(novo);
      campoValor.value = tokenAtivo().recursos[NOME].atual;
    });
    campoMax.addEventListener("change", function () {
      var token = tokenAtivo();
      if (!token || !token.recursos) return;
      // Máximo vazio/inválido volta ao último valor válido (mínimo 1).
      var novo = MESA.ficha.definirMaximo(token.recursos, NOME, campoMax.value);
      aplicarRecursos(novo);
      campoMax.value = tokenAtivo().recursos[NOME].max;
    });
  }

  // Caixas de rodada: cada clique grava direto no token (0..3 caixas).
  function ouvirCaixas(caixas, chaveRodadas) {
    for (var i = 0; i < caixas.length; i++) {
      (function (indice) {
        caixas[indice].addEventListener("change", function () {
          var token = tokenAtivo();
          if (!token || !token.recursos) return;
          var recursos = JSON.parse(JSON.stringify(token.recursos));
          // Marcar a caixa (i+1) marca todas anteriores; desmarcar
          // qualquer caixa desmarca as posteriores (0..3).
          recursos[chaveRodadas] = caixas[indice].checked ? indice + 1 : indice;
          for (var c = 0; c < 3; c++) caixas[c].checked = c < recursos[chaveRodadas];
          aplicarRecursos(recursos);
        });
      })(i);
    }
  }

  // ---------------------------------------------------------------
  // Nome: aplica no estado ao digitar, com debounce de 300 ms (D7).
  // ---------------------------------------------------------------
  var cronometroSalvar = null;
  function salvarComAtraso() {
    clearTimeout(cronometroSalvar);
    cronometroSalvar = setTimeout(function () {
      MESA.estado.salvar();
    }, 300);
  }

  function aoMudarNome(evento) {
    var id = MESA.ferramentas.tokenSelecionado();
    if (!id) return;
    var token = MESA.estado.cena().tokens.find(function (t) { return t.id === id; });
    if (!token) return;

    token.nome = evento.target.value;
    MESA.estado.precisaRenderizar();
    atualizarChat(token); // E6: "Falar como: {nome}" acompanha o nome
    salvarComAtraso();
  }

  function aoMudarSlider(evento) {
    var id = MESA.ferramentas.tokenSelecionado();
    if (!id) return;
    var token = MESA.estado.cena().tokens.find(function (t) { return t.id === id; });
    if (!token) return;

    token.tamanho = parseFloat(evento.target.value);
    MESA.estado.precisaRenderizar();
    infoTamanho.textContent = formatarNumero(token.tamanho);
    btMenos.disabled = token.tamanho <= 0.25;
    btMais.disabled = token.tamanho >= 4;
    salvarComAtraso();
  }

  // ---------------------------------------------------------------
  // Campo "Metros por quadrado" (Etapa 2 FUNCIONAL): muda a escala;
  // tokens (em quadrados) mudam de tamanho visual automaticamente.
  // ---------------------------------------------------------------
  function aoMudarMetros(evento) {
    var valor = parseFloat(evento.target.value);
    if (!valor || valor <= 0) return;

    MESA.estado.cena().escala.metrosPorQuadrado = valor;
    MESA.estado.precisaRenderizar();
    salvarComAtraso();
  }

  // ---------------------------------------------------------------
  // Diálogo de calibração (Etapa 2). Abre ao soltar a linha da
  // ferramenta "Calibrar escala"; "Salvar escala" aplica:
  // pxPorMetro = comprimentoPx / metros (decisão D9).
  // ---------------------------------------------------------------
  var dialogoCalibrar = null;
  var erroCalibrar = null;
  var campoMetrosCalibrar = null;

  function abrirDialogoCalibrar() {
    erroCalibrar.classList.add("oculta");
    campoMetrosCalibrar.value = "";
    dialogoCalibrar.showModal(); // API nativa; funciona em file://
    campoMetrosCalibrar.focus();
  }

  function fecharDialogoCalibrar() {
    // Devolve true se estava aberto (usado pelo Esc da entrada).
    if (dialogoCalibrar && dialogoCalibrar.open) {
      dialogoCalibrar.close();
      return true;
    }
    return false;
  }

  function aoSalvarEscala() {
    var metros = parseFloat(campoMetrosCalibrar.value);

    // Texto EXATO do erro (docs 5.3).
    if (!metros || metros <= 0) {
      erroCalibrar.classList.remove("oculta");
      return;
    }

    var ok = MESA.ferramentas.calibrarComMedicao(metros);
    if (ok) {
      MESA.estado.salvar();
      dialogoCalibrar.close();
      atualizarEscala(MESA.estado.cena()); // "Escala calibrada" + some o banner
    } else {
      erroCalibrar.classList.remove("oculta");
    }
  }

  function aoCancelarEscala() {
    dialogoCalibrar.close();
    // Cancelar NÃO aplica nada; a linha da calibração também some
    // (é efêmera como a régua).
    MESA.ferramentas.limparMedicao();
  }

  // ---------------------------------------------------------------
  // Dica da ferramenta (docs 5.3, textos exatos).
  // ---------------------------------------------------------------
  var dica = null;
  function mostrarDica(texto) {
    dica.textContent = texto;
    dica.classList.remove("oculta");
  }
  function esconderDica() {
    // guarda: pode ser chamado antes de capturarmos os elementos
    if (dica) dica.classList.add("oculta");
  }

  // ---------------------------------------------------------------
  // Tab / botão "Painel": esconde ou mostra o painel do mestre (D13).
  // ---------------------------------------------------------------
  var painelEscondidoPorApresentacao = false;

  function alternarPainel() {
    painelAside.classList.toggle("oculta");
  }

  // ---------------------------------------------------------------
  // MODO APRESENTAÇÃO (E4): painel + banner + dica escondidos e a
  // névoa quase opaca (os jogadores não veem o que não foi revelado).
  // EPHEMERO: não fica salvo (ao recarregar, o mestre volta ao modo
  // normal). Atalho P (e Shift+Tab não é usado).
  // ---------------------------------------------------------------
  var emApresentacao = false;

  function alternarApresentacao() {
    emApresentacao = !emApresentacao;
    aplicarApresentacao();
    return emApresentacao;
  }

  function aplicarApresentacao() {
    painelAside.classList.toggle("oculta", emApresentacao);
    // banner + dica escondem APENAS na apresentação (classe separada
    // da lógica de escala: o banner pode voltar sozinho depois).
    if (bannerEscala) bannerEscala.classList.toggle("oculta-nesta-tela", emApresentacao);
    if (dica) dica.classList.toggle("oculta-nesta-tela", emApresentacao);
    // troca o rótulo do botão
    var bt = document.getElementById("bt-apresentar");
    if (bt) bt.textContent = emApresentacao ? "Sair da apresentação (P)" : "Apresentar (P)";
    MESA.estado.precisaRenderizar();
  }

  function emApresentacaoAgora() { return emApresentacao; }

  // ---------------------------------------------------------------
  // E5: ROLADOR DE D20 — modificador + vantagem/desvantagem + histórico
  // (efêmero: rolagens NÃO ficam salvas). O resultado aparece em uma
  // bolha HTML posicionada sobre o token (recalculada no render).
  // ---------------------------------------------------------------
  var campoModificador = null;
  var btVantagem = null, btDesvantagem = null;
  var historicoEl = null;
  var bolhaEl = null;
  var btFatality = null, menuFatality = null;

  // E6: Arma, Falas e Chat.
  var btArmaSem = null, btArmaCom = null;
  var armaFicha = null, armaSemImagem = null;
  var falasVazio = null, falasControles = null;
  var camposFala = [], botoesFalar = [], btRestaurarFalas = null;
  var chatRotulo = null, campoChat = null, btEnviarChat = null;
  var historicoChat = null;
  var avisoTimer = null;

  var modoVantagem = null;      // null | "vantagem" | "desvantagem"
  var historico = [];           // últimas 8 rolagens
  var bolhaToken = null, bolhaAte = 0;

  function rolarD20() {
    var token = tokenAtivo();
    var mod = Math.round(Number(campoModificador.value)) || 0;
    var opcoes = { modificador: mod };
    if (modoVantagem === "vantagem") opcoes.vantagem = true;
    if (modoVantagem === "desvantagem") opcoes.desvantagem = true;
    var r = MESA.dado.rolar(opcoes);

    historico.unshift({
      texto: MESA.dado.texto(r),
      classe: r.critico ? "critico" : (r.falha ? "falha" : "")
    });
    if (historico.length > 8) historico.length = 8;
    pintarHistorico();

    if (token) {
      mostrarBolha(token, MESA.dado.texto(r));
    } else {
      bolhaEl.textContent = MESA.dado.texto(r);
      bolhaEl.style.left = "50%"; bolhaEl.style.top = "30%";
      bolhaEl.style.transform = "translateX(-50%)";
      bolhaEl.classList.remove("oculta");
      bolhaAte = Date.now() + 5000;
      bolhaToken = null;
    }
  }

  function pintarHistorico() {
    historicoEl.innerHTML = "";
    historico.forEach(function (item) {
      var p = document.createElement("p");
      p.className = "linha-historico " + item.classe;
      p.textContent = item.texto;
      historicoEl.appendChild(p);
    });
  }

  function alternarVantagem(modo) {
    modoVantagem = (modoVantagem === modo) ? null : modo;
    btVantagem.classList.toggle("ativa", modoVantagem === "vantagem");
    btDesvantagem.classList.toggle("ativa", modoVantagem === "desvantagem");
  }

  // Bolha do resultado: acompanha o token no mapa (render repinta).
  function mostrarBolha(token, texto) {
    bolhaToken = token;
    bolhaEl.textContent = texto;
    bolhaEl.classList.remove("oculta");
    bolhaEl.style.transform = "translate(-50%, -100%)";
    bolhaAte = Date.now() + 5000;
    atualizarBolhaRolagem();
  }

  // Chamado no final de cada desenho (render.js): posiciona a bolha
  // sobre o token e a esconde quando os 5 s acabam.
  function atualizarBolhaRolagem() {
    if (!bolhaEl || bolhaEl.classList.contains("oculta")) return;
    if (Date.now() > bolhaAte) {
      bolhaEl.classList.add("oculta");
      bolhaToken = null;
      return;
    }
    if (!bolhaToken) return; // rolagem sem token: posição fixa
    var cam = MESA.estado.cena().camera;
    bolhaEl.style.left = Math.round((bolhaToken.x - cam.x) * cam.zoom) + "px";
    bolhaEl.style.top = Math.round(48 + (bolhaToken.y - cam.y) * cam.zoom) + "px";
  }

  // ---------------------------------------------------------------
  // E5: FATILITY — botão no token selecionado abre o menu do manifest;
  // escolher toca a animação (js/fatality.js) e termina em "morto".
  // ---------------------------------------------------------------
  function atualizarBotaoFatality() {
    var tem = MESA.fatality.listar().length > 0 && !!tokenAtivo();
    btFatality.classList.toggle("oculta", !tem);
    if (!tem) menuFatality.classList.add("oculta");
  }

  function abrirMenuFatality() {
    menuFatality.classList.toggle("oculta");
    if (menuFatality.classList.contains("oculta")) return;
    menuFatality.innerHTML = "";
    var token = tokenAtivo();
    MESA.fatality.listar().forEach(function (item) {
      // "personagem" vazio = todos; senão casa com fichaId/nome do token
      if (item.personagem && item.personagem !== token.fichaId &&
          item.personagem !== token.nome) return;
      var bt = document.createElement("button");
      bt.className = "w100";
      bt.textContent = item.nome;
      bt.addEventListener("click", function () {
        menuFatality.classList.add("oculta");
        MESA.fatality.tocar(item.nome, token.id);
      });
      menuFatality.appendChild(bt);
    });
  }

  // Botões de ação da barra (Etapa 1: Exportar/Importar/Redefinir/Painel).
  function aoExportar() { MESA.estado.exportar(); }

  function aoImportar() {
    document.getElementById("entrada-arquivo").click();
  }

  function aoReceberArquivo(evento) {
    var arquivo = evento.target.files[0];
    if (!arquivo) return;

    var leitor = new FileReader();
    leitor.onload = function () {
      var ok = MESA.estado.importarTexto(leitor.result);
      if (ok) {
        MESA.ferramentas.selecionarToken(null); // nada selecionado após troca
        esconderErro();
      }
    };
    leitor.readAsText(arquivo);

    // Permite importar o MESMO arquivo de novo (soma ao valor do input).
    evento.target.value = "";
  }

  function aoRedefinir() {
    // Texto EXATO da spec (confirm() nativo).
    var confirmado = window.confirm(
      "Redefinir a cena para o estado inicial? Posições e tamanhos serão perdidos."
    );
    if (!confirmado) return;

    MESA.estado.redefinir();
    MESA.ferramentas.selecionarToken(null);
    atualizarEscala(MESA.estado.cena());
    atualizarPainelToken();
    esconderErro();
  }

  function iniciar() {
    faixaErro = document.getElementById("faixa-erro");
    bannerEscala = document.getElementById("banner-escala");
    infoEscala = document.getElementById("info-escala");
    estadoEscala = document.getElementById("estado-escala");

    painelVazio = document.getElementById("token-vazio");
    painelControles = document.getElementById("token-controles");
    campoNome = document.getElementById("campo-nome");
    campoTamanho = document.getElementById("campo-tamanho");
    infoTamanho = document.getElementById("info-tamanho");
    btMenos = document.getElementById("bt-menos");
    btMais = document.getElementById("bt-mais");
    painelAside = document.getElementById("painel");

    var campoMetros = document.getElementById("campo-metros");
    campoMetros.addEventListener("change", aoMudarMetros);

    // Painel do token.
    campoNome.addEventListener("input", aoMudarNome);
    campoTamanho.addEventListener("input", aoMudarSlider);
    btMenos.addEventListener("click", function () { MESA.ferramentas.mudarTamanho(-0.25); });
    btMais.addEventListener("click", function () { MESA.ferramentas.mudarTamanho(0.25); });
    document.getElementById("bt-tamanho-padrao").addEventListener("click", function () {
      MESA.ferramentas.tamanhoPadrao();
    });

    // Botões de ação (antes inertos; agora ativos exceto "Grade", que
    // continua até a Etapa 2).
    document.getElementById("bt-exportar").addEventListener("click", aoExportar);
    document.getElementById("bt-importar").addEventListener("click", aoImportar);
    document.getElementById("bt-redefinir").addEventListener("click", aoRedefinir);
    document.getElementById("bt-painel").addEventListener("click", alternarPainel);
    document.getElementById("bt-exportar").disabled = false;
    document.getElementById("bt-importar").disabled = false;
    document.getElementById("bt-redefinir").disabled = false;
    document.getElementById("bt-painel").disabled = false;
    document.getElementById("entrada-arquivo").addEventListener("change", aoReceberArquivo);

    // E3: elementos da ficha.
    tokenSemFicha = document.getElementById("token-sem-ficha");
    fichaBlocos = document.getElementById("ficha-blocos");
    fichaNome = document.getElementById("ficha-nome");
    fichaLinhaClasse = document.getElementById("ficha-linha-classe");
    fichaAtributos = document.getElementById("ficha-atributos");
    fichaDefesa = document.getElementById("ficha-defesa");
    fichaProtecao = document.getElementById("ficha-protecao");
    fichaResistencias = document.getElementById("ficha-resistencias");
    fichaAtaque = document.getElementById("ficha-ataque");
    fichaAtaqueEspecial = document.getElementById("ficha-ataque-especial");
    fichaPericias = document.getElementById("ficha-pericias");
    campoQuantidade = document.getElementById("campo-quantidade");

    campoValorPv = document.getElementById("valor-pv");
    campoMaxPv = document.getElementById("max-pv");
    preenchimentoPv = document.querySelector("#progresso-pv .recurso-preenchimento");
    campoValorSan = document.getElementById("valor-san");
    campoMaxSan = document.getElementById("max-san");
    preenchimentoSan = document.querySelector("#progresso-san .recurso-preenchimento");
    campoValorPe = document.getElementById("valor-pe");
    campoMaxPe = document.getElementById("max-pe");
    preenchimentoPe = document.querySelector("#progresso-pe .recurso-preenchimento");

    ouvirRecurso("pv", { menos: "bt-pv-menos", mais: "bt-pv-mais", valor: "valor-pv", max: "max-pv" });
    ouvirRecurso("san", { menos: "bt-san-menos", mais: "bt-san-mais", valor: "valor-san", max: "max-san" });
    ouvirRecurso("pe", { menos: "bt-pe-menos", mais: "bt-pe-mais", valor: "valor-pe", max: "max-pe" });

    faixaMorrendo = document.getElementById("faixa-morrendo");
    rodadasMorrendo = document.getElementById("rodadas-morrendo");
    avisoMorrendo = document.getElementById("aviso-morrendo");
    faixaEnlouquecendo = document.getElementById("faixa-enlouquecendo");
    rodadasEnlouquecendo = document.getElementById("rodadas-enlouquecendo");
    avisoEnlouquecendo = document.getElementById("aviso-enlouquecendo");

    caixasMorrendo = rodadasMorrendo.querySelectorAll(".caixa-rodada");
    caixasEnlouquecendo = rodadasEnlouquecendo.querySelectorAll(".caixa-rodada");
    ouvirCaixas(caixasMorrendo, "rodadasMorrendo");
    ouvirCaixas(caixasEnlouquecendo, "rodadasEnlouquecendo");

    // Etapa 2: diálogo de calibração + dica + botão "Grade (G)" ativo.
    dialogoCalibrar = document.getElementById("dialog-calibrar");
    erroCalibrar = document.getElementById("erro-calibrar");
    campoMetrosCalibrar = document.getElementById("campo-metros-calibrar");
    dica = document.getElementById("dica");

    document.getElementById("bt-salvar-escala").addEventListener("click", aoSalvarEscala);
    document.getElementById("bt-cancelar-escala").addEventListener("click", aoCancelarEscala);
    document.getElementById("bt-grade").addEventListener("click", function () {
      MESA.ferramentas.alternarGrade();
    });
    document.getElementById("bt-grade").disabled = false;

    // E4: névoa + apresentação.
    var btNevoa = document.getElementById("bt-nevoa");
    btNevoa.addEventListener("click", function () {
      MESA.ferramentas.selecionarFerramenta("nevoa");
    });
    document.getElementById("bt-nevoa-ligar").addEventListener("click", function () {
      MESA.ferramentas.alternarNevoa();
    });
    document.getElementById("bt-nevoa-pincel").addEventListener("click", function () {
      definirForma("pincel");
    });
    document.getElementById("bt-nevoa-retangulo").addEventListener("click", function () {
      definirForma("retangulo");
    });
    document.getElementById("bt-nevoa-revelar").addEventListener("click", function () {
      definirModo("revelar");
    });
    document.getElementById("bt-nevoa-esconder").addEventListener("click", function () {
      definirModo("esconder");
    });
    document.getElementById("bt-nevoa-limpar").addEventListener("click", function () {
      MESA.ferramentas.nevoaPreencher(false); // tudo revelado
    });
    document.getElementById("bt-nevoa-elevar").addEventListener("click", function () {
      MESA.ferramentas.nevoaPreencher(true); // tudo escondido
    });
    document.getElementById("bt-apresentar").addEventListener("click", alternarApresentacao);
    atualizarNevoa();

    // E5: d20 + fatality.
    campoModificador = document.getElementById("campo-modificador");
    btVantagem = document.getElementById("bt-vantagem");
    btDesvantagem = document.getElementById("bt-desvantagem");
    historicoEl = document.getElementById("historico-rolagens");
    bolhaEl = document.getElementById("bolha-rolagem");
    btFatality = document.getElementById("bt-fatality");
    menuFatality = document.getElementById("menu-fatality");
    document.getElementById("bt-rolar").addEventListener("click", rolarD20);
    btVantagem.addEventListener("click", function () { alternarVantagem("vantagem"); });
    btDesvantagem.addEventListener("click", function () { alternarVantagem("desvantagem"); });
    btFatality.addEventListener("click", abrirMenuFatality);

    // E6: arma.
    btArmaSem = document.getElementById("bt-arma-sem");
    btArmaCom = document.getElementById("bt-arma-com");
    armaFicha = document.getElementById("arma-ficha");
    armaSemImagem = document.getElementById("arma-sem-imagem");
    btArmaSem.addEventListener("click", function () {
      var token = tokenAtivo();
      if (token) MESA.arma.definirModo(token, "sem");
    });
    btArmaCom.addEventListener("click", function () {
      var token = tokenAtivo();
      if (token) MESA.arma.definirModo(token, "com");
    });

    // E6: falas (edição no blur/Enter; "Falar" mostra o balão).
    falasVazio = document.getElementById("falas-vazio");
    falasControles = document.getElementById("falas-controles");
    btRestaurarFalas = document.getElementById("bt-restaurar-falas");
    camposFala = [
      document.getElementById("campo-fala-1"),
      document.getElementById("campo-fala-2"),
      document.getElementById("campo-fala-3")
    ];
    botoesFalar = [
      document.getElementById("bt-falar-1"),
      document.getElementById("bt-falar-2"),
      document.getElementById("bt-falar-3")
    ];
    for (var i = 0; i < 3; i++) {
      (function (indice) {
        var campo = camposFala[indice];
        var botao = botoesFalar[indice];
        campo.addEventListener("input", function () {
          botao.disabled = !campo.value.trim();
        });
        campo.addEventListener("change", function () {
          salvarFala(indice, campo.value);
        });
        campo.addEventListener("keydown", function (evento) {
          if (evento.key === "Enter") {
            evento.preventDefault();
            salvarFala(indice, campo.value);
            campo.blur();
          }
        });
        botao.addEventListener("click", function () {
          var token = tokenAtivo();
          if (!token || !campo.value.trim()) return;
          salvarFala(indice, campo.value);
          MESA.baloes.mostrar(token, campo.value.trim());
        });
      })(i);
    }
    btRestaurarFalas.addEventListener("click", restaurarFalas);

    // E6: chat.
    chatRotulo = document.getElementById("chat-rotulo");
    campoChat = document.getElementById("campo-chat");
    btEnviarChat = document.getElementById("bt-enviar-chat");
    historicoChat = document.getElementById("historico-chat");
    campoChat.addEventListener("input", function () {
      btEnviarChat.disabled = !campoChat.value.trim();
    });
    campoChat.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter") {
        evento.preventDefault();
        enviarChat();
      }
    });
    btEnviarChat.addEventListener("click", enviarChat);
    document.getElementById("bt-limpar-chat").addEventListener("click", function () {
      MESA.baloes.limparChat();
      pintarChat();
    });
    pintarChat();

    atualizarEscala(MESA.estado.cena());
    atualizarPainelToken();
  }

  // ---------------------------------------------------------------
  // Névoa (E4): botões forma/modo refletem o estado dos handlers;
  // o botão "ligar" mostra o estado da névoa (ligada/desligada).
  // ---------------------------------------------------------------
  function definirForma(forma) {
    MESA.ferramentas.definirNevoaForma(forma);
    atualizarNevoa();
  }

  function definirModo(modo) {
    MESA.ferramentas.definirNevoaModo(modo);
    atualizarNevoa();
  }

  function atualizarNevoa() {
    var ligada = MESA.ferramentas.nevoaLigada();
    document.getElementById("bt-nevoa-ligar").textContent = ligada ? "Névoa ligada" : "Névoa desligada";
    document.getElementById("nevoa-controles").classList.toggle("oculta", !ligada);
    document.getElementById("bt-nevoa-pincel").classList.toggle("ativa",
      MESA.ferramentas.nevoaFormaAtual() === "pincel");
    document.getElementById("bt-nevoa-retangulo").classList.toggle("ativa",
      MESA.ferramentas.nevoaFormaAtual() === "retangulo");
    document.getElementById("bt-nevoa-revelar").classList.toggle("ativa",
      MESA.ferramentas.nevoaModoAtual() === "revelar");
    document.getElementById("bt-nevoa-esconder").classList.toggle("ativa",
      MESA.ferramentas.nevoaModoAtual() === "esconder");
  }

  MESA.interface = {
    iniciar: iniciar,
    mostrarErro: mostrarErro,
    esconderErro: esconderErro,
    atualizarEscala: atualizarEscala,
    atualizarPainelToken: atualizarPainelToken,
    alternarPainel: alternarPainel,
    abrirDialogoCalibrar: abrirDialogoCalibrar,
    fecharDialogoCalibrar: fecharDialogoCalibrar,
    mostrarDica: mostrarDica,
    esconderDica: esconderDica,
    alternarApresentacao: alternarApresentacao,
    emApresentacao: emApresentacaoAgora,
    atualizarNevoa: atualizarNevoa,
    atualizarBolhaRolagem: atualizarBolhaRolagem,
    mostrarAviso: mostrarAviso,
    painelVisivel: painelVisivel,
    focarChat: focarChat
  };
})();
