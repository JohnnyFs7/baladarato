// =============================================================
// CENÁRIO: a balada (fundo, globo espelhado, caixas de som,
// cabine do DJ, pista que pisca, luzes, barra de HYPE e textos).
//
// "festa" é um resumo do estado do jogo que o jogo.js passa:
//   { drop, hype, metaHype, banner }
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const U = Balada.util;
  const C = Balada.config;
  const W = C.largura;
  const H = C.altura;
  const TOPO_PISTA = 820;

  // A batida da música (calculada no jogo.js a partir do musica.js).
  function batidaAtual() {
    return Balada.batidaAtual || 0;
  }

  Balada.cenario = {
    // ---------- Fundo: parede, letreiro, globo e caixas de som ----------
    desenharFundo(ctx, t, festa) {
      const grad = ctx.createLinearGradient(0, 0, 0, TOPO_PISTA);
      grad.addColorStop(0, "#0b0016");
      grad.addColorStop(1, "#24104a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, TOPO_PISTA);

      // Tijolinhos bem apagados na parede.
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 2;
      for (let y = 160, linha = 0; y < TOPO_PISTA; y += 50, linha++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        for (let x = (linha % 2) * 60; x < W; x += 120) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 50);
          ctx.stroke();
        }
      }

      const batida = batidaAtual(t);
      const pulso = 1 - (batida % 1); // 1 na batida, vai apagando

      // Letreiro neon.
      ctx.save();
      ctx.shadowColor = "#ff2e88";
      ctx.shadowBlur = 20 + pulso * 25;
      U.texto(ctx, C.titulo, W / 2, 370, 66, "#ff7ab8");
      ctx.restore();

      desenharGlobo(ctx, t, festa);
    },

    // ---------- Pedestais do pódio (TOP 2, TOP 3...) ----------
    // festa.palco = [{ nome, pontos } ou null, ...] na mesma ordem de config.palco.lugares.
    // O lugar 0 (TOP 1) é a cabine do DJ, desenhada em desenharCabine.
    desenharPalcos(ctx, t, festa) {
      const pulso = 1 - (batidaAtual(t) % 1);
      C.palco.lugares.forEach((lugar, i) => {
        if (i === 0) return;
        const info = festa.palco && festa.palco[i];
        const w = 220;
        const x = lugar.x - w / 2;
        const y = lugar.y;
        const h = TOPO_PISTA - y;

        // Brilho atrás de quem está no pedestal (pulsa na batida).
        ctx.save();
        ctx.globalAlpha = 0.25 + pulso * 0.25;
        const brilho = ctx.createRadialGradient(lugar.x, y - 100, 10, lugar.x, y - 100, 190);
        brilho.addColorStop(0, lugar.cor);
        brilho.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = brilho;
        ctx.fillRect(lugar.x - 200, y - 300, 400, 320);
        ctx.restore();

        // A caixa do pedestal.
        ctx.fillStyle = "#1c1630";
        U.retanguloArredondado(ctx, x, y, w, h + 10, 10);
        ctx.fill();
        ctx.strokeStyle = lugar.cor;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = lugar.cor;
        ctx.fillRect(x, y, w, 12);
      });
    },

    // ---------- Letreiros do pódio (por cima dos ratos da pista, para sempre dar para ler) ----------
    desenharRotulosPodio(ctx, t, festa) {
      C.palco.lugares.forEach((lugar, i) => {
        const info = festa.palco && festa.palco[i];
        const moedas = info ? `${info.pontos.toLocaleString("pt-BR")} moedas` : i === 0 ? "mande presente!" : "vago";
        if (i === 0) {
          // TOP 1 fica na frente da cabine do DJ.
          U.texto(ctx, `DJ • ${lugar.rotulo}`, lugar.x, 760, 30, lugar.cor);
          U.texto(ctx, moedas, lugar.x, 792, 22, "#fff");
        } else {
          U.texto(ctx, lugar.rotulo, lugar.x, lugar.y + 42, 38, lugar.cor);
          U.texto(ctx, moedas, lugar.x, lugar.y + 82, 24, "#fff");
        }
      });
    },

    // ---------- Frente da cabine do DJ (desenhada por cima do rato DJ) ----------
    desenharCabine(ctx, t, festa) {
      const batida = batidaAtual(t);
      const x = 330, y = 680, w = 420, h = 130;

      // Mesa.
      ctx.fillStyle = "#1c1c2b";
      U.retanguloArredondado(ctx, x, y, w, h, 12);
      ctx.fill();
      // Faixa neon que muda de cor na batida.
      ctx.fillStyle = C.coresNeon[Math.floor(batida) % C.coresNeon.length];
      ctx.fillRect(x + 20, y + 48, w - 40, 8);
      // Os letreiros "DJ • TOP 1" são desenhados por cima dos ratos, em desenharRotulosPodio.

      // Toca-discos girando.
      for (const cx of [x + 95, x + w - 95]) {
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        ctx.ellipse(cx, y + 22, 70, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 2;
        const ang = t * 6;
        ctx.beginPath();
        ctx.moveTo(cx, y + 22);
        ctx.lineTo(cx + Math.cos(ang) * 60, y + 22 + Math.sin(ang) * 15);
        ctx.stroke();
        ctx.fillStyle = "#ff2e88";
        ctx.beginPath();
        ctx.ellipse(cx, y + 22, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // ---------- Pista de dança quadriculada que pisca ----------
    desenharPista(ctx, t, festa) {
      ctx.fillStyle = "#0d0b1a";
      ctx.fillRect(0, TOPO_PISTA, W, H - TOPO_PISTA);

      const batida = batidaAtual(t) * (festa.drop ? 2 : 1);
      const vez = Math.floor(batida);
      const pulso = 1 - (batida % 1);
      const tamanho = 120;

      for (let linha = 0, y = TOPO_PISTA; y < H; linha++, y += tamanho) {
        for (let coluna = 0, x = 0; x < W; coluna++, x += tamanho) {
          if ((linha + coluna + vez) % 2 !== 0) continue; // tabuleiro de xadrez que alterna
          const cor = C.coresNeon[(linha * 3 + coluna + vez) % C.coresNeon.length];
          ctx.globalAlpha = 0.18 + pulso * 0.3;
          ctx.fillStyle = cor;
          ctx.fillRect(x + 4, y + 4, tamanho - 8, tamanho - 8);
        }
      }
      ctx.globalAlpha = 1;

      // Borda neon da pista.
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(0, TOPO_PISTA - 4, W, 6);
    },

    // ---------- Luzes por cima de tudo (holofotes e lasers) ----------
    desenharLuzes(ctx, t, festa) {
      const vel = festa.drop ? 3 : 1;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Holofotes coloridos varrendo a pista.
      const holofotes = [
        { x: 60, cor: "255,46,136", fase: 0 },
        { x: W - 60, cor: "0,229,255", fase: 2 },
        { x: 360, cor: "255,212,0", fase: 4 },
        { x: W - 360, cor: "176,77,255", fase: 1 },
      ];
      for (const h of holofotes) {
        const ang = Math.sin(t * 0.7 * vel + h.fase) * 0.55;
        const pontaX = h.x + Math.sin(ang) * 1700;
        const pontaY = Math.cos(ang) * 1700;
        const grad = ctx.createLinearGradient(h.x, 0, pontaX, pontaY);
        grad.addColorStop(0, `rgba(${h.cor},0.35)`);
        grad.addColorStop(1, `rgba(${h.cor},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(h.x - 10, 0);
        ctx.lineTo(h.x + 10, 0);
        ctx.lineTo(pontaX + 180, pontaY);
        ctx.lineTo(pontaX - 180, pontaY);
        ctx.closePath();
        ctx.fill();
      }

      // Bolinhas de luz do globo passeando pela tela.
      for (let i = 0; i < 40; i++) {
        const ang = t * 0.4 * vel + i * 2.39;
        const raio = 250 + ((i * 97) % 900);
        const x = W / 2 + Math.cos(ang) * raio;
        const y = 230 + Math.abs(Math.sin(ang + i)) * raio * 1.4;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lasers só no DROP.
      if (festa.drop) {
        ctx.lineWidth = 6;
        for (let i = 0; i < 10; i++) {
          const ang = Math.sin(t * 2.5 + i) * 0.9;
          ctx.strokeStyle = C.coresNeon[i % C.coresNeon.length];
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(W / 2, 230);
          ctx.lineTo(W / 2 + Math.sin(ang) * 2200, 230 + Math.cos(ang) * 2200);
          ctx.stroke();
        }
        // Flash branco na batida.
        const pulso = 1 - ((batidaAtual(t) * 2) % 1);
        ctx.globalAlpha = pulso * 0.12;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    },

    // ---------- Textos e barra de HYPE ----------
    desenharHUD(ctx, t, festa) {
      // Barra de HYPE.
      const x = 210, y = 40, w = 820, h = 56;
      U.texto(ctx, "HYPE", 110, y + h / 2, 44, "#ffd400");
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      U.retanguloArredondado(ctx, x, y, w, h, 28);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.stroke();

      const progresso = festa.drop ? 1 : U.limitar(festa.hype / festa.metaHype, 0, 1);
      if (progresso > 0) {
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, "#ff2e88");
        grad.addColorStop(1, "#ffd400");
        ctx.save();
        ctx.globalAlpha = festa.drop ? 0.6 + Math.sin(t * 20) * 0.4 : 1;
        ctx.fillStyle = grad;
        U.retanguloArredondado(ctx, x + 6, y + 6, Math.max(44, (w - 12) * progresso), h - 12, 22);
        ctx.fill();
        ctx.restore();
      }
      const textoBarra = festa.drop ? "DROP!" : `${festa.hype} / ${festa.metaHype} curtidas`;
      U.texto(ctx, textoBarra, x + w / 2, y + h / 2 + 2, 30, "#fff");

      // Música tocando agora (com o nome de quem fez: alguns sites exigem esse crédito).
      if (Balada.musica && Balada.musica.atual()) {
        const m = Balada.musica.atual();
        const quem = m.escolhidaPor ? `  (DJ ${m.escolhidaPor})` : "";
        U.texto(ctx, `♪ ${m.nome} - ${m.artista || ""}${quem}`, W / 2, 128, 26, "#00e5ff", "center", W - 60);
      }

      // Letreiro grande no meio da tela (DROP, DJ novo, bolas...).
      if (festa.drop) {
        const s = 1 + Math.sin(t * 12) * 0.08;
        ctx.save();
        ctx.translate(W / 2, 1000);
        ctx.scale(s, s);
        U.texto(ctx, "DROP!", 0, 0, 190, C.coresNeon[Math.floor(t * 8) % C.coresNeon.length]);
        ctx.restore();
      }
      if (festa.banner) {
        const b = festa.banner;
        const entrada = U.limitar((b.total - b.tempo) / 0.3, 0, 1); // "pula" para dentro
        ctx.save();
        ctx.globalAlpha = U.limitar(b.tempo / 0.5, 0, 1);
        ctx.translate(W / 2, 215);
        ctx.scale(entrada, entrada);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        U.retanguloArredondado(ctx, -500, -55, 1000, 110, 30);
        ctx.fill();
        U.texto(ctx, b.texto, 0, 2, 58, b.cor, "center");
        ctx.restore();
      }

    },

    // ---------- Bolas gigantes de show ----------
    desenharBolas(ctx, bolas) {
      for (const b of bolas) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.giro);
        // Gomos coloridos, como bola de praia.
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 === 0 ? b.cor : i === 3 ? "#fff" : b.cor2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, b.r, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.rotate(-b.giro);
        // Brilho e sombra para parecer redonda.
        const grad = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.35, b.r * 0.1, 0, 0, b.r);
        grad.addColorStop(0, "rgba(255,255,255,0.6)");
        grad.addColorStop(0.5, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.35)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.stroke();
        ctx.restore();
      }
    },

    // ---------- Lista de músicas (aparece quando entra um DJ novo) ----------
    desenharPlaylist(ctx, t, festa) {
      if (!festa.playlist || !Balada.musica) return;
      const lista = Balada.musica.lista();
      const atual = Balada.musica.atual();
      const dj = festa.palco && festa.palco[0];
      const alturaLinha = lista.length > 7 ? 46 : 54; // lista grande: linhas mais juntas
      const w = 760;
      const h = 130 + lista.length * alturaLinha;
      const x = (W - w) / 2;
      const y = Math.max(300, Math.min(930, 1620 - h)); // não cobre o menu de baixo

      ctx.save();
      ctx.globalAlpha = U.limitar(festa.playlist / 0.5, 0, 1); // some suavemente no fim
      ctx.fillStyle = "rgba(10,5,25,0.92)";
      U.retanguloArredondado(ctx, x, y, w, h, 26);
      ctx.fill();
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 4;
      ctx.stroke();

      U.texto(ctx, dj ? `DJ ${dj.nome}, escolha a música!` : "Escolha a música!", W / 2, y + 42, 36, "#ffd400", "center", w - 40);
      U.texto(ctx, "Comente o número:", W / 2, y + 86, 26, "#fff");
      lista.forEach((m, i) => {
        const ly = y + 130 + i * alturaLinha;
        const tocandoEsta = atual && atual.indice === i;
        if (tocandoEsta) {
          ctx.fillStyle = "rgba(0,229,255,0.18)";
          U.retanguloArredondado(ctx, x + 20, ly - alturaLinha / 2 + 3, w - 40, alturaLinha - 6, 12);
          ctx.fill();
        }
        U.texto(ctx, `${i + 1}`, x + 60, ly, 34, "#ff2e88");
        U.texto(ctx, `${m.nome}${tocandoEsta ? "  ♪" : ""}`, x + 100, ly, 28, "#fff", "left", w - 140);
      });
      ctx.restore();
    },

    // ---------- Menu de presentes -> roupas (embaixo da tela) ----------
    desenharMenu(ctx, t) {
      const itens = C.cardapio;
      const topo = 1640;
      const margem = 15;

      ctx.fillStyle = "rgba(10,5,25,0.88)";
      U.retanguloArredondado(ctx, margem, topo, W - margem * 2, H - topo - 12, 24);
      ctx.fill();
      ctx.strokeStyle = "#ff2e88";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Frase que muda a cada 4 segundos.
      const frases = C.mensagensMenu;
      const frase = frases[Math.floor(t / 4) % frases.length];
      ctx.save();
      ctx.globalAlpha = 0.8 + Math.sin(t * 3) * 0.2;
      U.texto(ctx, frase, W / 2, topo + 36, 38, "#fff", "center", W - 80);
      ctx.restore();

      // Um cartão por presente, com um ratinho vestindo a roupa.
      if (!manequins) {
        manequins = itens.map((item) => {
          const m = new Balada.Rato({ id: "menu", nome: "" }, 0, 0);
          m.acessorio = "nenhum";
          m.corPelo = "#b8bcc2";
          m.vestir(item.roupa);
          return m;
        });
      }
      const espaco = 10;
      const larguraCartao = (W - margem * 2 - 20 - espaco * (itens.length - 1)) / itens.length;
      itens.forEach((item, i) => {
        const cx = margem + 10 + i * (larguraCartao + espaco);
        const cy = topo + 66;
        const ch = H - cy - 24;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        U.retanguloArredondado(ctx, cx, cy, larguraCartao, ch, 16);
        ctx.fill();

        const meio = cx + larguraCartao / 2;
        const pulo = Math.abs(Math.sin(Math.PI * batidaAtual() + i * 0.5)) * 6;
        ctx.save();
        ctx.translate(meio, cy + 100 - pulo);
        ctx.scale(0.48, 0.48);
        manequins[i].desenharCorpo(ctx, t, 1.2);
        ctx.restore();

        U.texto(ctx, C.roupas.nomes[item.roupa] || item.roupa, meio, cy + 122, 19, "#ffd400", "center", larguraCartao - 12);
        U.texto(ctx, item.presente, meio, cy + 150, 22, "#fff", "center", larguraCartao - 12);
        U.texto(ctx, `${item.moedas.toLocaleString("pt-BR")} moeda${item.moedas > 1 ? "s" : ""}`, meio, cy + 175, 18, "#00e5ff", "center", larguraCartao - 12);
      });
    },
  };

  let manequins = null; // ratinhos do menu (criados na primeira vez)

  // Globo espelhado girando, pendurado no teto.
  function desenharGlobo(ctx, t, festa) {
    const cx = W / 2, cy = 230, r = 70;
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 100);
    ctx.lineTo(cx, cy - r);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#777";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const giro = (t * 40 * (festa.drop ? 3 : 1)) % 20;
    for (let y = cy - r; y < cy + r; y += 20) {
      for (let x = cx - r - 20 + giro; x < cx + r; x += 20) {
        const brilho = 120 + ((Math.floor(x / 20) * 7 + Math.floor(y / 20) * 13 + Math.floor(t * 6)) % 8) * 17;
        ctx.fillStyle = `rgb(${brilho},${brilho},${brilho + 20})`;
        ctx.fillRect(x + 1, y + 1, 18, 18);
      }
    }
    // sombra para parecer uma bola
    const grad = ctx.createRadialGradient(cx - 25, cy - 25, 10, cx, cy, r);
    grad.addColorStop(0, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }
})();
