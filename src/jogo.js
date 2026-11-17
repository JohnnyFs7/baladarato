// =============================================================
// O JOGO: as regras da balada e o "loop" que desenha a tela
// 60 vezes por segundo.
//
// A porta de entrada de TUDO é Balada.receberEvento(evento).
// Hoje quem chama é o simulador; depois será a ponte com o TikTok.
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const U = Balada.util;
  const C = Balada.config;
  const E = Balada.efeitos;

  // ---------- Tela ----------
  const canvas = document.getElementById("tela");
  const ctx = canvas.getContext("2d");
  canvas.width = C.largura;
  canvas.height = C.altura;

  // O jogo é sempre 1080x1920 por dentro; aqui só mudamos o tamanho que aparece
  // na janela, mantendo o formato em pé (9:16).
  function ajustarTamanho() {
    const s = Math.min(window.innerWidth / C.largura, window.innerHeight / C.altura);
    canvas.style.width = Math.floor(C.largura * s) + "px";
    canvas.style.height = Math.floor(C.altura * s) + "px";
  }
  window.addEventListener("resize", ajustarTamanho);
  ajustarTamanho();

  // ---------- Estado da balada ----------
  const ratos = new Map(); // id da pessoa -> Rato
  let tempo = 0; // segundos desde que o jogo abriu
  const festa = { drop: 0, hype: 0, metaHype: C.metaHype, banner: null, palco: [], bolas: false, playlist: 0 };
  Balada.batidaAtual = 0; // em que batida da música estamos (os ratos dançam nela)
  const filaBanners = [];

  // Ranking de presentes da live: id -> { id, nome, total, maior, quando }
  const ranking = new Map();
  // Pódio: palco[0] = TOP 1 (DJ), palco[1] = TOP 2, palco[2] = TOP 3 ...
  const LUGARES = C.palco.lugares;
  let palco = LUGARES.map(() => null);

  // DJ da casa: toca enquanto ninguém mandou presente.
  const djPadrao = new Balada.Rato({ id: "__dj__", nome: C.nomeDJPadrao }, LUGARES[0].x, LUGARES[0].y);
  djPadrao.vestir("oculos");
  djPadrao.estado = "dj";

  const bolas = []; // bolas gigantes caindo do céu (presente lendário)
  let tempoBolas = 0; // enquanto for > 0, a galera rebate as bolas para cima
  let tempoConfeteDrop = 0;
  let tempoChecarInativos = 0;

  // ---------- Porta de entrada dos eventos ----------
  const TIPOS = ["comentario", "curtida", "seguir", "presente", "compartilhar"];

  function receberEvento(evento) {
    try {
      if (!evento || typeof evento !== "object" || !TIPOS.includes(evento.tipo)) return;
      const usuario = normalizarUsuario(evento.usuario);
      if (!usuario) return;

      const rato = garantirRato(usuario);
      rato.ultimoEvento = tempo;
      if (usuario.foto && !rato.fotoUrl) rato.fotoUrl = usuario.foto;

      switch (evento.tipo) {
        case "comentario":
          aoComentar(rato, evento);
          break;
        case "curtida":
          aoCurtir(rato, numero(evento.quantidade, 1));
          break;
        case "seguir":
          aoSeguir(rato);
          break;
        case "compartilhar":
          rato.girar();
          E.texto(`${rato.nome} compartilhou!`, rato.x, acimaDo(rato), "#00e5ff");
          break;
        case "presente":
          aoReceberPresente(rato, evento);
          break;
      }
    } catch (erro) {
      // Um evento estranho nunca pode derrubar a live.
      console.error("Evento com problema:", evento, erro);
    }
  }

  function normalizarUsuario(u) {
    if (!u || typeof u !== "object") return null;
    const id = String(u.id != null && u.id !== "" ? u.id : u.nome || "").trim();
    if (!id) return null;
    const nome = String(u.nome || "").trim() || "anônimo";
    const foto = typeof u.foto === "string" && u.foto ? u.foto : null;
    return { id, nome, foto };
  }

  function numero(valor, padrao) {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : padrao;
  }

  // Altura acima da cabeça do rato, para textos que sobem.
  function acimaDo(rato) {
    return rato.y - 260 * rato.escala * rato.escalaPerspectiva();
  }

  function estaNoPodio(rato) {
    return rato.estado === "dj" || rato.estado === "palco";
  }

  // ---------- Entrar e sair da pista ----------
  function ratosNaPista() {
    return [...ratos.values()].filter((r) => r.estado !== "saindo");
  }

  function garantirRato(usuario) {
    let rato = ratos.get(usuario.id);
    if (rato) {
      // Estava indo embora? Volta para a pista.
      if (rato.estado === "saindo") rato.irPara(rato.casaX, rato.casaY, "voltando");
      return rato;
    }

    if (ratosNaPista().length >= C.maxRatos) liberarVaga();

    const lugar = acharLugar();
    const vemDaEsquerda = lugar.x < C.largura / 2;
    rato = new Balada.Rato(usuario, vemDaEsquerda ? -120 : C.largura + 120, lugar.y);
    rato.casaX = lugar.x;
    rato.casaY = lugar.y;
    rato.ultimoEvento = tempo;
    rato.irPara(lugar.x, lugar.y, "entrando");
    ratos.set(usuario.id, rato);
    return rato;
  }

  // Sorteia vários lugares e fica com o mais longe dos outros ratos.
  function acharLugar() {
    const P = C.pista;
    const outros = ratosNaPista();
    let melhor = null;
    let melhorDist = -1;
    for (let i = 0; i < 25; i++) {
      const x = U.aleatorio(P.esquerda, P.direita);
      const y = U.aleatorio(P.topo, P.base);
      let menor = Infinity;
      for (const r of outros) menor = Math.min(menor, Math.hypot(r.casaX - x, (r.casaY - y) * 1.5));
      if (menor > melhorDist) {
        melhorDist = menor;
        melhor = { x, y };
      }
    }
    return melhor;
  }

  // Quem está no pódio nunca é mandado embora.
  function podeSair(rato) {
    return !estaNoPodio(rato) && rato.estado !== "saindo";
  }

  // Pista cheia: quem está parado há mais tempo vai embora.
  function liberarVaga() {
    let maisAntigo = null;
    for (const r of ratos.values()) {
      if (!podeSair(r)) continue;
      if (!maisAntigo || r.ultimoEvento < maisAntigo.ultimoEvento) maisAntigo = r;
    }
    if (maisAntigo) mandarEmbora(maisAntigo);
  }

  function mandarEmbora(rato) {
    const x = rato.x < C.largura / 2 ? -150 : C.largura + 150;
    rato.irPara(x, rato.y, "saindo", 350);
  }

  // ---------- Regras de cada evento ----------
  function aoComentar(rato, evento) {
    const texto = String(evento.texto == null ? "" : evento.texto).trim();
    if (!texto) return;

    // Comandos: comentar "rata" ou "rato" escolhe o visual.
    const comando = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // tira acentos
      .replace(/[^a-z]/g, ""); // tira "!", espaços, emojis...
    if (C.comandos.rata.includes(comando) && rato.genero !== "f") {
      rato.genero = "f";
      E.brilhos(rato.x, acimaDo(rato) + 80, 25);
      E.texto(`${rato.nome} virou rata!`, rato.x, acimaDo(rato), "#ff7ab8");
    } else if (C.comandos.rato.includes(comando) && rato.genero !== "m") {
      rato.genero = "m";
      E.brilhos(rato.x, acimaDo(rato) + 80, 25);
      E.texto(`${rato.nome} virou rato!`, rato.x, acimaDo(rato), "#00e5ff");
    }

    // O DJ (TOP 1) escolhe a música comentando o número dela.
    if (palco[0] === rato.id && Balada.musica) {
      const escolha = Balada.musica.numeroDoComando(texto);
      if (escolha !== null) {
        Balada.musica.tocar(escolha, rato.nome);
        const m = Balada.musica.atual();
        mostrarBanner(`DJ ${rato.nome}: ${m.nome}`, "#00e5ff", 3, "musica");
        E.brilhos(rato.x, rato.y - 150, 30);
        festa.playlist = Math.min(festa.playlist, 2); // já escolheu: a lista some logo
      }
    }
    rato.falar(texto);
  }

  function aoCurtir(rato, quantidade) {
    E.coracoes(rato.x, acimaDo(rato) + 40, Math.min(5, Math.ceil(quantidade / 5)));
    festa.hype += Math.floor(quantidade);
    if (!festa.drop && festa.hype >= festa.metaHype) iniciarDrop();
  }

  function aoSeguir(rato) {
    rato.vip = true;
    rato.tempoHolofote = 3;
    E.brilhos(rato.x, acimaDo(rato) + 60, 30);
    E.texto(`${rato.nome} seguiu!`, rato.x, acimaDo(rato), "#ffd400");
  }

  function aoReceberPresente(rato, evento) {
    const total = numero(evento.moedas, 1) * numero(evento.quantidade, 1);
    const nomePresente = String(evento.nomePresente || "presente");
    const F = C.presentes;

    // 1) O efeito do presente na festa (pelo valor deste presente).
    if (total >= F.lendario) {
      soltarBolas(rato);
    } else if (total >= F.grande) {
      rato.girar();
      rato.tempoHolofote = 3;
      for (let i = 0; i < 3; i++) E.fogos(rato.x + U.aleatorio(-200, 200), rato.y - U.aleatorio(250, 450));
      E.texto(`${rato.nome} mandou ${nomePresente}!`, rato.x, acimaDo(rato), "#ff7a00", 50);
    } else if (total >= F.medio) {
      rato.ficarGigante();
      E.brilhos(rato.x, rato.y - 100, 50);
      E.texto(`${rato.nome} ficou GIGANTE!`, rato.x, acimaDo(rato) - 200, "#7cff4f", 52);
    } else {
      rato.girar();
      E.brilhos(rato.x, acimaDo(rato) + 80, 25);
      E.texto(`${rato.nome} mandou ${nomePresente}`, rato.x, acimaDo(rato), "#ff7ab8");
    }

    // 2) O ranking (soma de tudo que a pessoa mandou na live).
    let r = ranking.get(rato.id);
    if (!r) {
      r = { id: rato.id, nome: rato.nome, total: 0, maior: 0, quando: 0 };
      ranking.set(rato.id, r);
    }
    const antes = pontuacao(r);
    r.total += total;
    r.maior = Math.max(r.maior, total);
    if (pontuacao(r) !== antes) r.quando = tempo; // no empate, fica quem chegou primeiro

    // 3) As roupas do cardápio: ganha tudo que o total dele já alcançou.
    let ganhou = null;
    for (const item of C.cardapio) {
      if (r.total >= item.moedas && rato.vestir(item.roupa)) ganhou = item.roupa;
    }
    if (ganhou) {
      E.texto(`Ganhou: ${C.roupas.nomes[ganhou] || ganhou}!`, rato.x, acimaDo(rato) + 60, "#ffd400", 34);
    }

    // 4) O pódio.
    atualizarPodio();
  }

  // ---------- DROP ----------
  function iniciarDrop() {
    festa.drop = C.duracaoDrop;
    festa.hype = 0;
    E.chuvaConfete(250);
  }

  // ---------- PÓDIO (TOP 1 = DJ, TOP 2 e TOP 3 nos pedestais) ----------
  function pontuacao(r) {
    return C.palco.criterio === "maior" ? r.maior : r.total;
  }

  function atualizarPodio() {
    const novos = [...ranking.values()]
      .filter((r) => ratos.has(r.id) && ratos.get(r.id).estado !== "saindo")
      .sort((a, b) => pontuacao(b) - pontuacao(a) || a.quando - b.quando)
      .slice(0, LUGARES.length)
      .map((r) => r.id);
    while (novos.length < LUGARES.length) novos.push(null);

    // Quem perdeu o lugar desce para a pista.
    for (const id of palco) {
      if (id && !novos.includes(id)) {
        const rato = ratos.get(id);
        if (rato && estaNoPodio(rato)) descerDoPodio(rato);
      }
    }
    // Quem ganhou um lugar (ou mudou de lugar) sobe.
    novos.forEach((id, i) => {
      if (id && palco[i] !== id) subirNoPodio(ratos.get(id), i);
    });

    if (novos[0] && novos[0] !== palco[0]) {
      mostrarBanner(`DJ ${ratos.get(novos[0]).nome} no comando!`, LUGARES[0].cor, 4, "dj");
      for (let i = 0; i < 4; i++) E.fogos(U.aleatorio(150, 930), U.aleatorio(200, 700));
      festa.playlist = C.tempoPlaylistNaTela; // mostra a lista de músicas para o DJ novo escolher
    }
    palco = novos;
    festa.palco = palco.map((id) => (id ? { nome: ranking.get(id).nome, pontos: pontuacao(ranking.get(id)) } : null));
  }

  function subirNoPodio(rato, i) {
    const lugar = LUGARES[i];
    E.confete(rato.x, rato.y - 100, 30);
    rato.estado = i === 0 ? "dj" : "palco";
    rato.x = rato.alvoX = lugar.x;
    rato.y = rato.alvoY = lugar.y;
    rato.virado = 1;
    E.brilhos(lugar.x, lugar.y - 100, 40);
  }

  function descerDoPodio(rato) {
    rato.y = C.pista.topo;
    E.confete(rato.x, rato.y - 100, 20);
    rato.irPara(rato.casaX, rato.casaY, "voltando");
  }

  // ---------- BOLAS GIGANTES (como nos shows) ----------
  function soltarBolas(quem) {
    mostrarBanner(`${quem.nome} soltou as BOLAS!`, "#ff7ab8", 4);
    tempoBolas = C.duracaoBolas;
    if (bolas.length > 30) return; // já tem bola demais na tela
    for (let i = 0; i < 12; i++) {
      bolas.push({
        x: U.aleatorio(90, C.largura - 90),
        y: U.aleatorio(-900, -100), // começam acima da tela, em alturas diferentes
        vx: U.aleatorio(-60, 60),
        vy: 0,
        r: U.aleatorio(48, 80),
        cor: U.escolher(C.coresNeon),
        cor2: U.escolher(C.coresNeon),
        giro: U.aleatorio(0, Math.PI * 2),
        alturaGalera: U.aleatorio(1000, 1400), // onde a galera bate nela
      });
    }
  }

  function atualizarBolas(dt) {
    tempoBolas = Math.max(0, tempoBolas - dt);
    for (let i = bolas.length - 1; i >= 0; i--) {
      const b = bolas[i];
      b.vy += 900 * dt; // gravidade
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.giro += (b.vx / b.r) * dt;
      // A galera rebate a bola para cima (enquanto o tempo das bolas não acabou).
      if (tempoBolas > 0 && b.vy > 0 && b.y + b.r > b.alturaGalera) {
        b.vy = -U.aleatorio(750, 1050);
        b.vx = U.aleatorio(-220, 220);
        E.brilhos(b.x, b.y + b.r, 6);
      }
      // Bate nas paredes.
      if (b.x < b.r) {
        b.x = b.r;
        b.vx = Math.abs(b.vx);
      } else if (b.x > C.largura - b.r) {
        b.x = C.largura - b.r;
        b.vx = -Math.abs(b.vx);
      }
      // Acabou o tempo: caem e somem por baixo.
      if (b.y - b.r > C.altura) bolas.splice(i, 1);
    }
    festa.bolas = tempoBolas > 0;
  }

  // ---------- Letreiros ----------
  // "chave" (opcional): um aviso novo com a mesma chave substitui o antigo
  // (ex.: o DJ trocou duas vezes seguidas -> só mostra o DJ de agora).
  function mostrarBanner(texto, cor, duracao, chave) {
    if (chave) {
      for (let i = filaBanners.length - 1; i >= 0; i--) if (filaBanners[i].chave === chave) filaBanners.splice(i, 1);
      if (festa.banner && festa.banner.chave === chave) festa.banner.tempo = Math.min(festa.banner.tempo, 0.3);
    }
    if (filaBanners.length >= 5) filaBanners.shift(); // não deixa acumular demais
    filaBanners.push({ texto: U.cortar(texto, 28), cor, tempo: duracao, total: duracao, chave });
  }

  function atualizarBanners(dt) {
    if (!festa.banner && filaBanners.length) festa.banner = filaBanners.shift();
    if (festa.banner) {
      festa.banner.tempo -= dt;
      if (festa.banner.tempo <= 0) festa.banner = null;
    }
  }

  // ---------- Atualizar tudo ----------
  function atualizar(dt) {
    tempo += dt;
    Balada.batidaAtual = Balada.musica ? Balada.musica.batida(tempo) : (tempo * C.bpm) / 60;
    festa.playlist = Math.max(0, festa.playlist - dt);

    for (const [id, rato] of ratos) {
      rato.atualizar(dt);
      if (rato.removido) ratos.delete(id);
    }
    djPadrao.atualizar(dt);

    if (festa.drop > 0) {
      festa.drop = Math.max(0, festa.drop - dt);
      tempoConfeteDrop -= dt;
      if (tempoConfeteDrop <= 0) {
        E.chuvaConfete(25);
        tempoConfeteDrop = 0.5;
      }
      // Curtidas que chegaram durante o DROP podem soltar outro logo depois.
      if (festa.drop === 0 && festa.hype >= festa.metaHype) iniciarDrop();
    }

    atualizarBolas(dt);
    atualizarBanners(dt);
    E.atualizar(dt);

    // Uma vez por segundo, manda embora quem está parado há muito tempo.
    tempoChecarInativos -= dt;
    if (tempoChecarInativos <= 0) {
      tempoChecarInativos = 1;
      for (const r of ratos.values()) {
        if (podeSair(r) && tempo - r.ultimoEvento > C.tempoInativoSegundos) mandarEmbora(r);
      }
    }
  }

  // ---------- Desenhar tudo (de trás para a frente) ----------
  function desenhar() {
    ctx.clearRect(0, 0, C.largura, C.altura);
    const cen = Balada.cenario;

    cen.desenharFundo(ctx, tempo, festa);
    cen.desenharPalcos(ctx, tempo, festa);
    for (const r of ratos.values()) if (r.estado === "palco") r.desenhar(ctx, tempo, festa);

    const top1 = palco[0] && ratos.get(palco[0]);
    (top1 && top1.estado === "dj" ? top1 : djPadrao).desenhar(ctx, tempo, festa);
    cen.desenharCabine(ctx, tempo, festa);
    cen.desenharPista(ctx, tempo, festa);

    // Quem está mais embaixo na tela é desenhado por último (fica na frente).
    const naPista = [...ratos.values()].filter((r) => !estaNoPodio(r)).sort((a, b) => a.y - b.y);
    for (const r of naPista) r.desenhar(ctx, tempo, festa);

    cen.desenharRotulosPodio(ctx, tempo, festa);
    cen.desenharBolas(ctx, bolas);
    E.desenhar(ctx);
    cen.desenharLuzes(ctx, tempo, festa);
    cen.desenharPlaylist(ctx, tempo, festa);
    cen.desenharMenu(ctx, tempo);
    cen.desenharHUD(ctx, tempo, festa);
  }

  // ---------- Loop principal ----------
  let ultimoQuadro = performance.now();
  function quadro(agora) {
    // dt = quanto tempo passou desde o último quadro (no máximo 0,05 s,
    // para nada "teletransportar" se a aba ficar travada).
    const dt = Math.min(0.05, Math.max(0, (agora - ultimoQuadro) / 1000));
    ultimoQuadro = agora;
    atualizar(dt);
    desenhar();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  // ---------- O que fica disponível para outros arquivos ----------
  Balada.receberEvento = receberEvento;

  // Quem é o DJ agora (TOP 1). Usado pelo simulador para fingir o comando de música.
  Balada.djAtual = function () {
    const r = palco[0] && ratos.get(palco[0]);
    return r ? { id: r.id, nome: r.nome } : null;
  };

  // Resumo do estado (útil para testar no console do navegador: Balada.estado()).
  Balada.estado = function () {
    return {
      ratos: ratosNaPista().length,
      hype: festa.hype,
      drop: festa.drop > 0,
      bolas: bolas.length,
      musica: Balada.musica && Balada.musica.atual() ? Balada.musica.atual().nome : null,
      somLigado: Balada.musica ? Balada.musica.somLigado() : false,
      podio: festa.palco.map((p) => (p ? `${p.nome} (${p.pontos})` : "vago")),
    };
  };
})();
