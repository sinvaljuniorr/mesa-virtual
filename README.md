# Mesa Virtual — Ordem Paranormal

Mesa virtual simples, em uma única tela (a do mestre), para as sessões do RPG de Ordem Paranormal. Feita em **HTML, CSS e JavaScript puros** — sem frameworks, sem TypeScript, sem servidor, sem internet.

## Como abrir

1. Coloque seus arquivos nas pastas certas (abaixo).
2. **Dê duplo clique em `index.html`** — o jogo abre no navegador e funciona offline.

Se nada aparecer, abra com o navegador Chrome, Edge ou Firefox (qualquer versão recente).

## Onde fica o jogo

O arquivo principal é **`index.html`**, dentro da pasta `mesa-virtual/`.
A pasta completa também contém `css/`, `js/`, `data/` e `assets/` — a mesa não funciona de um arquivo sozinho: leve a pasta inteira junto.

## Onde ficam os seus arquivos

| O quê | Caminho |
|---|---|
| Mapa da cena "Casa" | `assets/maps/casa.jpg` |
| Imagem do personagem | `assets/tokens/personagem-01.png` (PNG com fundo transparente) |
| Dados iniciais da cena | `data/cena-casa.js` |
| Dados iniciais dos tokens | `data/tokens.js` |

> **Importante:** dois arquivos são esperados em caminhos exatos:
> `assets/maps/casa.jpg` (mapa) e `assets/tokens/personagem-01.png` (o
> agente Pierre).
> Enquanto faltar algum, a mesa mostra um quadrado cinza no lugar
> + faixa vermelha "Arquivo não encontrado" — e continua funcionando.

## Por que o Pierre e o monstro sempre aparecem

Ao abrir o `index.html`, a mesa carrega o que está salvo no navegador e
**completa o que faltar**: cada token dos dados iniciais que não estiver no
salvamento volta com nome e posição originais. Ou seja, o Pierre e o
monstro nunca "somem" — nem com um salvamento antigo, nem depois de
importar um JSON antigo. O que você mover/renomear continua salvo como
estava.

## O que a v1 faz (roadmap de implementação)

- **Etapa 0 — Fundação** ✅: mapa com pan (arrastar) e zoom (roda do mouse), salvamento automático.
- **Etapa 1 — Tokens** ✅: dois tokens arrastáveis, seleção, nome e tamanho, exportar/importar JSON.
- **Etapa 2 — Escala e régua** ✅: calibração de escala, régua com ímã nos tokens, grade opcional. **v1 completa.**
- **Etapa 3 — Ficha do personagem** ✅: PV/Sanidade/PE editáveis, barras sobre o token, estados "Morrendo"/"Enlouquecendo" com rodadas, migração de estado v1->v2.
- **Etapa 4 — Névoa de guerra** ✅: máscara por células, pincel/retângulo, modo apresentação (P).
- **Etapa 5 — d20 e Fatality** ✅: rolagem com vantagem/desvantagem, histórico e fatality.
- **Etapa 6 — Arma, falas e chat** ✅: alternar sem/com arma (tecla `A`), 3 falas prontas em balão (teclas `1`/`2`/`3`), chat livre com histórico curto; migração v3->v4.
- Depois (v2): múltiplas cenas, iniciativa e ping (E7).

## Atalhos

| Tecla | Ação |
|---|---|
| `V` | Ferramenta Selecionar |
| `H` | Ferramenta Mover mapa |
| `R` | Ferramenta Régua |
| `C` | Ferramenta Calibrar escala |
| `G` | Liga/desliga a grade |
| `Espaço` (segurando) | Pan temporário |
| Roda do mouse | Zoom centrado no cursor (0,2 a 4) |
| Botão do meio | Pan |
| `Esc` | Cancelar medição/calibração |
| `+` / `-` | Aumentar/diminuir o token selecionado |
| `0` | Volta o token selecionado ao tamanho padrão |
| `A` | Alterna sem arma / com arma do token selecionado (E6) |
| `1` / `2` / `3` | Fala pronta 1, 2 ou 3 do token selecionado (E6) |
| `Enter` | Foca o campo do chat (painel visível, nenhum campo em foco) |
| `Tab` | Esconde/mostra o painel do mestre |

