// =============================================================
// MÚSICA: toca a playlist e diz ao jogo em que batida estamos,
// para os ratos dançarem no ritmo.
//
// Dois tipos de música (ver "musicas" no config.js):
//  1) BATIDAS DA CASA ("estilo"): o próprio código cria o som com a
//     Web Audio API do navegador (bumbo, palma, chimbal, baixo, acordes).
//     São originais, então não há problema de direito autoral.
//  2) ARQUIVOS ("arquivo"): um .mp3 seu, na pasta "musicas".
//
// O navegador só deixa tocar som depois de um clique ou de uma tecla.
// Por isso aparece o botão "Clique para ligar o som".
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const C = Balada.config;
  const lista = C.musicas || [];

  let ctx = null; // AudioContext: a "mesa de som" do navegador
  let mestre = null; // volume geral
  let ruido = null; // um segundo de chiado, usado para chimbal, palma e caixa
  let indice = 0;
  let tocando = null;
  let escolhidaPor = null;
  let errosSeguidos = 0;

  // ---------- Preparar o som ----------
  function criarAudio() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const compressor = ctx.createDynamicsCompressor(); // segura os picos de volume
    mestre = ctx.createGain();
    mestre.gain.value = C.volumeMusica;
    mestre.connect(compressor);
    compressor.connect(ctx.destination);

    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const dados = ruido.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    return true;
  }

  // ---------- Instrumentos ----------
  // Nota MIDI -> frequência (69 = Lá 440 Hz; cada número a mais = meio tom).
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Volume que sobe rápido e depois some (o "envelope" do som).
  function envelope(ganho, t, pico, ataque, duracao) {
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(pico, t + ataque);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  }

  function bumbo(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12); // o "tum" que desce
    envelope(g, t, 1, 0.003, 0.4);
    o.connect(g);
    g.connect(mestre);
    o.start(t);
    o.stop(t + 0.45);
  }

  function chiado(t, tipoFiltro, freqFiltro, pico, duracao, q) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    const f = ctx.createBiquadFilter();
    f.type = tipoFiltro;
    f.frequency.value = freqFiltro;
    f.Q.value = q || 1;
    const g = ctx.createGain();
    envelope(g, t, pico, 0.002, duracao);
    s.connect(f);
    f.connect(g);
    g.connect(mestre);
    s.start(t, Math.random() * 0.5);
    s.stop(t + duracao + 0.05);
  }

  const chimbal = (t, aberto) => chiado(t, "highpass", 7000, aberto ? 0.16 : 0.1, aberto ? 0.25 : 0.05);
  const palma = (t) => {
    for (const d of [0, 0.012, 0.024]) chiado(t + d, "bandpass", 1300, 0.4, 0.12, 0.8);
  };
  const caixa = (t) => {
    chiado(t, "highpass", 1200, 0.45, 0.35);
    tambor(t, 190, 0.25, 0.08);
  };

  function tambor(t, f, pico, duracao) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + duracao);
    envelope(g, t, pico, 0.003, duracao);
    o.connect(g);
    g.connect(mestre);
    o.start(t);
    o.stop(t + duracao + 0.05);
  }

  function nota(t, midi, duracao, op) {
    const o = ctx.createOscillator();
    o.type = op.tipo || "sawtooth";
    o.frequency.value = freq(midi);
    o.detune.value = op.desafinar || 0;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = op.filtro || 2000;
    const g = ctx.createGain();
    envelope(g, t, op.pico || 0.2, op.ataque || 0.005, duracao);
    o.connect(f);
    f.connect(g);
    g.connect(mestre);
    o.start(t);
    o.stop(t + duracao + 0.05);
  }

  // Várias notas juntas. "supersaw" = 3 serras levemente desafinadas (som dos anos 90).
  function acorde(t, notas, duracao, op) {
    for (const n of notas) {
      nota(t, n, duracao, op);
      if (op.supersaw) {
        nota(t, n, duracao, { ...op, desafinar: 12 });
        nota(t, n, duracao, { ...op, desafinar: -12 });
      }
    }
  }

  // ---------- Os estilos ----------
  // Cada compasso tem 16 passos (semicolcheias). p = passo (0 a 15), c = número do compasso,
  // t = hora exata do passo, dp = duração de um passo em segundos.
  const LAm = [57, 60, 64], FA = [53, 57, 60], DO = [60, 64, 67], SOL = [55, 59, 62];
  const PROGRESSAO = [LAm, FA, DO, SOL];

  const ESTILOS = {
    funk(p, t, c, dp) {
      const ac = [LAm, LAm, FA, SOL][c % 4];
      if ([0, 7, 10].includes(p)) bumbo(t);
      if (p === 4 || p === 12) palma(t);
      if ([2, 3, 6, 9, 11, 14].includes(p)) tambor(t, [2, 9, 14].includes(p) ? 330 : 220, 0.32, 0.15); // tamborzão
      if (p % 2 === 0) chimbal(t, false);
      if (p === 0 || p === 10) nota(t, ac[0] - 24, dp * 5, { tipo: "sine", pico: 0.5, filtro: 400 }); // grave
      if (c % 2 === 1 && [0, 3, 6].includes(p)) acorde(t, ac.map((n) => n + 12), dp * 1.5, { tipo: "square", pico: 0.05, filtro: 2500 });
    },
    anos80(p, t, c, dp) {
      const ac = PROGRESSAO[c % 4];
      if (p % 4 === 0) bumbo(t);
      if (p === 4 || p === 12) caixa(t);
      if (p % 2 === 0) chimbal(t, p % 4 === 2);
      if (p % 2 === 0) nota(t, ac[0] - 24 + (p % 4 === 2 ? 12 : 0), dp * 1.8, { tipo: "sawtooth", pico: 0.16, filtro: 700 });
      nota(t, ac[p % 3] + 12, dp * 0.9, { tipo: "square", pico: 0.04, filtro: 3000 }); // arpejo
      if (p === 0) acorde(t, ac, dp * 15, { tipo: "triangle", pico: 0.05, filtro: 1500, ataque: 0.3 }); // fundo
    },
    anos90(p, t, c, dp) {
      const ac = PROGRESSAO[c % 4];
      if (p % 4 === 0) bumbo(t);
      if (p === 4 || p === 12) palma(t);
      if (p % 4 === 2) {
        chimbal(t, true);
        nota(t, ac[0] - 12, dp * 1.6, { tipo: "sawtooth", pico: 0.2, filtro: 900 }); // baixo no contratempo
      } else if (p % 2 === 1) chimbal(t, false);
      if ([0, 3, 6, 10, 12].includes(p)) acorde(t, ac.map((n) => n + 12), dp * 1.4, { tipo: "sawtooth", pico: 0.03, filtro: 4000, supersaw: true });
    },
    house(p, t, c, dp) {
      const ac = [[57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59]][c % 4];
      if (p % 4 === 0) bumbo(t);
      if (p === 4 || p === 12) palma(t);
      if (p % 4 === 2) chimbal(t, p === 14);
      if ([3, 6, 10].includes(p)) acorde(t, ac.map((n) => n + 12), dp * 1.2, { tipo: "triangle", pico: 0.07, filtro: 3000 });
      if ([0, 2, 6, 8, 10, 14].includes(p)) nota(t, ac[0] - 24 + (p % 4 === 2 ? 12 : 0), dp * 1.2, { tipo: "square", pico: 0.1, filtro: 500 });
    },
  };

  // ---------- Agendador ----------
  // A cada 25 ms, agenda os sons dos próximos 0,12 s. Assim a batida fica certinha
  // mesmo se o computador der uma travadinha.
  function agendar() {
    if (!tocando || tocando.tipo !== "batida" || !ctx || ctx.state !== "running") return;
    const dp = 60 / tocando.bpm / 4;
    while (tocando.proximoTempo < ctx.currentTime + 0.12) {
      const p = tocando.passo % 16;
      const c = Math.floor(tocando.passo / 16);
      try {
        (ESTILOS[tocando.estilo] || ESTILOS.house)(p, tocando.proximoTempo, c, dp);
      } catch (erro) {
        console.error("Erro na batida:", erro);
      }
      tocando.passo++;
      tocando.proximoTempo += dp;
    }
    if (ctx.currentTime > tocando.fimEm) proxima();
  }
  setInterval(agendar, 25);

  // ---------- Controles ----------
  function parar() {
    if (tocando && tocando.audio) {
      tocando.audio.pause();
      tocando.audio.src = "";
    }
    tocando = null;
  }

  // Toca a música de número i (começando em 0). "quem" = nome de quem escolheu.
  function tocar(i, quem) {
    if (!lista.length) return;
    indice = ((i % lista.length) + lista.length) % lista.length;
    escolhidaPor = quem || null;
    parar();
    criarAudio();
    const m = lista[indice];

    if (m.arquivo) {
      const audio = new Audio(m.arquivo);
      audio.volume = C.volumeMusica;
      // Só reage se esta ainda é a música atual (desligar a anterior também dispara "error").
      const ehAtual = () => tocando && tocando.audio === audio;
      audio.addEventListener("ended", () => ehAtual() && proxima());
      audio.addEventListener("playing", () => (errosSeguidos = 0));
      audio.addEventListener("error", () => {
        if (!ehAtual()) return;
        console.warn("Não consegui tocar o arquivo:", m.arquivo);
        errosSeguidos++;
        // Se nenhuma música da lista funciona, para de tentar.
        if (errosSeguidos < lista.length) setTimeout(proxima, 500);
      });
      audio.play().catch(() => {}); // pode precisar do clique em "ligar o som"
      tocando = { tipo: "arquivo", audio, bpm: m.bpm || C.bpm };
    } else {
      const inicio = ctx ? ctx.currentTime + 0.05 : 0;
      tocando = {
        tipo: "batida",
        estilo: m.estilo,
        bpm: m.bpm || C.bpm,
        inicio,
        proximoTempo: inicio,
        passo: 0,
        fimEm: inicio + C.duracaoBatidaSegundos,
      };
    }
  }

  function proxima() {
    tocar(indice + 1, null);
  }

  // Em que batida estamos (1, 2, 3...). A parte inteira muda a cada "tum" do bumbo.
  function batida(tempoJogo) {
    if (tocando && tocando.tipo === "batida" && ctx && ctx.state === "running") {
      if (tocando.inicio === 0) reiniciarRelogio();
      const atraso = ctx.outputLatency || 0;
      return (Math.max(0, ctx.currentTime - tocando.inicio - atraso) * tocando.bpm) / 60;
    }
    if (tocando && tocando.tipo === "arquivo" && !tocando.audio.paused) {
      return (tocando.audio.currentTime * tocando.bpm) / 60;
    }
    return (tempoJogo * (tocando ? tocando.bpm : C.bpm)) / 60;
  }

  // Se a música foi escolhida antes de o som ser ligado, começa a contar agora.
  function reiniciarRelogio() {
    tocando.inicio = ctx.currentTime + 0.05;
    tocando.proximoTempo = tocando.inicio;
    tocando.fimEm = tocando.inicio + C.duracaoBatidaSegundos;
  }

  // ---------- Botão "ligar o som" ----------
  const botao = document.createElement("button");
  botao.id = "ligar-som";
  botao.textContent = "🔊 Clique para ligar o som";
  botao.addEventListener("click", ligarSom);
  document.body.appendChild(botao);

  function precisaDeClique() {
    if (!ctx || ctx.state !== "running") return true;
    return !!(tocando && tocando.tipo === "arquivo" && tocando.audio.paused);
  }

  function ligarSom() {
    if (!criarAudio()) return;
    ctx.resume().then(() => {
      if (tocando && tocando.tipo === "batida" && tocando.proximoTempo < ctx.currentTime) reiniciarRelogio();
    });
    if (tocando && tocando.tipo === "arquivo") tocando.audio.play().catch(() => {});
  }

  // Qualquer clique ou tecla na página também liga o som.
  window.addEventListener("pointerdown", ligarSom);
  window.addEventListener("keydown", ligarSom);
  setInterval(() => botao.classList.toggle("escondido", !precisaDeClique()), 300);

  // Tenta já começar (em OBS / TikTok LIVE Studio o som costuma ser liberado sozinho).
  criarAudio();
  tocar(0, null);
  ligarSom();

  // ---------- O comando do DJ ----------
  // Aceita "2", "!2", "#2", "musica 2", "música 2", "m2". Devolve o índice (0, 1, ...) ou null.
  function numeroDoComando(texto) {
    const limpo = String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
    const achou = limpo.match(/^[!#]?\s*(?:musica|m)?\s*(\d{1,2})$/);
    if (!achou) return null;
    const n = parseInt(achou[1], 10);
    return n >= 1 && n <= lista.length ? n - 1 : null;
  }

  Balada.musica = {
    tocar,
    proxima,
    batida,
    numeroDoComando,
    lista: () => lista,
    atual: () => (lista.length ? { indice, ...lista[indice], escolhidaPor } : null),
    somLigado: () => !precisaDeClique(),
  };
})();
