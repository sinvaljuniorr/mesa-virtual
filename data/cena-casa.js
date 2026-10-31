/* ==========================================================================
   data/cena-casa.js - Dados iniciais da cena "Casa".
   Em file:// o fetch de JSON é bloqueado, então os dados iniciais ficam em
   arquivos .js e são expostos em window.MESA_DADOS (decisão D2/D8).
   ========================================================================== */

window.MESA_DADOS = {
  versao: 4,

  // Cena única da v1: a casa completa (três pavimentos empilhados na mesma
  // imagem). O campo "recorte" fica reservado para dividir os pavimentos
  // em cenas separadas numa etapa futura (E7).
  cena: {
    id: "casa",
    nome: "Casa",

    // Caminho da imagem do mapa (sem https, é arquivo local do projeto).
    // Coloque a sua imagem exatamente neste caminho:
    fundo: "assets/maps/casa.jpg",

    // Preenchidos automaticamente quando a imagem carrega (largura/altura
    // naturais da imagem, em pixels).
    largura: 0,
    altura: 0,

    // Reservado para a E7 (recortar um pavimento da imagem).
    recorte: null,

    // Escala do mapa em metros.
    // pxPorMetro provisório: 50 px por quadrado de 1,5 m => 50 / 1,5 = 33,3.
    // metrosPorQuadrado: 1,5 m é o padrão ANSI do sistema, mas o valor
    // definitivo deve ser confirmado no livro de regras (e está editável aqui).
    escala: {
      pxPorMetro: 33.3,
      metrosPorQuadrado: 1.5,
      calibrada: false            // true depois da calibração (some o banner)
    },

    // Grade opcional (linhas por quadrado). Desligada por padrão (decisão D6).
    grade: { visivel: false },

    // Névoa de guerra (E4). Desligada por padrão; a máscara (1/4 de
    // quadrado por célula, decisão D10) é criada com preguiça quando
    // a névoa é ligada pela primeira vez.
    nevoa: { visivel: false, larguraCel: 0, alturaCel: 0, dados: "" },

    // Câmera salva por cena (posição e zoom atuais).
    camera: { x: 0, y: 0, zoom: 1 },

    // Tokens da cena. Etapa 0: lista vazia (a Etapa 1 traz os dois tokens).
    tokens: []
  }
};