> Clique (sem arrastar) em um token seleciona e mostra a ficha dele no painel. `Esc` cancela a régua/calibração. Enquanto o foco estiver em um campo de texto, os atalhos ficam desligados (só `Esc` atua, saindo do campo).

## Salvamento

O estado (câmera, escala, posição, tamanho, nomes e **PV/Sanidade/PE**) é salvo **automaticamente** no `localStorage` do navegador. Também é possível **Exportar** e **Importar** um arquivo JSON. "Redefinir cena" volta ao estado inicial e apaga o salvamento local.

## Ficha do personagem (Etapa 3)

Ao **clicar no Pierre** (sem arrastar), o painel mostra a ficha dele: classe/patente/NEX, PV, Sanidade e PE com **barras de vida sobre o token** no mapa, atributos, defesa, resistências, ataque e perícias treinadas.

- **Editar valores:** campos "atual"/"máximo" ou os botões "−"/"+" (usando **Quantidade**).
- **Morrendo / Enlouquecendo:** aparecem quando PV (ou Sanidade) chega a **0**, com as 3 caixas de rodadas da ficha. Curar volta acima de 0 apaga a faixa e zera as caixas. Marcar as três mostra "Três rodadas marcadas." — nada acontece automaticamente.
- **Editar os demais campos** (atributos, defesa, ataque, perícias): direto no arquivo `data/ficha-pierre.js`, em texto.
- Fichas de outros personagens: copie o bloco da ficha do Pierre em `data/ficha-pierre.js` mude os valores e adicione a ficha ao token em `data/tokens.js` (`fichaId` + `recursos`).

## Tokens Dante e Duck

Novos tokens de personagem (`tok_dante` / `tok_duck`), com PNG de fundo transparente em `assets/tokens/dante.png` e `duck.png` (fundo da foto removido por GrabCut + limpeza de contorno, fora do jogo). Sem ficha por enquanto — só nome e posição; quando criarem a ficha, aceitam `fichaId` + `recursos` como o Pierre.

## Névoa de guerra e modo apresentação (Etapa 4)

- **Ligar/desligar:** ferramenta **Névoa (F)** na barra, botão **"Névoa desligada/ligada"** no painel. Ao ligar pela primeira vez, a máscara nasce com **NADA escondido** — só fica invisível o que você pintar por cima (células de 1/4 de quadrado).
- **Tokens somem sob a névoa:** um token (personagem ou monstro) sob uma célula escondida **não é desenhado** — fica invisível de verdade e nem é clicável. Revele a célula para ele reaparecer.
- **Pintar:** **Pincel** (arraste; o **Raio** em células controla a espessura) ou **Retângulo** (arraste de canto a canto). Modos **Revelar** / **Esconder**; segurar **Shift inverte o modo** durante o arraste.
- **Zerar a máscara:** "Tudo revelado" ou "Tudo escondido".
- **Como o mestre vê:** a névoa aparece **suave (35%) por cima do mapa e dos tokens** — você vê o que os jogadores não veem.
- **Apresentar (P):** esconde o painel, o banner de escala e a dica, e a névoa fica **quase opaca (85%)** — é essa tela que se mostra para os jogadores. Aperte **P de novo** para voltar. O modo apresentação é **efêmero**: não fica salvo.
- O que foi pintado é salvo automaticamente (compactado em base64, ~1 bit por célula) junto com o resto do estado, incluindo nos Exportar/Importar.

## Rolador de d20 (Etapa 5)

Na seção **d20** do painel (visível sempre, com ou sem token selecionado):

