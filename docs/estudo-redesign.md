# Estudo de Engenharia e Design de Sistemas de UI: Mesa Virtual (Ordem Paranormal)

> **Documento:** `docs/estudo-redesign.md`  
> **Natureza:** Somente Leitura (Auditoria e Inventário Técnico Pré-Redesign)  
> **Alvo:** `mesa-virtual/` (`index.html`, `css/`, `js/`, `data/`, `assets/`)  
> **Data:** Outubro de 2026  
> **Responsáveis:** Engenharia Front-end, Auditoria de Código e Design de UI  

---

## Sumário

- [Sumário Executivo](#sumário-executivo)
- [3.1 Mapa do Projeto](#31-mapa-do-projeto)
- [3.2 Arquitetura de Renderização](#32-arquitetura-de-renderização)
- [3.3 CSS Atual](#33-css-atual)
- [3.4 HTML e DOM (O Contrato JS ↔ DOM)](#34-html-e-dom-o-contrato-js--dom)
- [3.5 Estado e Persistência](#35-estado-e-persistência)
- [3.6 Interações](#36-interações)
- [3.7 Estados Visuais Existentes](#37-estados-visuais-existentes)
- [3.8 Assets](#38-assets)
- [3.9 Problemas Visuais Observados pelo Usuário](#39-problemas-visuais-observados-pelo-usuário)
- [3.10 Riscos para o Redesign](#310-riscos-para-o-redesign)
- [3.11 Oportunidades de Baixo Risco](#311-oportunidades-de-baixo-risco)
- [3.12 Dúvidas](#312-dúvidas)
- [Checklist de Regressão](#checklist-de-regressão)

---

## Sumário Executivo

A Mesa Virtual é uma SPA offline desenvolvida em HTML5, CSS3 e JavaScript puro (ES5/ES6 compatível), sem dependências externas, bundlers ou frameworks, concebida para rodar diretamente via `file://`. A interface opera sobre um canvas 2D único de alta performance (renderização sob demanda com pan/zoom matricial) sobreposto por painéis e controles DOM. O estado persiste em `localStorage` sob a chave `mesaRPG.v1` com migrações retrocompatíveis automáticas (v1 a v4). Os **5 maiores riscos** identificados para o redesign visual são:
1. **Acoplamento Canvas-JS:** Elementos visuais vitais (balões de fala, barras PV/SAN/PE, anel de seleção, monstro "M", grade e régua) têm cores e medidas fixadas em código hexadecimal dentro do JavaScript e **não respondem ao CSS**.
2. **Quebra do Contrato DOM:** Mais de 80 seletores de IDs, classes de controle (`.oculta`, `.ativa`, `.oculta-nesta-tela`) e atributos ARIA são acoplados rigidamente aos scripts. Alterações de marcação quebrarão o comportamento.
3. **Colisão de Empilhamento Estrutural:** O `#painel` lateral (`position: absolute; top: 0; z-index: 10`) sobrepõe a barra superior (`#barra`), ocultando botões de exportação/importação em janelas médias e estreitas.
4. **Corrupção de Estado e Persistência:** A estrutura do objeto salvo no `localStorage` e nos JSONs exportados possui tipagem estrita; qualquer alteração acidental no schema de serialização inutilizará campanhas existentes.
5. **Ciclo de Redesenho do Canvas:** O laço contínuo de `requestAnimationFrame` depende do gatilho `needsRender`; modificações que induzam repaint desnecessário ou quebrem o debounce de entrada comprometerão o framerate da mesa.

---

## 3.1 Mapa do Projeto

### Árvore de Arquivos e Pastas
```text
mesa-virtual/
├── index.html
├── README.md
├── assets/
│   ├── maps/
│   │   └── casa.jpg
│   └── tokens/
│       ├── dante.png
│       ├── duck.png
│       ├── personagem-01-machado.png
│       └── personagem-01.png
├── css/
│   └── estilo.css
├── data/
│   ├── cena-casa.js
│   ├── falas.js
│   ├── fatality-manifest.js
│   ├── ficha-pierre.js
│   └── tokens.js
├── docs/
│   └── estudo-redesign.md (este arquivo)
└── js/
    ├── arma.js
    ├── baloes.js
    ├── coords.js
    ├── dado.js
    ├── dados-iniciais.js
    ├── entrada.js
    ├── estado.js
    ├── fatality.js
    ├── ferramentas.js
    ├── ficha.js
    ├── interface.js
    ├── nevoa.js
    ├── principal.js
    └── render.js
```

### Inventário de Arquivos
| Arquivo | Função em uma linha | Tamanho |
|---|---|---|
| `index.html` | Ponto de entrada HTML contendo barra, canvas, painel lateral e modais | 331 linhas |
| `README.md` | Documentação técnica, decisões de arquitetura e histórico de etapas | 208 linhas |
| `css/estilo.css` | Folha de estilo global com temas, layout grid/flex e tokens de design | 594 linhas |
| `data/cena-casa.js` | Dados iniciais da cena padrão "Casa" expostos em `window.MESA_DADOS` | 53 linhas |
| `data/falas.js` | Falas prontas padrão dos personagens expostas em `window.MESA_DADOS.falas` | 15 linhas |
| `data/fatality-manifest.js` | Manifesto de animações de fatality em `window.MESA_FATALITIES` | 24 linhas |
| `data/ficha-pierre.js` | Atributos e perícias da ficha do Pierre em `window.MESA_DADOS.fichas` | 44 linhas |
| `data/tokens.js` | Definição dos tokens iniciais da mesa (Pierre, monstro, Dante, Duck) | 70 linhas |
| `js/coords.js` | Funções matemáticas puras de conversão entre coordenadas de tela, mundo e grade | 90 linhas |
| `js/ficha.js` | Lógica pura de regras de recursos (PV/SAN/PE), estados e ordenação de perícias | 107 linhas |
| `js/nevoa.js` | Gerenciamento da máscara binária de névoa, rasterização e compactação base64 | 267 linhas |
| `js/arma.js` | Controle de alternância de sprite (com/sem arma) para o token selecionado | 80 linhas |
| `js/baloes.js` | Temporização, quebra de texto e renderização gráfica de balões de fala | 306 linhas |
| `js/dado.js` | Rolagem matemática de 1d20/2d20 com vantagem, desvantagem e modificador | 85 linhas |
| `js/fatality.js` | Carregador e reprodutor de animações quadro a quadro com overlay | 147 linhas |
| `js/estado.js` | Repositório central de estado, persistência `localStorage`, export/import e migrações | 331 linhas |
| `js/render.js` | Motor de renderização 2D no canvas, transformações de câmera, grade e sobreposições | 493 linhas |
| `js/entrada.js` | Máquina de estados para ponteiro, toque, roda do mouse e atalhos de teclado | 350 linhas |
| `js/ferramentas.js` | Controle das ferramentas ativas da barra, régua com ímã e calibração | 325 linhas |
| `js/interface.js` | Conexão entre eventos do DOM, painel lateral do mestre e atualizações visuais | 1000 linhas |
| `js/dados-iniciais.js` | Montagem profunda (`structuredClone`) do estado inicial a partir dos dados | 43 linhas |
| `js/principal.js` | Script orquestrador de inicialização invocado no `DOMContentLoaded` | 34 linhas |

- **Ponto de entrada:** `index.html` [confirmado: `index.html:1-331`].
- **Ordem de carregamento dos scripts:** Definida estaticamente no fim do `<body>` (`index.html:311-329`):
  1. `data/cena-casa.js`
  2. `data/tokens.js`
  3. `data/falas.js`
  4. `data/ficha-pierre.js`
  5. `data/fatality-manifest.js`
  6. `js/coords.js`
  7. `js/ficha.js`
  8. `js/nevoa.js`
  9. `js/arma.js`
  10. `js/baloes.js`
  11. `js/dado.js`
  12. `js/fatality.js`
  13. `js/estado.js`
  14. `js/render.js`
  15. `js/entrada.js`
  16. `js/ferramentas.js`
  17. `js/interface.js`
  18. `js/dados-iniciais.js`
  19. `js/principal.js`
- **Uso de módulos:** Todos utilizam scripts globais convencionais (`<script src="...">` sem `type="module"`), anexando-se aos objetos globais `window.MESA` e `window.MESA_DADOS`. O uso de ES Modules é proibido explicitamente no código porque navegadores bloqueiam módulos locais no protocolo `file://` via política de CORS [confirmado: `index.html:309-310`, `data/cena-casa.js:3-4`].
- **Dependências externas:** Zero. Nenhuma fonte do Google Fonts, CDN externo, biblioteca JS ou folha de estilo remota [confirmado: `index.html:1-331`].
- **Como o projeto roda:** Abrir diretamente o arquivo `index.html` no navegador (duplo clique local, protocolo `file://`), funcionando 100% offline [confirmado: `README.md:8-9`]. Também roda se servido por servidores web locais simples (ex: `npx serve`, `python -m http.server`).

---

## 3.2 Arquitetura de Renderização

### Camadas e Ordem de Empilhamento
A aplicação combina renderização gráfica de alta velocidade via `<canvas id="tela">` com elementos de interface estruturados em DOM HTML sobrepostos:

1. **Camadas do Canvas 2D (`#tela`)** [confirmado: `render.js:277-352`]:
   - **Camada 1 (Fundo):** Preenchimento total do canvas com a cor `#0E0F11` (`render.js:284`).
   - **Camada 2 (Câmera do Mundo):** Aplicação da matriz `ctx.setTransform(fator, 0, 0, fator, -cam.x * fator, -cam.y * fator)` (`render.js:288-289`).
   - **Camada 3 (Mapa):** `ctx.drawImage(imagemMapa, 0, 0)` com suavização ativada (`render.js:292-294`). Se falhar, renderiza bloco `#3A3D42` (`render.js:296-298`).
   - **Camada 4 (Grade):** Linhas brancas `#FFFFFF` com 18% de opacidade espaçadas por metros de mundo (`render.js:359-387`).
   - **Camada 5 (Tokens):** Ordenados no eixo Y (`render.js:307-309`). Tokens sob células de névoa escondidas são omitidos do desenho (`render.js:312`).
     - Sprite da imagem ou círculo do monstro (`#9B1B30` ou `#5A5E64` com letra "M") (`render.js:173-210`).
     - Barras de recursos PV (`#D64545`), Sanidade (`#7B88F0`) e PE (`#E08A2E`) posicionadas 20px acima da imagem (`render.js:231-255`).
     - Anel de seleção dourado `#D4A72C` de 2px de espessura (`render.js:216-222`).
     - Marca de morte (filtro grayscale + cruz "X" em `#FFFFFF` de 3px) se `token.estado === "morto"` (`render.js:185-193`).
   - **Camada 6 (Névoa de Guerra):** Composição da máscara offscreen de 1/4 de quadrado por célula (`nevoa.js:220-244`), desenhada via `ctx.drawImage` com alpha de 35% no modo mestre e 85% no modo apresentação (`render.js:318-328`).
   - **Camada 7 (Preview de Retângulo da Névoa):** Retângulo semitransparente `rgba(212, 167, 44, 0.25)` com contorno `#D4A72C` durante o arraste (`render.js:331-342`).
   - **Camada 8 (Balões de Fala):** Desenhados em coordenadas de tela puras após reset de matriz (`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`). Fundo claro `#F2EFEA`, contorno escuro `#0E0F11` (2px) e ponta triangular direcionada ao token (`baloes.js:180-288`).
   - **Camada 9 (Régua de Medição):** Desenhada em coordenadas de tela. Linha dupla (contorno `#0E0F11` de 5px + centro `#D4A72C` de 3px) e caixa de texto com fundo `rgba(14, 15, 17, 0.85)` e texto `#E8E6E3` (`render.js:395-444`).

2. **Camadas do DOM (Sobreposição HTML/CSS)** [confirmado: `estilo.css`]:
   - `#area` / `#tela`: base da área visual (`z-index: auto`).
   - `.banner` (`#banner-escala`): `z-index: 5` (`estilo.css:137`).
   - `.dica` (`#dica`): `z-index: 5` (`estilo.css:284`).
   - `.faixa-erro` (`#faixa-erro`): `z-index: 6` (`estilo.css:149`).
   - `#painel`: `z-index: 10` (`estilo.css:165`).
   - `.bolha-rolagem` (`#bolha-rolagem`): `z-index: 60` (`estilo.css:550`).
   - `#escuro-fatality`: `z-index: 80` (`estilo.css:571`).
   - `#overlay-fatality`: `z-index: 90` (`estilo.css:577`).
   - `<dialog id="dialog-calibrar">`: Top-layer nativo do navegador via `showModal()`.

### Loop de Animação
Existe um loop contínuo invocado via `requestAnimationFrame(laco)` [confirmado: `render.js:452-463`]. Contudo, a rotina `desenhar()` opera em **modo sob demanda (flag `needsRender`)**: se nada mudou na cena, o quadro não é redesenhado. As únicas exceções em que o redesenho se torna contínuo a cada frame são:
1. Durante a exibição de um balão de fala, para calcular a opacidade de esmaecimento suave nos últimos 400ms (`baloes.js:95-100`, `render.js:456`).
2. Durante a execução de animações de Fatality (`fatality.js:94-116`).
3. Para reposicionamento da `.bolha-rolagem` flutuante do d20 caso o mapa sofra pan/zoom enquanto a bolha estiver ativa (`render.js:459-462`, `interface.js:657-668`).

### Tabela de Elementos Visuais e Estilização
| Elemento Visual | Onde é definido (`arquivo:linha`) | Tecnologia | Cores e Medidas Fixas no Código | Estilizável só com CSS? |
|---|---|---|---|---|
| Fundo do canvas | `render.js:284` | Canvas 2D | `#0E0F11` preenchendo canvas total | **Não** |
| Fallback do mapa | `render.js:296-298` | Canvas 2D | `#3A3D42`, dimensões 800x600 px | **Não** |
| Imagem do mapa | `render.js:293-294` | Canvas 2D | Dimensões naturais da imagem `casa.jpg` | **Não** |
| Linhas da Grade | `render.js:372-374` | Canvas 2D | `#FFFFFF`, opacidade 0.18, espessura `1/cam.zoom` | **Não** |
| Sprites de Tokens | `render.js:177-183` | Canvas 2D | Dimensão em metros convertida em px | **Não** |
| Token Monstro ("M") | `render.js:198-210, 258-270` | Canvas 2D | Fundo `#9B1B30` ou `#5A5E64`, texto "M" `#FFFFFF`, fonte `sans-serif` | **Não** |
| Estado "Morto" no Token | `render.js:178-193` | Canvas 2D | Filtro `grayscale(1)`, cruz "X" `#FFFFFF` com 3px | **Não** |
| Barras PV/SAN/PE sobre token | `render.js:232-254` | Canvas 2D | Trilha `rgba(14, 15, 17, 0.85)`, PV `#D64545`, SAN `#7B88F0`, PE `#E08A2E`, altura 4px, recuo 20px | **Não** |
| Anel de Seleção | `render.js:218-220` | Canvas 2D | Linha dourada `#D4A72C`, 2px de espessura | **Não** |
| Máscara da Névoa | `nevoa.js:236-241`, `render.js:324-326` | Canvas Offscreen + 2D | Preto `#000000`, alpha 0.35 (mestre) e 0.85 (apresentação) | **Não** |
| Preview Retângulo da Névoa | `render.js:334-336` | Canvas 2D | Fundo `rgba(212, 167, 44, 0.25)`, borda `#D4A72C` de 2px | **Não** |
| Linha da Régua | `render.js:407-418` | Canvas 2D | Contorno `#0E0F11` (5px), linha `#D4A72C` (3px) | **Não** |
| Rótulo da Régua | `render.js:431-443` | Canvas 2D | Fundo `rgba(14, 15, 17, 0.85)`, texto `#E8E6E3`, altura 22px, fonte `600 14px system-ui` | **Não** |
| Balões de Fala | `baloes.js:258-283` | Canvas 2D | Fundo `#F2EFEA`, borda `#0E0F11` (2px), texto `#0E0F11`, raio 10px, ponta 8px, fonte `600 15px system-ui` | **Não** |
| Barra Superior (#barra) | `index.html:17-38`, `estilo.css:45-53` | DOM / CSS | Altura 48px, background `var(--panel)`, padding 0 12px | **Sim** |
| Painel do Mestre (#painel) | `index.html:54-278`, `estilo.css:155-166` | DOM / CSS | Largura 320px, background `var(--panel)`, borda `var(--panel-border)` | **Sim** |
| Banner de Escala | `index.html:44`, `estilo.css:125-138` | DOM / CSS | Background `rgba(23, 25, 28, 0.92)`, border radius 8px | **Sim** |
| Faixa de Erro | `index.html:47`, `estilo.css:140-150` | DOM / CSS | Background `var(--danger)` (`#D64545`), texto `#FFFFFF` | **Sim** |
| Dica Contextual | `index.html:295`, `estilo.css:272-286` | DOM / CSS | Background `rgba(23, 25, 28, 0.92)`, `top: 44px` | **Sim** |
| Diálogo de Calibração | `index.html:282-292`, `estilo.css:228-270` | DOM HTML `<dialog>` | Background `var(--panel)`, min-width 300px | **Sim** |
| Bolha de Rolagem D20 | `index.html:298`, `estilo.css:548-560` | DOM / CSS | Background `rgba(14, 15, 17, 0.92)`, borda `#D4A72C`, texto `#E8E6E3` | **Sim** (Posição `left`/`top` gerada inline por JS) |
| Overlay de Fatality | `index.html:301-304`, `estilo.css:567-584` | DOM + Canvas | Fundo `#escuro-fatality` com `rgba(0,0,0,0.7)`. Canvas interno desenha frames PNG | **Parcialmente** |

> [!CRITICAL]
> **Atenção para o Redesign:** As cores de balões, anel de seleção, barras de PV/SAN/PE no mapa e régua são definidas como literais hexadecimais no JS. O redesign CSS puro não as afetará a menos que sejam criados ganchos via `getComputedStyle` ou um objeto de tema global no JS.

---

## 3.3 CSS Atual

### Organização dos Arquivos
Existe apenas **um** arquivo de estilo: `css/estilo.css` (594 linhas), estruturado sequencialmente nas seguintes 10 seções [confirmado: `estilo.css:1-594`]:
1. Tokens de design (`:root`) (linhas 6-23)
2. Base / Reset (linhas 25-42)
3. Barra de ferramentas (linhas 44-71)
4. Botões (linhas 72-110)
5. Área principal (canvas) (linhas 111-123)
6. Banner provisório + faixa de erro (linhas 124-153)
7. Painel lateral do mestre (linhas 154-226)
8. Diálogo de calibração e dicas (linhas 228-286)
   - 8b. Ficha do token (linhas 288-405)
   - 8c. Névoa e apresentação (linhas 505-531)
   - 8d. d20 e Fatality (linhas 532-584)
   - 8e. Arma, falas e chat (linhas 406-502)
9. Telas estreitas (linhas 585-590)
10. Movimento reduzido (linhas 591-594)

### Variáveis CSS Declaradas em `:root`
[confirmado: `estilo.css:7-23`]:
- `--bg: #0E0F11` (Fundo da página e área externa do mapa)
- `--panel: #17191C` (Fundo da barra de ferramentas e do painel lateral)
- `--panel-border: #2B2F34` (Bordas de separação estrutural e de botões)
- `--hover: #22262A` (Fundo de botões em estado `:hover`)
- `--ink: #E8E6E3` (Cor do texto principal; taxa de contraste > 4,5:1)
- `--muted: #A3A8AE` (Cor de rótulos auxiliares e textos secundários)
- `--accent: #9B1B30` (Destaque da ferramenta ativa e cor base do monstro)
- `--gold: #D4A72C` (Anel de seleção, régua e contornos de foco)
- `--danger: #D64545` (Mensagens e faixas de erro)
- `--pv: #D64545` (Barra de PV no DOM)
- `--san: #7B88F0` (Barra de Sanidade no DOM)
- `--pe: #E08A2E` (Barra de PE no DOM)
- `--bolha-bg: #F2EFEA` (Fundo do balão de fala)
- `--bolha-ink: #0E0F11` (Texto do balão de fala)
- `--bolha-borda: #0E0F11` (Borda do balão de fala)

*(Nota técnica: na linha 541 encontra-se `var(--ink-soft, #B9B7B3)`, mas `--ink-soft` não foi definida no `:root`, caindo sempre no fallback).*

### Cores, Fontes e Espaçamentos Fixos no CSS
- **Cores literais fora das variáveis:**
  - `#FFFFFF`: Texto de botões com classe `.ativa` (`estilo.css:90, 434, 520`), texto da `.faixa-erro` (`146`) e `.faixa-estado` (`358`).
  - `rgba(23, 25, 28, 0.92)`: Fundo do `.banner` (`130`) e da `.dica` (`277`).
  - `rgba(14, 15, 17, 0.85)`: Trilha da `.recurso-barra` (`324`).
  - `#FFD75E`: Linha de crítico no histórico do d20 (`544`).
  - `#FF7A6E`: Linha de falha crítica no histórico do d20 (`545`).
  - `rgba(14, 15, 17, 0.92)`: Fundo da `.bolha-rolagem` (`551`).
  - `#D4A72C`: Borda da `.bolha-rolagem` (`552`).
  - `#E8E6E3`: Texto da `.bolha-rolagem` (`554`).
  - `rgba(0, 0, 0, 0.7)`: Fundo escurecido `#escuro-fatality` (`570`).
  - `rgba(0, 0, 0, 0.5)`: Sombra lateral do painel em telas estreitas (`587`).
- **Família tipográfica:**
  - `system-ui, "Segoe UI", Roboto, sans-serif` [confirmado: `estilo.css:36, 555`].
- **Tamanhos de fonte mais usados:**
  - `14px`: `body` (`37`), `#titulo` (`56`), `#dialog-calibrar h2` (`239`), `.ficha-nome` (`299`).
  - `13px`: `.banner` (`134`), `.faixa-erro` (`148`), `.secao h2` (`169`), `#painel label` (`179`), `.linha-info` (`196`), `.rotulo-auxiliar` (`201`), `#dialog-calibrar p/label` (`244, 249`), `.dica` (`281`), `.recurso-rotulo` (`318`), `.faixa-estado` (`359`), `.linha-chat` (`496`).
  - `12px`: `.linha-historico` (`540`).
- **Espaçamentos e medidas estruturais fixas:**
  - Barra superior: `height: 48px; padding: 0 12px; gap: 8px;` (`estilo.css:50-52`).
  - Painel lateral: `width: 320px; padding: 8px 12px;` (`estilo.css:160, 163`).
  - Inputs numéricos: `width: 130px;` no painel (`191`); `width: 140px;` no diálogo (`260`); `width: 52px;` nos recursos (`345`); `width: 72px;` no raio de névoa (`529`).
  - Botões gerais: `min-height: 32px; border-radius: 6px; padding: 6px 10px;` (`78-80, 109`).
  - Checkboxes de rodada: `width: 18px; height: 18px;` (`375-376`).
  - Histórico de chat: `max-height: 160px; overflow-y: auto;` (`485-486`).

### Estilos Inline Gerados por JavaScript
- `canvas#tela`: `canvas.style.cursor = "grabbing" | "grab" | "default" | "crosshair"` [confirmado: `entrada.js:39-48`].
- `#progresso-pv .recurso-preenchimento`: `style.width = Math.round(frac * 100) + "%"` [confirmado: `interface.js:334`].
- `#progresso-san .recurso-preenchimento`: `style.width = Math.round(frac * 100) + "%"` [confirmado: `interface.js:334`].
- `#progresso-pe .recurso-preenchimento`: `style.width = Math.round(frac * 100) + "%"` [confirmado: `interface.js:334`].
- `div#bolha-rolagem`: `style.left = ... + "px"`, `style.top = ... + "px"`, `style.transform = ...` [confirmado: `interface.js:621-622, 650, 666-667`].
- `input#entrada-arquivo`: `style="display:none"` [confirmado: `index.html:307`].

### Mapa de `z-index`
| `z-index` | Elemento / Classe | O que empilha e comportamento | Referência |
|---|---|---|---|
| `5` | `.banner` (`#banner-escala`) | Flutua fixo no topo centro da área do canvas | `estilo.css:137` |
| `5` | `.dica` (`#dica`) | Flutua abaixo do banner no topo centro | `estilo.css:284` |
| `6` | `.faixa-erro` (`#faixa-erro`) | Faixa de notificação no topo da área do canvas | `estilo.css:149` |
| `10` | `#painel` | Painel lateral do mestre (à direita) | `estilo.css:165` |
| `60` | `.bolha-rolagem` (`#bolha-rolagem`) | Balão flutuante com resultado do d20 | `estilo.css:550` |
| `80` | `#escuro-fatality` | Fundo translúcido escuro cobrindo toda a janela | `estilo.css:571` |
| `90` | `#overlay-fatality` | Canvas da animação de fatality em tela cheia | `estilo.css:577` |

### Media Queries e Breakpoints
1. `@media (max-width: 900px)` [confirmado: `estilo.css:585-589`]:
   - Adiciona sombra lateral ao painel: `#painel { box-shadow: -4px 0 12px rgba(0, 0, 0, 0.5); }`.
2. `@media (prefers-reduced-motion: reduce)` [confirmado: `estilo.css:592-594`]:
   - Remove transições de botões: `button { transition: none; }`.
   - No JS, ativa bypass para pular animações de fatality (`fatality.js:51-54`) e remove o fade out de 400ms dos balões (`baloes.js:31-34, 188`).

### Duplicações e Conflitos
- **Conflito Grave de Layout (Barra vs Painel):** O `#painel` tem `position: absolute; top: 0; right: 0; bottom: 0; z-index: 10;`. O `header#barra` tem `height: 48px`, mas não define `z-index` (`auto`). Logo, os 320px direitos do `#barra` ficam escondidos sob o `#painel` [confirmado: `estilo.css:45-53, 155-166`].
- **Conflito de Largura em Botões:** A classe `.controle-tamanho button` define `width: 32px;` estrito para botões de zoom (`estilo.css:211-215`). O reaproveitamento dessa classe nos botões `#bt-vantagem` e `#bt-desvantagem` (`index.html:98`) amassa esses controles [confirmado: `estilo.css:212`].
- **Redundâncias de Especificidade:** Múltiplas declarações de `button, input, select, textarea { min-height: 32px; }` (`estilo.css:106-109`) misturadas com `.recurso button { min-width: 32px; min-height: 32px; }` (`348-351`) e declarações genéricas para `button` espalhadas nas linhas 70, 73, 84, 87, 94 e 103.

---

## 3.4 HTML e DOM (O Contrato JS ↔ DOM)

### Estrutura Geral das Seções
- `<header id="barra">`: Barra fixa superior de 48px contendo o `#titulo` ("Mesa Virtual"), grupo de ferramentas de alternância e grupo de ações (`index.html:17-38`).
- `<main id="area">`: Contêiner principal relativo que abriga o banner provisório, a faixa de erro e o `<canvas id="tela">` (`index.html:41-51`).
- `<aside id="painel">`: Painel lateral de 320px com 5 seções verticais:
  1. `section.secao` (Cena): controle de escala e metros por quadrado (`index.html:55-68`).
  2. `section#secao-nevoa`: liga/desliga névoa, forma (pincel/retângulo), modo (revelar/esconder), raio e limpeza (`index.html:71-90`).
  3. `section#secao-d20`: modificador, vantagem, desvantagem, botão de rolar e histórico de 8 jogadas (`index.html:93-104`).
  4. `section#secao-token`: estado vazio, nome, tamanho, bloco de arma, falas prontas, ficha com PV/SAN/PE/atributos e botão Fatality (`index.html:107-263`).
  5. `section#secao-chat`: seletor de voz ativa, input de chat com envio e histórico com até 20 mensagens (`index.html:266-277`).
- Elementos Flutuantes fora do fluxo:
  - `<dialog id="dialog-calibrar">`: Diálogo nativo modal de calibração (`index.html:282-292`).
  - `<div id="dica">`: Balão de dica contextual da ferramenta ativa (`index.html:295`).
  - `<div id="bolha-rolagem">`: Balão de resultado do d20 flutuante no mapa (`index.html:298`).
  - `<div id="escuro-fatality">` e `<div id="overlay-fatality">`: Máscara e canvas exclusivo de fatality (`index.html:301-304`).
  - `<input id="entrada-arquivo">`: Input do tipo file invisível para importação (`index.html:307`).

### Tabela Completa de IDs Manipulados pelo JavaScript
*Se qualquer um destes IDs for renomeado ou excluído no redesign, o comportamento correspondente quebra imediatamente.*

| ID do Elemento | Arquivo de Origem (`arquivo:linha`) | Papel no JavaScript |
|---|---|---|
| `tela` | `entrada.js:327`, `render.js:466` | Canvas principal da aplicação |
| `barra` | `index.html:17` | Cabeçalho superior da mesa |
| `titulo` | `index.html:18` | Título da barra de ferramentas |
| `bt-selecionar` | `ferramentas.js:19`, `index.html:22` | Ferramenta Selecionar (V) |
| `bt-mover` | `ferramentas.js:20`, `index.html:23` | Ferramenta Mover mapa (H) |
| `bt-regua` | `ferramentas.js:21`, `index.html:24` | Ferramenta Régua (R) |
| `bt-calibrar` | `ferramentas.js:22`, `index.html:25` | Ferramenta Calibrar escala (C) |
| `bt-nevoa` | `ferramentas.js:23`, `interface.js:832` | Ferramenta Névoa de guerra (F) |
| `bt-grade` | `interface.js:826`, `index.html:31` | Ação de alternar grade (G) |
| `bt-painel` | `interface.js:771`, `index.html:32` | Ação de alternar visibilidade do painel (Tab) |
| `bt-apresentar` | `interface.js:571, 857` | Ação de alternar modo Apresentação (P) |
| `bt-exportar` | `interface.js:768`, `index.html:34` | Ação de exportar JSON da cena |
| `bt-importar` | `interface.js:769`, `index.html:35` | Ação de abrir seletor de arquivo JSON |
| `bt-redefinir` | `interface.js:770`, `index.html:36` | Ação de redefinir cena para o estado padrão |
| `banner-escala` | `interface.js:741` | Banner com aviso de escala provisória |
| `faixa-erro` | `interface.js:740` | Faixa vermelha de alertas e erros de arquivo |
| `painel` | `interface.js:752` | Painel lateral do mestre |
| `campo-metros` | `interface.js:754` | Input de metros por quadrado da cena |
| `info-escala` | `interface.js:742` | Span com o texto da proporção de px por metro |
| `estado-escala` | `interface.js:743` | Span indicando se a escala é provisória ou calibrada |
| `secao-nevoa` | `index.html:71` | Seção de controles da névoa no painel |
| `bt-nevoa-ligar` | `interface.js:836, 969` | Botão que liga/desliga a névoa de guerra |
| `nevoa-controles` | `interface.js:970` | Div contendo os controles avançados da névoa |
| `bt-nevoa-pincel` | `interface.js:839, 971` | Botão para selecionar pincel de névoa |
| `bt-nevoa-retangulo`| `interface.js:842, 973` | Botão para selecionar retângulo de névoa |
| `bt-nevoa-revelar` | `interface.js:845, 975` | Botão para alternar modo Revelar névoa |
| `bt-nevoa-esconder` | `interface.js:848, 977` | Botão para alternar modo Esconder névoa |
| `campo-nevoa-pincel`| `ferramentas.js:255` | Input numérico do raio em células do pincel |
| `bt-nevoa-limpar` | `interface.js:851` | Botão "Tudo revelado" |
| `bt-nevoa-elevar` | `interface.js:854` | Botão "Tudo escondido" |
| `secao-d20` | `index.html:93` | Seção do rolador de d20 no painel |
| `campo-modificador` | `interface.js:861` | Input numérico de modificador da rolagem |
| `bt-vantagem` | `interface.js:862, 869` | Botão de vantagem (2d20, maior) |
| `bt-desvantagem` | `interface.js:863, 870` | Botão de desvantagem (2d20, menor) |
| `bt-rolar` | `interface.js:868` | Botão de executar rolagem de d20 |
| `historico-rolagens`| `interface.js:864` | Contêiner das últimas 8 rolagens de d20 |
| `secao-token` | `index.html:107` | Seção do token selecionado |
| `token-vazio` | `interface.js:745` | Mensagem "Clique em um token para editar." |
| `token-controles` | `interface.js:746` | Contêiner dos controles de token selecionado |
| `campo-nome` | `interface.js:747` | Input de texto com o nome do token |
| `campo-tamanho` | `interface.js:748` | Slider (range) de tamanho do token em quadrados |
| `info-tamanho` | `interface.js:749` | Span exibindo o valor numérico do tamanho |
| `bt-menos` | `interface.js:750` | Botão "−" para diminuir tamanho |
| `bt-mais` | `interface.js:751` | Botão "+" para aumentar tamanho |
| `bt-tamanho-padrao` | `interface.js:762` | Botão para restaurar tamanho para 1 quadrado |
| `arma-bloco` | `index.html:131` | Bloco de seleção de arma |
| `arma-controle` | `index.html:133` | Radiogroup dos botões de modo de arma |
| `bt-arma-sem` | `interface.js:874, 878` | Botão "Sem arma" do modo de arma |
| `bt-arma-com` | `interface.js:875, 882` | Botão "Com arma" do modo de arma |
| `arma-ficha` | `interface.js:876` | Texto com a arma transcrita da ficha |
| `arma-sem-imagem` | `interface.js:877` | Aviso "Este token não tem imagem com arma." |
| `falas-bloco` | `index.html:143` | Bloco de falas prontas do token |
| `falas-vazio` | `interface.js:888` | Aviso "Este token não tem falas prontas." |
| `falas-controles` | `interface.js:889` | Contêiner com os 3 inputs e botões de falas |
| `campo-fala-1` | `interface.js:892` | Input de texto da Fala 1 (máx 80 caracteres) |
| `campo-fala-2` | `interface.js:893` | Input de texto da Fala 2 (máx 80 caracteres) |
| `campo-fala-3` | `interface.js:894` | Input de texto da Fala 3 (máx 80 caracteres) |
| `bt-falar-1` | `interface.js:897` | Botão para disparar fala pronta 1 em balão |
| `bt-falar-2` | `interface.js:898` | Botão para disparar fala pronta 2 em balão |
| `bt-falar-3` | `interface.js:899` | Botão para disparar fala pronta 3 em balão |
| `bt-restaurar-falas`| `interface.js:890, 926` | Botão para restaurar falas padrão do token |
| `token-sem-ficha` | `interface.js:779` | Aviso "Este token não tem ficha." |
| `ficha-blocos` | `interface.js:780` | Contêiner geral da ficha do token selecionado |
| `ficha-nome` | `interface.js:781` | Nome do personagem na ficha |
| `ficha-linha-classe`| `interface.js:782` | Linha indicando classe, patente e NEX |
| `campo-quantidade` | `interface.js:790` | Quantidade de dano/cura aplicada por clique |
| `progresso-pv` | `interface.js:794` | Barra progressbar de PV do personagem |
| `valor-pv` | `interface.js:792` | Input do valor atual de PV |
| `max-pv` | `interface.js:793` | Input do valor máximo de PV |
| `bt-pv-menos` | `interface.js:802` | Botão de dano em PV |
| `bt-pv-mais` | `interface.js:802` | Botão de cura em PV |
| `progresso-san` | `interface.js:797` | Barra progressbar de Sanidade do personagem |
| `valor-san` | `interface.js:795` | Input do valor atual de Sanidade |
| `max-san` | `interface.js:796` | Input do valor máximo de Sanidade |
| `bt-san-menos` | `interface.js:803` | Botão de perda de Sanidade |
| `bt-san-mais` | `interface.js:803` | Botão de recuperação de Sanidade |
| `progresso-pe` | `interface.js:800` | Barra progressbar de PE do personagem |
| `valor-pe` | `interface.js:798` | Input do valor atual de PE |
| `max-pe` | `interface.js:799` | Input do valor máximo de PE |
| `bt-pe-menos` | `interface.js:804` | Botão de gasto de PE |
| `bt-pe-mais` | `interface.js:804` | Botão de recuperação de PE |
| `faixa-morrendo` | `interface.js:806` | Faixa vermelha "Morrendo" quando PV <= 0 |
| `rodadas-morrendo` | `interface.js:807` | Contêiner das caixas de rodadas de morrendo |
| `aviso-morrendo` | `interface.js:808` | Aviso "Três rodadas marcadas." para morrendo |
| `faixa-enlouquecendo`| `interface.js:809` | Faixa vermelha "Enlouquecendo" quando SAN <= 0 |
| `rodadas-enlouquecendo`| `interface.js:810` | Contêiner das caixas de rodadas de enlouquecendo |
| `aviso-enlouquecendo`| `interface.js:811` | Aviso "Três rodadas marcadas." para enlouquecendo |
| `ficha-atributos` | `interface.js:783` | Parágrafo com os atributos (AGI, FOR, INT, PRE, VIG) |
| `ficha-defesa` | `interface.js:784` | Parágrafo com defesa, esquiva e bloqueio |
| `ficha-protecao` | `interface.js:785` | Parágrafo com o tipo de proteção |
| `ficha-resistencias`| `interface.js:786` | Parágrafo com as resistências a dano |
| `ficha-ataque` | `interface.js:787` | Parágrafo com ataque, dano e alcance da arma |
| `ficha-ataque-especial`| `interface.js:788` | Parágrafo com propriedades especiais de ataque |
| `ficha-pericias` | `interface.js:789` | Parágrafo com as perícias treinadas |
| `bt-fatality` | `interface.js:866, 871` | Botão para abrir menu de fatalities |
| `menu-fatality` | `interface.js:867, 680` | Menu dinâmico suspenso com as fatalities |
| `secao-chat` | `index.html:266` | Seção de chat no rodapé do painel |
| `chat-rotulo` | `interface.js:929` | Rótulo "Falar como: [Nome]" |
| `campo-chat` | `interface.js:930` | Input de texto da mensagem livre (máx 140 chars) |
| `bt-enviar-chat` | `interface.js:931` | Botão de envio da mensagem no chat |
| `historico-chat` | `interface.js:932` | Contêiner de histórico das mensagens de chat |
| `bt-limpar-chat` | `interface.js:943` | Botão para esvaziar o histórico do chat |
| `dialog-calibrar` | `interface.js:819` | Elemento `<dialog>` nativo de calibração |
| `erro-calibrar` | `interface.js:820` | Mensagem de erro "Digite um número maior que zero." |
| `campo-metros-calibrar`| `interface.js:821` | Input de metros reais medidos na calibração |
| `bt-salvar-escala` | `interface.js:824` | Botão de confirmar escala calibrada |
| `bt-cancelar-escala`| `interface.js:825` | Botão de cancelar calibração |
| `dica` | `interface.js:822` | Balão flutuante de dica de ferramenta |
| `bolha-rolagem` | `interface.js:865` | Bolha flutuante no mapa com resultado do d20 |
| `escuro-fatality` | `fatality.js:63, 130` | Div de fundo escurecido da animação de fatality |
| `overlay-fatality` | `fatality.js:61, 132` | Div de sobreposição com o canvas da fatality |
| `tela-fatality` | `fatality.js:62` | Canvas onde os quadros da fatality são desenhados |
| `entrada-arquivo` | `interface.js:704, 776` | Input type file oculto para upload de JSON |

### Tabela de Classes CSS Manipuladas por JavaScript
| Classe CSS | Como o JS a manipula | Efeito funcional no app |
|---|---|---|
| `.oculta` | `classList.add / remove / toggle / contains` | Aplica `display: none;`, ocultando seções inteiras, mensagens ou botões |
| `.ativa` | `classList.add / remove / toggle` | Define visual ativo (fundo vermelho `--accent`) para ferramentas e botões |
| `.oculta-nesta-tela` | `classList.toggle` | Oculta banner e dicas exclusivamente durante o modo Apresentação (P) via `!important` |
| `.rotulo-auxiliar` | Inserida em `vazio.className` (`interface.js:202`) | Estiliza mensagem de chat vazio criada em tempo de execução |
| `.linha-chat` | Inserida em `linha.className` (`interface.js:209`) | Formata cada linha de fala no histórico do chat |
| `.linha-historico` | Inserida em `p.className` (`interface.js:633`) | Formata cada linha no histórico do rolador de d20 |
| `.critico` | Concatenada em `linha-historico critico` (`interface.js:612, 633`) | Destaca rolagem de 20 natural em amarelo ouro dourado (`#FFD75E`) |
| `.falha` | Concatenada em `linha-historico falha` (`interface.js:612, 633`) | Destaca rolagem de 1 natural em vermelho claro (`#FF7A6E`) |
| `.w100` | Inserida em `bt.className` (`interface.js:690`) | Força largura de 100% nos botões do menu de fatality criados por código |

### Tabela de Atributos (`data-*` e ARIA)
| Atributo | Elementos Afetados | Uso pelo JavaScript |
|---|---|---|
| `data-ferramenta` | Botões da barra (`#bt-selecionar`, etc.) | Gravado em `ferramentas.js:139` e lido no clique (`ferramentas.js:137`) para ativar a ferramenta correspondente |
| `aria-checked` | `#bt-arma-sem`, `#bt-arma-com` | Atualizado para `"true"` ou `"false"` (`interface.js:129-130`) no radiogroup de modo de arma |
| `aria-valuenow` | `#progresso-pv`, `#progresso-san`, `#progresso-pe` | Atualizado com o valor numérico atual do recurso (`interface.js:337`) |
| `aria-valuemax` | `#progresso-pv`, `#progresso-san`, `#progresso-pe` | Atualizado com o valor numérico máximo do recurso (`interface.js:338`) |
| `aria-label` | Inputs de falas, botões de incremento e chat | Usado para acessibilidade leitora de tela |
| `aria-live` | `#historico-chat` | Definido como `"polite"` para anunciar novas falas de chat |

### Textos Literais Gerados, Comparados ou Validados no JavaScript
- **Alterações de Rótulos em Botões:**
  - `#bt-apresentar`: `"Apresentar (P)"` ↔ `"Sair da apresentação (P)"` [confirmado: `interface.js:572`].
  - `#bt-nevoa-ligar`: `"Névoa desligada"` ↔ `"Névoa ligada"` [confirmado: `interface.js:969`].
  - `#estado-escala`: `"Escala provisória"` ↔ `"Escala calibrada"` [confirmado: `interface.js:69`].
- **Diálogos Nativos do Navegador (`window.confirm`):**
  - Reset da mesa: `"Redefinir a cena para o estado inicial? Posições e tamanhos serão perdidos."` [confirmado: `interface.js:727-729`].
  - Reset de falas: `"Restaurar as 3 falas deste token para o padrão?"` [confirmado: `interface.js:172`].
- **Mensagens de Notificação e Erro:**
  - `"Arquivo não encontrado: " + caminho` [confirmado: `render.js:104, 155`].
  - `"Arquivo inválido. Use um JSON exportado por esta mesa."` [confirmado: `estado.js:300, 304`].
  - `"Falha ao salvar o estado (armazenamento cheio?)."` [confirmado: `estado.js:218`].
  - `"Selecione um token."` [confirmado: `arma.js:55`].
  - `"Selecione um token para falar."` [confirmado: `baloes.js:70`].
- **Textos de Dica da Ferramenta (`#dica`):**
  - Régua: `"Arraste de um ponto a outro. Esc cancela."` [confirmado: `ferramentas.js:46`].
  - Calibrar: `"Arraste sobre uma distância que você conhece (por exemplo, o comprimento de um cômodo)."` [confirmado: `ferramentas.js:48`].
  - Névoa: `"Arraste para pintar a névoa. Shift troca o modo (revelar/esconder). Esc volta para Selecionar."` [confirmado: `ferramentas.js:51-52`].

### Elementos Criados Dinamicamente pelo JavaScript
1. `document.createElement("p")` com `.rotulo-auxiliar` ("Nenhuma mensagem ainda.") em `#historico-chat` (`interface.js:201`).
2. `document.createElement("p")` com `.linha-chat` ("{nome}: {texto}") em `#historico-chat` (`interface.js:208`).
3. `document.createElement("p")` com `.linha-historico [.critico|.falha]` em `#historico-rolagens` (`interface.js:632`).
4. `document.createElement("button")` com `.w100` em `#menu-fatality` para cada animação listada (`interface.js:689`).
5. `document.createElement("canvas")` para a rasterização offscreen da máscara de névoa (`nevoa.js:223`).
6. `document.createElement("a")` injetado e clicado programaticamente para download do JSON (`estado.js:282`).
7. Instâncias `new Image()` para cacheamento de tokens e mapas (`render.js:96, 141`, `fatality.js:26`).
8. Instâncias `new Audio()` para execução de trilhas de áudio de fatality (`fatality.js:64`).

---

## 3.5 Estado e Persistência

### Formato e Esquema do Objeto de Estado
O estado central em memória é um objeto JavaScript puro gerenciado por `js/estado.js`. Na exportação e no salvamento, possui a seguinte assinatura [confirmado: `cena-casa.js:7-52`, `tokens.js:10-70`, `estado.js:28-41`]:

```typescript
interface EstadoMesaV4 {
  versao: 4; // number inteiro (1, 2, 3 ou 4)
  cenaAtiva: string; // Ex: "casa"
  cenas: Array<{
    id: string; // Ex: "casa"
    nome: string; // Ex: "Casa"
    fundo: string; // Ex: "assets/maps/casa.jpg"
    largura: number; // Largura natural da imagem em pixels
    altura: number; // Altura natural da imagem em pixels
    recorte: null; // Reservado para versão futura
    escala: {
      pxPorMetro: number; // Float (ex: 33.3)
      metrosPorQuadrado: number; // Float (ex: 1.5)
      calibrada: boolean; // True após calibração bem-sucedida
    };
    grade: {
      visivel: boolean; // True se grade estiver ligada (G)
    };
    nevoa: {
      visivel: boolean; // True se névoa estiver ligada (F)
      larguraCel: number; // Largura da grade em células (1/4 quadrado)
      alturaCel: number; // Altura da grade em células
      dados: string; // String Base64 contendo Uint8Array compactado (1 bit/célula)
    };
    camera: {
      x: number; // Canto superior esquerdo no mundo (px)
      y: number; // Canto superior esquerdo no mundo (px)
      zoom: number; // Fator de escala (0.2 a 4.0)
    };
    tokens: Array<{
      id: string; // Ex: "tok_personagem_01", "tok_monstro_01"
      nome: string; // Ex: "Pierre", "Monstro de teste"
      tipo: "personagem" | "monstro";
      imagem: string | null; // Caminho legado para compatibilidade
      imagens: {
        semArma: string | null; // "assets/tokens/personagem-01.png"
        comArma: string | null; // "assets/tokens/personagem-01-machado.png"
      };
      modoArma: "sem" | "com";
      x: number; // Centro do token em px do mundo
      y: number; // Centro do token em px do mundo
      tamanho: number; // Tamanho em quadrados (0.25 a 4.0)
      fichaId?: string; // Ex: "pierre" (aponta para fichas em window.MESA_DADOS)
      recursos?: {
        pv: { atual: number; max: number };
        san: { atual: number; max: number };
        pe: { atual: number; max: number };
        rodadasMorrendo: number; // Inteiro 0 a 3
        rodadasEnlouquecendo: number; // Inteiro 0 a 3
      } | null;
      falas?: string[]; // Array com até 3 falas de até 80 caracteres
      estado?: "morto"; // Opcional, aplicado após Fatality
    }>;
  }>;
}
```

### Mecanismo de Persistência
- **Storage:** Persiste no `window.localStorage` sob a chave `"mesaRPG.v1"` [confirmado: `estado.js:12, 215`].
- **Compactação de Células:** Antes de serializar para JSON, `MESA.nevoa.compactarParaSalvar()` converte o array `Uint8Array` da máscara em base64 (empacotando 8 células por byte) e deleta a propriedade `cena.nevoa._arr` para evitar sobrecarga de memória no storage [confirmado: `nevoa.js:86-104`, `estado.js:214`].
- **Tolerância a Falhas:** Todas as chamadas `localStorage.setItem` são protegidas por `try/catch` para não interromper a sessão caso a quota seja excedida ou o navegador bloqueie storage em `file://` [confirmado: `estado.js:212-220`].

### Versionamento e Migrações de Esquema
O JSON possui versionamento explícito no campo `versao`. O motor de carregamento suporta leitura retrocompatível a partir da v1:
- **v1 → v2:** Adiciona `fichaId` e recursos ao Pierre; renomeia "Personagem 1" para "Pierre" se o mestre nunca tiver editado o nome [confirmado: `estado.js:51-83`].
- **v2 → v3:** Adiciona o suporte e o objeto `nevoa` a cada cena [confirmado: `estado.js:89-101`].
- **v3 → v4:** Adiciona controle de `modoArma`, migra `imagem` para `imagens.semArma`/`comArma` e inicializa as `falas` prontas [confirmado: `estado.js:120-176`].
- **Salvaguarda de Tokens:** O método `reporTokensFaltantes` garante que nenhum token original da campanha seja deletado ao importar arquivos JSON legados ou parciais [confirmado: `estado.js:187-208`].
- **Download de Exportação:** Nome fixo sugerido: `"mesa-ordem-paranormal.json"` com MIME `application/json` [confirmado: `estado.js:284`].

### Título da Aba e Favicon
- **Título:** Definido estaticamente no HTML como `<title>Mesa Virtual</title>` (`index.html:11`). Não sofre alteração dinâmica por nenhum script JS [confirmado].
- **Favicon:** **Inexistente**. Não há tag `<link rel="icon">` no documento `index.html` [confirmado: `index.html:1-13`].

---

## 3.6 Interações

### Tabela de Mapeamento: Gatilho → Função → Efeito Visível

| Gatilho | Função Invocada (`arquivo:linha`) | Efeito Visível na Interface |
|---|---|---|
| Tecla `V` | `ferramentas.js:30` | Ativa ferramenta Selecionar; botão ganha `.ativa`; cursor vira `default` ou `grab`; limpa régua e esconde dica |
| Tecla `H` | `ferramentas.js:30` | Ativa ferramenta Mover Mapa; botão ganha `.ativa`; cursor vira `grab`; limpa régua e esconde dica |
| Tecla `R` | `ferramentas.js:30` | Ativa ferramenta Régua; cursor vira `crosshair`; exibe dica `"Arraste de um ponto a outro. Esc cancela."` |
| Tecla `C` | `ferramentas.js:30` | Ativa ferramenta Calibrar; cursor vira `crosshair`; exibe dica `"Arraste sobre uma distância que você conhece..."` |
| Tecla `G` | `ferramentas.js:192` | Alterna visibilidade da grade (`cena.grade.visivel`); repinta o canvas instantaneamente |
| Tecla `F` | `ferramentas.js:30` | Ativa ferramenta Névoa; cursor vira `crosshair`; exibe dica de pintura com Shift |
| Tecla `P` | `interface.js:558` | Alterna modo Apresentação: esconde painel lateral, esconde banner e dica, névoa sobe para 85% de opacidade |
| Tecla `A` | `arma.js:52` | Alterna Pierre entre com/sem arma; troca sprite no canvas; atualiza botões no painel. Sem seleção: alerta 2s |
| Teclas `1`, `2`, `3` | `baloes.js:67` | Dispara balão de fala 1, 2 ou 3 sobre o token selecionado no canvas. Sem seleção: alerta 2s |
| Tecla `Enter` | `interface.js:231` | Foca o campo `#campo-chat` se o painel estiver aberto. Dentro do chat: envia mensagem |
| Tecla `Esc` | `entrada.js:321` | Se em input, faz blur devolvendo atalhos; se na névoa, volta para Selecionar; fecha modal de calibração; limpa medição |
| Teclas `+` ou `=` | `ferramentas.js:101` | Incrementa tamanho do token selecionado em 0.25 quadrados (máx 4.0); atualiza slider e canvas |
| Teclas `-` ou `_` | `ferramentas.js:101` | Decrementa tamanho do token selecionado em 0.25 quadrados (mín 0.25); atualiza slider e canvas |
| Tecla `0` | `ferramentas.js:112` | Restaura tamanho do token selecionado para exatamente 1 quadrado |
| Tecla `Tab` | `interface.js:546` | Mostra ou oculta o painel lateral do mestre (`#painel`). Inerte se o foco estiver dentro de formulário |
| Tecla `Espaço` (down) | `entrada.js:260` | Ativa pan temporário; cursor do canvas muda para `grab` |
| Tecla `Espaço` (up) | `entrada.js:312` | Desativa pan temporário; cursor retorna ao modo da ferramenta ativa |
| Roda do Mouse | `entrada.js:211` | Executa zoom centrado na coordenada do cursor (fator 1.1x por passo, limites 0.2x a 4.0x) |
| Clique Botão Esquerdo | `entrada.js:78` | Seleciona token sob cursor; ou inicia arrasto se mover > 3px; ou inicia medição/calibração/névoa; ou faz pan no vazio |
| Arraste de Token | `entrada.js:149` | Move centro do token acompanhando o cursor do mouse; reposiciona anel dourado e barras de vida |
| Botão do Meio (MMap) | `entrada.js:88` | Executa pan contínuo do mapa enquanto arrastado |
| Clique "Rolar d20" | `interface.js:602` | Rola d20 com modificador/vantagem; exibe bolha flutuante sobre o token (some em 5s) e adiciona ao histórico |
| Clique "Vantagem" | `interface.js:639` | Alterna estado ativo do botão; faz o d20 rolar 2 dados e escolher o maior |
| Clique "Desvantagem"| `interface.js:639` | Alterna estado ativo do botão; faz o d20 rolar 2 dados e escolher o menor |
| Clique "Fatality" | `interface.js:680` | Abre lista suspensa de fatalities cadastradas; selecionar inicia animação fullscreen escurecida |
| Clique no Escuro | `fatality.js:119` | Durante uma fatality, clicar na tela escura interrompe imediatamente a animação e finaliza o estado |
| Clique "Enviar" Chat | `interface.js:215` | Exibe fala digitada em balão sobre o token, grava no histórico do chat e devolve foco ao mapa |
| Clique "Limpar chat" | `interface.js:943` | Esvazia o histórico de chat da sessão e repinta a mensagem "Nenhuma mensagem ainda." |
| Clique "Salvar escala"| `interface.js:502`| Calcula novos `pxPorMetro`, marca escala como calibrada, fecha modal e remove banner provisório |
| Clique "Exportar" | `interface.js:701` | Dispara download do arquivo JSON completo com o estado da mesa |
| Clique "Importar" | `interface.js:703` | Abre diálogo nativo do sistema operacional para selecionar arquivo JSON de cena |
| Clique "Redefinir" | `interface.js:725` | Abre `confirm()` nativo; se confirmado, zera o `localStorage` e restaura dados padrão da campanha |

### Inventário de Teclas de Atalho Livres
As seguintes teclas do teclado alfanumérico **não estão mapeadas** no arquivo `entrada.js:267-309` e estão disponíveis para novas funcionalidades:
`B`, `D`, `E`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `Q`, `S`, `T`, `U`, `W`, `X`, `Y`, `Z`, números `4` a `9`, teclas de função `F1` a `F12`.

---

## 3.7 Estados Visuais Existentes

- **Hover:**
  - Botões gerais: `button:hover:not(:disabled)` muda fundo para `var(--hover)` (`#22262A`) [confirmado: `estilo.css:84`].
  - Sumários de detalhes da ficha: `#ficha-blocos summary:hover` muda cor do texto para `var(--gold)` (`#D4A72C`) [confirmado: `estilo.css:397`].
- **Focus:**
  - Foco via teclado: `button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible` ganham contorno `outline: 2px solid var(--gold); outline-offset: 2px;` [confirmado: `estilo.css:94-101`].
- **Disabled:**
  - `button:disabled, #campo-chat:disabled` reduzem opacidade para `0.45` e recebem `cursor: default` [confirmado: `estilo.css:103, 482`].
- **Selecionado:**
  - Token no mapa: desenha anel circular dourado `#D4A72C` de 2px de espessura [confirmado: `render.js:216-222`].
  - Painel lateral: esconde `#token-vazio` e exibe `#token-controles` [confirmado: `interface.js:91-92`].
- **Ferramenta Ativa:**
  - Botões da barra, botões de modo de névoa, botões de arma e vantagem ganham classe `.ativa`: fundo `var(--accent)` (`#9B1B30`), borda `#9B1B30` e texto `#FFFFFF` [confirmado: `estilo.css:87-91, 431-435, 516-520`].
- **Estados Vazios:**
  - Sem token selecionado: exibe `<p id="token-vazio">Clique em um token para editar.</p>` (`index.html:111`).
  - Token sem ficha (monstro): exibe `<p id="token-sem-ficha">Este token não tem ficha.</p>` (`index.html:168`).
  - Token sem falas cadastradas: exibe `<p id="falas-vazio">Este token não tem falas prontas.</p>` (`index.html:145`).
  - Chat sem mensagens: exibe `<p class="rotulo-auxiliar">Nenhuma mensagem ainda.</p>` (`index.html:274`).
- **Névoa Ligada / Desligada:**
  - Botão `#bt-nevoa-ligar` alterna texto literal entre "Névoa ligada" e "Névoa desligada"; o contêiner `#nevoa-controles` adiciona ou remove `.oculta` (`interface.js:969-970`).
- **Avisos e Notificações:**
  - Permanente Provisório: `#banner-escala` no topo do canvas, some apenas quando `cena.escala.calibrada === true` ou em apresentação (`interface.js:70, 568`).
  - Temporário de Ação: `#faixa-erro` exibe texto em fundo vermelho por 2000 ms ao tentar usar arma/fala sem token (`interface.js:243-247`).
  - Crítico na Ficha: `#faixa-morrendo` e `#faixa-enlouquecendo` surgem em vermelho quando PV ou SAN chegam a zero (`interface.js:317-320`).
- **Estados que NÃO Existem Hoje:**
  - Não há efeito `:active` de compressão ou clique visual nos botões (apenas transição suave de cor).
  - Não há hover nos tokens dentro do canvas (nenhum realce ou tooltip ao passar o mouse sobre um token sem clicar).
  - Não há indicador de carregamento (spinner/skeleton) para leitura de imagens locais.
  - Não há animação de abertura/fechamento do painel lateral (transição de largura); ele surge/some via `display: none`.
  - Não há animação de rolagem de dados no d20 (o número surge instantaneamente).

---

## 3.8 Assets

### Inventário de Arquivos de Mídia
| Caminho do Arquivo | Tipo / Formato | Dimensões (L × A) | Peso no Disco | Descrição / Uso |
|---|---|---|---|---|
| `assets/maps/casa.jpg` | Imagem JPEG | 735 × 1053 px | 154,4 KB (158.156 bytes) | Mapa principal da campanha com 3 pavimentos integrados |
| `assets/tokens/personagem-01.png` | Imagem PNG (Transparente) | 1024 × 1024 px | 1.321,0 KB (1.352.747 bytes) | Sprite do agente Pierre no modo desarmado |
| `assets/tokens/personagem-01-machado.png` | Imagem PNG (Transparente) | 1024 × 1024 px | 559,5 KB (572.879 bytes) | Sprite do agente Pierre empunhando machado |
| `assets/tokens/dante.png` | Imagem PNG (Transparente) | 380 × 512 px | 229,6 KB (235.113 bytes) | Sprite do personagem Dante |
| `assets/tokens/duck.png` | Imagem PNG (Transparente) | 343 × 512 px | 95,4 KB (97.674 bytes) | Sprite do personagem Duck |

- **Pixel Art e Renderização:** O código desativa explicitamente a interpolação bicúbica ao renderizar sprites de tokens com `ctx.imageSmoothingEnabled = false;` [confirmado: `render.js:177`]. No entanto, **não há propriedade `image-rendering: pixelated` ou `crisp-edges` declarada no CSS** [confirmado: `estilo.css:1-594`].
- **Assets Externos:** **Nenhum**. O projeto é estritamente autônomo e não referencia nenhuma URL `http://` ou `https://` [confirmado: busca global em `index.html`, `estilo.css` e `js/`].

---

## 3.9 Problemas Visuais Observados pelo Usuário

### (a) Rótulos "Vantagem" e "Desvantagem" sobrepostos e botões minúsculos
- **Status:** **[confirmado]**.
- **Causa-raiz:** No arquivo `index.html:98`, o grupo de botões foi envolvido por `<div class="controle-tamanho">`. A folha de estilo `estilo.css:211-215` impõe `width: 32px;` para todos os botões filhos de `.controle-tamanho`, pois ela foi concebida originalmente apenas para os botões quadrados `−` e `+` de redimensionamento do token. Combinado com `button { white-space: nowrap; }` (`estilo.css:70`), as palavras "Vantagem" e "Desvantagem" vazam da caixa de 32px e colidem no centro com um espaço de apenas `gap: 8px`.
- **Onde corrigir:** Criar uma classe flexível (ex: `.controle-duplo`) para o grupo ou sobrescrever `#secao-d20 .controle-tamanho button { width: auto; flex: 1; }` no CSS, sem alterar regras em JavaScript.

### (b) Barra superior cortada pelo painel lateral em janelas estreitas
- **Status:** **[confirmado]**.
- **Causa-raiz:** O `#painel` lateral está posicionado com `position: absolute; top: 0; right: 0; bottom: 0; width: 320px; z-index: 10;` (`estilo.css:155-166`). Ele se ancora diretamente no topo do `body`. A barra `#barra` possui altura de 48px e não define `z-index` (ficando com o valor padrão `auto`). Como consequência, o topo do painel sobrepõe fisicamente a barra em 320px. Em telas com largura inferior a ~1180px, os botões "Exportar", "Importar" e "Redefinir cena" ficam ocultos atrás do painel.
- **Onde corrigir:** Alterar o layout no CSS para que `#painel` inicie abaixo da barra (`top: 48px; height: calc(100% - 48px);`) ou estruturar o grid do `body` para alocar uma coluna lateral reservada ao painel, garantindo que a barra tenha largura total desobstruída.

### (c) Aviso "Escala provisória…" fixo por cima do mapa
- **Status:** **[confirmado]**.
- **Causa-raiz:** O aviso reside em `<div id="banner-escala" class="banner">` (`index.html:44`). Ele está programado para ser permanente enquanto a campanha não tiver calibração salva: o script `interface.js:70` executa `bannerEscala.classList.toggle("oculta", cena.escala.calibrada);`. Ele só desaparece quando o usuário usa a ferramenta "Calibrar escala (C)" e clica em "Salvar escala", ou quando entra em modo Apresentação (P) via classe `.oculta-nesta-tela` (`interface.js:568`).
- **Onde corrigir:** Se desejado, adicionar um botão de dispensa manual ("fechar") ou integrá-lo discretamente como badge no painel lateral de Cena sem bloquear a visão do mapa.

### (d) Círculo vermelho com a letra "M" no canto direito do mapa
- **Status:** **[confirmado]**.
- **Causa-raiz:** Trata-se do token `tok_monstro_01` ("Monstro de teste"), inicializado nos dados em `data/tokens.js:34-45` na coordenada `x: 700, y: 400` sem imagem associada (`imagem: null`). No laço de desenho do canvas, o método `desenharToken` detecta ausência de imagem e chama `desenharCirculoMonstro` (`render.js:198-210, 258-270`), pintando um círculo sólido `#9B1B30` de diâmetro equivalente a 1 quadrado e escrevendo "M" em branco centralizado. Ele serve para o mestre posicionar ameaças sem precisar de arte prévia.

### (e) Painel lateral cortado embaixo (Chat e botão Enviar)
- **Status:** **[confirmado]**.
- **Causa-raiz:** O painel lateral possui `overflow-y: auto;` declarado em `estilo.css:164`, logo **ele tem rolagem própria funcional**. No entanto, a quantidade de seções acumuladas (Cena + Névoa + d20 + Token com recursos, barras, atributos, defesas e falas + Chat) ultrapassa 1500px de altura. Em resoluções verticais comuns (768px a 900px), a seção de chat fica inteiramente abaixo da dobra inicial, exigindo que o usuário role até o fim para vê-la. Além disso, o histórico de chat tem sua própria barra de rolagem interna (`max-height: 160px; overflow-y: auto;` em `estilo.css:485`), gerando confusão de rolagem dupla.
- **Onde corrigir:** Compactar visualmente as seções da ficha em abas ou manter os `<details>` fechados por padrão (`index.html:239-257`), ou transformar o chat em um painel sanfonado ou ancorado na base.

### (f) Outros Problemas Visuais e de Usabilidade Encontrados
- **Botão destrutivo sem destaque:** O botão "Redefinir cena" (`index.html:36`) utiliza a mesma aparência dos botões normais de navegação, embora apague irreversivelmente todo o estado salvo do mestre [confirmado: `estilo.css:73-82`].
- **Falta de estilização no Backdrop do Modal:** O `<dialog id="dialog-calibrar">` não define regra CSS para `::backdrop`, deixando a tela de fundo sem escurecimento padronizado ou efeito de foco no modal nativo [confirmado: `estilo.css:228-270`].
- **Sobreposição de Dica e Banner:** A dica contextual `.dica` fica fixada em `top: 44px;` (`estilo.css:274`), enquanto o banner fica em `top: 8px;` (`estilo.css:127`). Em telas pequenas, a dica encosta e sobrepõe a extremidade inferior do banner de escala provisória.

---

## 3.10 Riscos para o Redesign

1. **Incompatibilidade Estrita de IDs e Classes:** O arquivo `interface.js` manipula centenas de referências diretas por ID (`document.getElementById`). Alterar, renomear ou remover IDs como `progresso-pv`, `campo-modificador`, `bt-apresentar` inutilizará os handlers de evento e congelará a aplicação.
2. **Cores Dessincronizadas no Canvas:** O redesign não pode estilizar o interior do `<canvas>` via CSS. Se o redesign adotar uma nova paleta visual (ex: dourado diferente ou novos tons de vermelho e roxo inspirados na arte paranormal de `reference.jpeg`), as barras de vida, anel de seleção, balões de fala e a letra "M" continuarão renderizados com os hexadecimais antigos a menos que os arquivos JS sejam ajustados pontualmente.
3. **Quebra de Serialização do Estado:** O objeto de persistência no `localStorage` e nos JSONs exportados possui contrato rigoroso (`versao: 4`). Qualquer alteração na estrutura que afete propriedades como `cena.escala.pxPorMetro` ou `cena.nevoa.dados` quebrará a importação de campanhas anteriores.
4. **Acoplamento de Textos Literais:** Scripts JS verificam e substituem textos exatos (ex: `"Apresentar (P)"` ↔ `"Sair da apresentação (P)"`, `"Névoa ligada"` ↔ `"Névoa desligada"`). Não utilize pseudo-elementos CSS (`::after`) para injetar textos duplicados que possam colidir com essas strings.
5. **Impacto de Performance na Taxa de Quadros:** O motor do canvas utiliza `requestAnimationFrame` condicionado à flag `needsRender`. A introdução de sombras pesadas (`box-shadow`), filtros CSS complexos (`backdrop-filter`) ou animações CSS contínuas sobre o contêiner `#area` pode causar perda de fluidez durante o pan e o arraste de tokens em telas de alta densidade de pixels (Retina / 4K).

---

## 3.11 Oportunidades de Baixo Risco

1. **Centralização Total em Tokens de Design (CSS Variables):** Como o arquivo `css/estilo.css` já define a paleta em `:root` (`--bg`, `--panel`, `--panel-border`, `--hover`, `--ink`, `--muted`, `--accent`, `--gold`, etc.), é possível transformar completamente a atmosfera visual do DOM (barra superior, painel lateral, modais, caixas de diálogo) apenas atualizando as variáveis CSS, com **risco zero** de quebra funcional.
2. **Criação de Gancho de Tema para o Canvas:** Criar um objeto de tema leve lido via `getComputedStyle(document.documentElement)` ou expor `window.MESA.tema` para alimentar `render.js` e `baloes.js`, sincronizando a estética gráfica do mapa com o novo design do DOM.
3. **Conserto Estrutural do Cabeçalho e Painel:** Ajustar o `#painel` para `top: 48px; height: calc(100% - 48px);` e adicionar `margin-right: 320px` ao `#area` resolve permanentemente o corte dos botões da barra superior sem demandar nenhuma linha de alteração em JS.
4. **Correção dos Botões de Vantagem / Desvantagem:** Adicionar a regra `#secao-d20 .controle-tamanho button { width: auto; flex: 1; }` no CSS elimina instantaneamente o bug de sobreposição de texto nos dados.
5. **Tipografia Paranormal Customizada:** Inserir fontes tipográficas temáticas locais via `@font-face` em `assets/fonts/` para títulos e cabeçalhos h1/h2, elevando o padrão estético sem depender de internet.
6. **Polimento do `<dialog>`:** Estilizar o `::backdrop` nativo do modal de calibração com `background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);` para focar a atenção do mestre durante medições críticas.

---

## 3.12 Dúvidas

1. **Valor canônico de metros por quadrado no sistema Ordem Paranormal:** O código utiliza provisoriamente 1,5 metros por quadrado (`cena.escala.metrosPorQuadrado = 1.5`, padrão D&D/Tormenta), mas os próprios comentários do desenvolvedor indicam necessidade de confirmação com o livro de regras da campanha [suposição de divergência baseada em `cena-casa.js:31-32` e `README.md:171`].
2. **Margem de Ameaça Variável do d20:** O sistema calcula crítico exclusivamente no 20 natural e falha no 1 natural (`dado.js:42-43`), mas fichas de Ordem Paranormal possuem armas com margem de ameaça 19 ou menor. Não foi possível confirmar se a mecânica do d20 deverá considerar a arma do personagem no futuro ou se permanecerá simplificada em 20 natural.
3. **Multi-cenas e Recorte de Pavimentos:** O mapa `casa.jpg` abriga três pavimentos desenhados na mesma imagem e o objeto de estado possui a propriedade `recorte: null`. Não é possível confirmar se pavimentos futuros serão divididos por recorte matricial ou por novos arquivos de mapa.
4. **Manifesto de Fatalities:** O arquivo `data/fatality-manifest.js` encontra-se com o array vazio `[]` por padrão e nenhuma pasta existe sob `assets/fatality/`. O comportamento foi verificado por inspeção estática do código, aguardando cadastro de mídias pelo usuário.

---

## Checklist de Regressão

*Execute manualmente estes 25 testes sequenciais após qualquer modificação visual para garantir que nenhuma funcionalidade essencial do mestre foi quebrada.*

1. **Abertura Offline:** Abra `index.html` via duplo clique direto (protocolo `file://`) no Chrome, Firefox ou Edge. A interface deve carregar instantaneamente sem erros de console.
2. **Seleção de Ferramenta na Barra:** Clique no botão "Mover mapa (H)" e depois em "Selecionar (V)". O botão ativo deve receber a cor de destaque e o cursor do canvas deve alternar entre `grab` e `default`.
3. **Pan com Botão do Meio e Espaço:** Segure a barra de espaço (ou o botão do meio do mouse) e arraste sobre o mapa. O mapa deve se deslocar livremente e voltar ao estado original ao soltar.
4. **Zoom Centrado no Cursor:** Posicione o cursor sobre o Pierre e gire a roda do mouse para aproximar e afastar. O zoom deve variar entre 0.2x e 4.0x mantendo o ponto sob o cursor fixo.
5. **Arrasto de Token:** Clique no agente Pierre e arraste-o pelo mapa. Ele deve se mover somente após um deslocamento mínimo de 3 pixels e salvar a nova posição ao soltar o clique.
6. **Seleção e Anel Dourado:** Clique (sem arrastar) no Pierre. Um anel dourado deve envolver o token e a seção "Token selecionado" no painel deve exibir "Pierre" e a sua ficha.
7. **Seleção de Monstro:** Clique no círculo vermelho com a letra "M". O painel deve abrir indicando "Monstro de teste" e exibir o aviso "Este token não tem ficha."
8. **Desmarcar Seleção:** Clique em uma área vazia do mapa. A seleção deve sumir e o painel deve exibir a mensagem "Clique em um token para editar."
9. **Régua de Medição (R):** Pressione `R`, clique e arraste entre dois pontos. A linha dourada com contorno escuro e o rótulo de distância em metros e quadrados devem aparecer no ponto final.
10. **Ímã da Régua:** Com a régua ativa, arraste de um token até outro. As extremidades da régua devem se fixar magneticamente no centro exato de cada token.
11. **Cancelamento com Esc:** Com a medição da régua visível, pressione `Esc`. A régua deve desaparecer da tela sem alterar a seleção de tokens.
12. **Alternância de Grade (G):** Pressione `G`. As linhas da grade devem alternar entre visíveis e invisíveis no mapa mantendo o alinhamento com a escala.
13. **Calibrar Escala (C):** Pressione `C`, trace uma linha no mapa e solte. O diálogo modal `<dialog>` deve abrir solicitando os metros conhecidos. Digitar "3" e salvar deve fechar o modal, atualizar a escala e remover o banner provisório.
14. **Edição de Recursos PV/SAN/PE:** Selecione o Pierre e clique no botão "+" de PV com quantidade "5". O PV deve subir de 70 para 75 tanto no painel quanto na barra desenhada acima do token.
15. **Estado "Morrendo":** Reduza o PV do Pierre para 0. A faixa vermelha "Morrendo" e as 3 caixas de rodadas devem surgir no painel. Curar o PV para 1 deve remover a faixa e zerar as caixas.
16. **Névoa de Guerra - Liga/Desliga:** Na seção Névoa, clique em "Névoa desligada". O botão deve mudar para "Névoa ligada", os controles de pincel devem surgir e a máscara suave de 35% deve cobrir o mapa.
17. **Ocultação de Tokens sob Névoa:** Pinte com a ferramenta de esconder sobre o monstro "M". O monstro deve ficar completamente invisível no mapa e deixar de ser clicável.
18. **Modo Apresentação (P):** Pressione `P`. O painel lateral, o banner e as dicas devem sumir, e a névoa deve escurecer para 85% de opacidade. Pressionar `P` novamente restaura a visão do mestre.
19. **Rolagem Simples de d20:** Na seção d20, clique em "Rolar d20" com o Pierre selecionado. Uma bolha flutuante com o resultado deve surgir sobre a cabeça do token no mapa e sumir após 5 segundos.
20. **Vantagem e Desvantagem no d20:** Ative o botão "Vantagem" e role o d20. O histórico deve registrar dois dados rolados e selecionar o maior valor.
21. **Alternância de Arma (A):** Com Pierre selecionado, pressione a tecla `A`. O sprite do personagem deve alternar entre a arte desarmada e a arte com o machado sem desalinhar o centro.
22. **Falas Prontas (1, 2, 3):** Com Pierre selecionado, pressione `1`. Um balão de fala com fundo claro e texto escuro deve surgir sobre o token no canvas e esmaecer após alguns segundos.
23. **Chat Livre e Histórico:** Digite "Atenção equipe!" no campo de chat e pressione `Enter`. O balão deve aparecer sobre o Pierre e a mensagem deve ingressar no histórico do chat.
24. **Persistência no LocalStorage:** Mova o Pierre para outra sala, recarregue a página no navegador (`F5`). O Pierre deve reaparecer exatamente na coordenada em que foi deixado.
25. **Exportação e Importação de JSON:** Clique em "Exportar" e baixe o arquivo JSON. Mova tokens na tela e em seguida clique em "Importar", selecionando o arquivo baixado. A mesa deve restaurar perfeitamente as posições salvas.
