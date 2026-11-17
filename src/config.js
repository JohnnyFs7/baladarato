// =============================================================
// CONFIGURAÇÕES DO JOGO
// Quase tudo que você quiser ajustar (tempos, cores, textos,
// presentes e roupas) está aqui. Mude, salve e recarregue
// a página (F5) para ver o resultado.
// =============================================================

// "Balada" é o objeto que guarda todas as partes do jogo.
// Cada arquivo acrescenta a sua parte nele.
window.Balada = window.Balada || {};

Balada.config = {
  // Tamanho da tela do jogo (em pé, igual ao celular/TikTok).
  largura: 1080,
  altura: 1920,

  // Velocidade padrão (batidas por minuto) quando não há música tocando.
  // Com música, os ratos dançam no ritmo dela (bpm de cada música, lá embaixo).
  bpm: 124,

  // Máximo de ratos na pista ao mesmo tempo.
  maxRatos: 40,

  // Se a pessoa ficar este tempo sem comentar/curtir/etc., o rato vai embora.
  tempoInativoSegundos: 600, // 10 minutos

  // Barra de HYPE: quantas curtidas para soltar o DROP.
  metaHype: 300,

  // Durações (em segundos).
  duracaoDrop: 8,
  duracaoGigante: 15,
  duracaoBalao: 4,

  // Limites de texto.
  limiteTextoBalao: 40,
  limiteNome: 14,

  // =========================================================
  // CARDÁPIO DE PRESENTES -> ROUPAS (aparece no menu da tela)
  // Conta o TOTAL de moedas que a pessoa já mandou na live.
  // Ex.: 30 rosas = 30 moedas = já ganha a camisa neon.
  // Confira no app do TikTok o nome e o valor de cada presente
  // e ajuste aqui se estiver diferente.
  // =========================================================
  // As roupas se SOMAM: quem chega a 30 moedas está de óculos + cordão + tênis.
  cardapio: [
    { presente: "Rosa", moedas: 1, roupa: "oculos" },
    { presente: "Coração", moedas: 5, roupa: "cordao" },
    { presente: "Rosquinha", moedas: 30, roupa: "tenis" },
    { presente: "Mãos de coração", moedas: 100, roupa: "jaqueta" },
    { presente: "Galáxia", moedas: 1000, roupa: "manto" },
  ],

  roupas: {
    nomes: {
      oculos: "Óculos escuros",
      cordao: "Cordão de ouro",
      tenis: "Tênis vermelho",
      jaqueta: "Jaqueta de couro",
      manto: "Manto de rei",
    },
  },

  // Efeitos especiais pelo valor de UM presente (moedas x quantidade).
  // Abaixo de "medio" é presente pequeno (o rato gira).
  presentes: {
    medio: 10, //    10 a 99    -> rato gigante
    grande: 100, //  100 a 999  -> fogos e holofote
    lendario: 1000, // 1000+    -> BOLAS GIGANTES caindo do céu, como em show
  },
  duracaoBolas: 14, // segundos que as bolas ficam pulando em cima da galera

  // =========================================================
  // MÚSICAS (o DJ escolhe comentando o número)
  //
  // As que têm "estilo" são BATIDAS FEITAS PELO PRÓPRIO JOGO (musica.js):
  // são originais, então não têm problema de direitos autorais.
  //
  // Para tocar um arquivo seu, coloque o .mp3 na pasta "musicas" e
  // acrescente uma linha assim (só use música que você tem direito de tocar):
  //   { nome: "Nome", artista: "Quem fez", arquivo: "musicas/arquivo.mp3", bpm: 128 },
  // =========================================================
  musicas: [
    { nome: "Funk da Balada", artista: "Batida da casa", estilo: "funk", bpm: 130 },
    { nome: "Noite Retrô 80", artista: "Batida da casa", estilo: "anos80", bpm: 118 },
    { nome: "Eurodance 90", artista: "Batida da casa", estilo: "anos90", bpm: 136 },
    { nome: "House dos Ratos", artista: "Batida da casa", estilo: "house", bpm: 124 },
  ],
  volumeMusica: 0.6, // de 0 a 1
  duracaoBatidaSegundos: 180, // as batidas da casa trocam sozinhas depois disso
  tempoPlaylistNaTela: 20, // segundos que a lista aparece quando entra um DJ novo

  // =========================================================
  // PÓDIO: os maiores apoiadores da live.
  // O 1º lugar é o DJ (na cabine). O 2º e o 3º ficam nos pedestais.
  // =========================================================
  palco: {
    // "total" = quem mandou MAIS moedas somando tudo na live
    // "maior" = quem mandou o presente MAIS CARO de uma vez só
    criterio: "total",
    lugares: [
      { x: 540, y: 735, cor: "#ffd400", rotulo: "TOP 1" }, // cabine do DJ
      { x: 175, y: 700, cor: "#c9d3e3", rotulo: "TOP 2" }, // pedestal da esquerda
      { x: 905, y: 730, cor: "#e08a4a", rotulo: "TOP 3" }, // pedestal da direita
    ],
  },

  // Comentários que escolhem rata ou rato (sem acento, sem "!").
  comandos: {
    rata: ["rata", "menina"],
    rato: ["rato", "menino"],
  },

  // Área da pista de dança onde os ratos ficam.
  pista: { esquerda: 90, direita: 990, topo: 950, base: 1560 },

  // Cores.
  coresPelo: ["#9aa0a6", "#7d838a", "#b8bcc2", "#8b6b4f", "#a5806a", "#eeeeee", "#5f5f66"],
  coresAcessorio: ["#ff2e88", "#00e5ff", "#ffd400", "#7cff4f", "#ff7a00", "#b04dff"],
  coresNeon: ["#ff2e88", "#00e5ff", "#ffd400", "#7cff4f", "#b04dff", "#ff7a00"],

  // Textos que aparecem na tela.
  titulo: "BALADA DOS RATOS",
  nomeDJPadrao: "DJ Rato",
  // Frases que se revezam em cima do menu de presentes.
  mensagensMenu: [
    "Comente para entrar na balada!",
    "Mande presente e ganhe roupa!",
    "Comente RATA ou RATO",
    "O TOP 1 vira o DJ!",
    "O DJ escolhe a música!",
  ],
};