- **Rolar d20:** rola 1d20 + o **Modificador**. Com um token selecionado, o resultado aparece numa **bolha flutuante sobre o token** (some em 5 s); sem token, aparece no centro da mesa.
- **Vantagem / Desvantagem:** clicados, rolam **2d20** e pegam o **maior** (vantagem) ou o **menor** (desvantagem) — o modificador é somado depois. Crítico e falha crítica consideram o dado *escolhido*. Os dois botões se anulam se ativados juntos (padrão usual; `[L] confirmar no livro`).
- **Crítico = 20 natural** (linha dourada "CRÍTICO!"), **falha crítica = 1 natural** (linha vermelha "FALHA CRÍTICA!") — independentemente do modificador.
- **Histórico:** as últimas **8 rolagens** ficam listadas na seção (efêmero — não fica salvo nem vai no Exportar).

## Fatality (Etapa 5)

Com um token selecionado e pelo menos uma fatality cadastrada, aparece o botão **Fatality** no painel. Ele abre um menu; ao escolher, a mesa **escurece**, a animação toca **uma vez** e o token termina **morto** (cinza com X branco). Clicar no fundo escuro **pula** a animação. Com "reduzir movimento" ativo no sistema, vai direto ao resultado.

Para cadastrar as suas (arte de criação sua), edite `data/fatality-manifest.js`:

```
1. Extraia os frames do GIF/vídeo como PNGs numerados:
   - ImageMagick (linha de comando, Windows): magick video.gif frame_%03d.png
   - Ou GIMP: exporte cada quadro como frame_001.png, frame_002.png...
2. Coloque os PNGs numa pasta dentro de assets/fatality/ (ex.: assets/fatality/decapitacao/).
3. Adicione um item em window.MESA_FATALITIES:
   { nome: "Decapitação",                    // rótulo no menu
     pasta: "assets/fatality/decapitacao/",  // pasta dos frames
     frames: ["frame_001.png", "frame_002.png"],
     fps: 12,                                // quadros por segundo
     alvo: "token",                          // "token" (sobre o token) | "tela" (tela inteira)
     som: "",                                // .mp3/.wav opcional (caminho local; funciona em file://)
     personagem: "" }                        // vazio = todos; ou fichaId/nome (ex.: "tok_personagem_01")
```

Notas:
- Os frames ficam **pré-carregados só quando você usa** (a primeira vez pode dar um leve atraso).
- O estado **"morto" fica salvo** (recarregar a página mantém cinza + X).
- O manifest vem **vazio por padrão** — nada aparece até você cadastrar.

## Modo arma, falas em balão e chat (Etapa 6)

### Modo arma (`A`)

Com o **Pierre selecionado**, a tecla `A` (ou os botões **"Sem arma"/"Com arma"** na seção **Arma** do painel) troca a imagem do token:

- **Sem arma:** `assets/tokens/personagem-01.png`
- **Com arma:** `assets/tokens/personagem-01-machado.png`

O modo fica **salvo** (recarregar mantém). Tokens sem a segunda imagem (como o Monstro de teste) mostram **"Este token não tem imagem com arma."** e o controle fica desabilitado. "Arma: machado" no painel vem do ataque da ficha (`data/ficha-pierre.js`). Se o arquivo do modo escolhido não carregar, a mesa usa a outra imagem, avisa **"Arquivo não encontrado: {caminho}"** na faixa vermelha e não quebra. Para dar arma a outro token, coloque o PNG e preencha `imagens.comArma` dele em `data/tokens.js`.

### Falas prontas (`1`, `2`, `3`)

Cada personagem tem **3 falas editáveis** na seção **Falas** do painel (máx. 80 caracteres). Editar salva ao sair do campo (ou `Enter`) e persiste no `localStorage` e na exportação. As teclas `1`/`2`/`3` mostram a fala correspondente em **balão sobre o token selecionado**; **"Restaurar falas padrão"** volta aos textos de `data/falas.js`.

- Balão: fundo claro com borda escura, até **240 px × 5 linhas** ("…" se passar), duração de **3 a 8 s** conforme o texto (`3000 + 60 ms por caractere`), esmaece nos últimos 400 ms (some direto com "reduzir movimento" ativo). Um balão por token — fala nova substitui a antiga; o balão acompanha arraste/zoom e nunca sai do canvas.
- Tokens sem falas prontas (monstros) mostram **"Este token não tem falas prontas."** — mas podem falar pelo chat.

