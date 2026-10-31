/* ==========================================================================
   data/fatality-manifest.js - Lista de Fatalities (E5, decisão D11).
   As artes são de criação SUA (respeite licenças de terceiros).

   Como fazer a sua (guia rápido, Windows):
     1. Extraia os frames do vídeo/GIF como PNGs numerados:
        - GIMP: exporte cada frame como frame_001.png, frame_002.png...
        - ImageMagick (linha de comando): magick video.gif frame_%03d.png
     2. Guarde os PNGs numa pasta, ex.: assets/fatality/decapitacao/.
     3. Adicione um item na lista abaixo:
        { nome: "Decapitação",                       // rótulo no menu
          pasta: "assets/fatality/decapitacao/",     // pasta dos frames
          frames: ["frame_001.png", "frame_002.png"],// nomes exatos
          fps: 12,                                   // quadros por segundo
          alvo: "tela",                              // "tela" | "token"
          som: "",                                   // .mp3/.wav opcional (file://)
          personagem: "" }                           // vazio = todos os tokens

   Cada "alvo" define onde a animação toca: "tela" = tela inteira
   (fullscreen escurecida); "token" = só sobre o token escolhido.
   Ao terminar, o token passa ao estado "morto" (cinza + X).
   ========================================================================== */

window.MESA_FATALITIES = [];