**Onde trocar as falas padrão:** arquivo `data/falas.js` — cada chave é o `id` do token (`tok_personagem_01`, `tok_dante`, `tok_duck`) e o valor são as 3 frases. Os textos atuais são **provisórios**; troque pelos reais aí (mantendo 3 itens) ou edite no painel.

### Chat (fim do painel)

- **"Falar como: {nome}"** mostra o token selecionado ("Selecione um token para falar." e campo desabilitado sem seleção).
- Campo de até **140 caracteres**: `Enter` ou **"Enviar"** mostra o texto em balão sobre o token, adiciona uma linha **"{nome}: {texto}"** no histórico, limpa o campo e devolve o foco ao mapa. Mensagem só de espaços é ignorada.
- **Histórico:** últimas 20 mensagens (máx. 160 px, rolagem própria), `aria-live="polite"`, **efêmero** — zera ao recarregar e **não vai** no Exportar. "Limpar chat" apaga.
- O campo do chat **não** roda atalhos por engano: enquanto o foco estiver em qualquer campo, os atalhos globais ficam desligados; `Enter` devolve o foco ao mapa. Com o painel escondido (`Tab` ou apresentação), `A`/`1`/`2`/`3` continuam funcionando e `Enter` não faz nada.

### Estado (migração v4)

A exportação/importação passou a incluir **`modoArma`** e **`falas`** do token (migração v3->v4 automática). Estados e arquivos antigos carregam sem perder posição, tamanho, escala, câmera, ficha, recursos nem névoa; o Pierre salvo antes da Etapa 6 ganha a imagem do machado e as falas padrão ao abrir.

## Escala do mapa

- O padrão provisório é **1 metro = 33,3 px** (equivale a 50 px por quadrado de 1,5 m).
- Use a ferramenta **Calibrar escala (C)** para medir no mapa uma distância real conhecida (ex.: o comprimento de um cômodo) e informar quantos metros ela tem.
- O valor "1,5 m por quadrado" é o padrão provisório; **confirme no livro de regras**.

## Como remover o fundo branco de um token (guia rápido, Windows)

Suas artes token devem ter **fundo transparente**. Se uma imagem aparecer
com fundo branco ou xadrez (é o caso se você salvou a *prévia* do editor em
vez de exportar a arte), há três caminhos:

1. **No próprio editor (recomendado):** reabra a arte original no editor,
   apague o fundo (borracha mágica / seleção) e use **Exportar PNG**
   (não "salvar como" a prévia). O indicador de transparência correta é o
   xadrez cinza/branco *na tela do editor*, sem ele aparecendo na imagem.
2. **Ferramenta online:** sites como remove-bg apagam o fundo; baixe o
   resultado em PNG.
3. **Ferramenta local incluída:** `../estudo/remover-fundo.js` (roda com
   Node) apaga o fundo claro conectado às bordas por *flood fill*:

   ```
   node estudo\remover-fundo.js
   ```

   Ajuste os caminhos `entrada`/`saida` no topo do arquivo. Ela apaga
   apenas pixels quase-brancos/cinza-claro sem cor — a arte colorida e
   escura fica intacta.

## Fontes de estudo e licenças

Este projeto foi construído do zero, estudando como os sistemas abaixo funcionam (análise na pasta `/estudo`). **Nenhum código dos seguintes projetos foi copiado:**

- **slateVTT** (MIT) — motor de canvas, coordenadas, câmera, tokens.
- **fogcast** (MIT) — névoa de grid baseada em `Uint8Array` (futura E4).
- **dungeon-revealer** (AGPL-3.0) — técnica `globalCompositeOperation` (futura E4; só o conceito geral).
- **owlbear-rodeo-legacy** (não comercial) — referência de modelo de dados e UX.
- **ordemparanormal_fvtt** (CC BY-NC-SA 4.0) — modelo de dados de PV/SAN/PE e rolagem d20.

## Créditos do mapa

Mapa da casa: **Patreon | Silver Compass Maps** — o crédito está impresso na própria imagem. **Não recorte, não esconde nem remova o crédito** (uso pessoal e não comercial).
