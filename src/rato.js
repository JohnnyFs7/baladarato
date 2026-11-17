// =============================================================
// O RATO: cada pessoa da live vira um destes.
//
// Todo o desenho é feito com formas (círculos, elipses, linhas)
// no canvas. Quando você tiver a arte do Gemini, dá para trocar
// o miolo de desenharCorpo() por ctx.drawImage(...).
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const U = Balada.util;
  const C = Balada.config;

  // ---------- Fotos de perfil (carregadas uma vez por pessoa) ----------
  const cacheFotos = new Map();
  Balada.fotos = {
    obter(id, url) {
      if (!url) return null;
      let img = cacheFotos.get(id);
      if (!img) {
        img = new Image();
        img.referrerPolicy = "no-referrer";
        img.onerror = () => (img.falhou = true);
        img.src = url;
        cacheFotos.set(id, img);
      }
      return img;
    },
    pronta(img) {
      return img && !img.falhou && img.complete && img.naturalWidth > 0;
    },
  };

  // Estados possíveis do rato.
  // entrando -> dancando -> (saindo | dj | palco -> voltando -> dancando)
  const ESTADOS_ANDANDO = ["entrando", "saindo", "voltando"];

  class Rato {
    constructor(usuario, x, y) {
      this.id = usuario.id;
      this.nome = U.cortar(usuario.nome, C.limiteNome);
      this.fotoUrl = usuario.foto || null;
      this.corPelo = U.escolher(C.coresPelo);
      this.corAcessorio = U.escolher(C.coresAcessorio);
      this.acessorio = U.escolher(["bone", "nenhum"]); // boné de enfeite (só no rato)
      this.itens = new Set(); // roupas ganhas com presente: oculos, cordao, tenis, jaqueta, manto
      this.genero = null; // null/"m" = rato, "f" = rata (a pessoa escolhe comentando)
      this.estilo = Math.floor(Math.random() * 3); // jeito de dançar
      this.desfase = U.aleatorio(-0.08, 0.08); // ninguém dança 100% igual

      this.x = x;
      this.y = y;
      this.casaX = x; // lugar dele na pista
      this.casaY = y;
      this.alvoX = x;
      this.alvoY = y;
      this.velocidade = 450;
      this.virado = 1; // 1 = olhando para a direita, -1 = esquerda

      this.estado = "dancando";
      this.removido = false;
      this.vip = false;

      this.escala = 1; // muda quando fica gigante
      this.tempoGigante = 0;
      this.tempoGiro = 0;
      this.tempoHolofote = 0;
      this.balao = null; // { texto, tempo }
      this.ultimoEvento = 0;
    }

    // Manda o rato andar até um ponto.
    irPara(x, y, estado, velocidade) {
      this.alvoX = x;
      this.alvoY = y;
      this.estado = estado;
      this.velocidade = velocidade || 450;
      if (Math.abs(x - this.x) > 2) this.virado = x > this.x ? 1 : -1;
    }

    falar(texto) {
      this.balao = { texto: U.cortar(texto, C.limiteTextoBalao), tempo: C.duracaoBalao };
    }

    girar() {
      this.tempoGiro = 0.8;
    }

    ficarGigante() {
      this.tempoGigante = C.duracaoGigante;
    }

    // Veste um item. As roupas se somam: quem tem óculos e ganha o cordão fica com os dois.
    // Devolve true quando o item é novo.
    vestir(item) {
      if (!C.roupas.nomes[item] || this.itens.has(item)) return false;
      this.itens.add(item);
      return true;
    }

    usa(item) {
      return this.itens.has(item);
    }

    atualizar(dt) {
      // Contadores de tempo dos efeitos.
      this.tempoGigante = Math.max(0, this.tempoGigante - dt);
      this.tempoGiro = Math.max(0, this.tempoGiro - dt);
      this.tempoHolofote = Math.max(0, this.tempoHolofote - dt);
      if (this.balao) {
        this.balao.tempo -= dt;
        if (this.balao.tempo <= 0) this.balao = null;
      }

      // Cresce/encolhe suavemente (em vez de pular de tamanho de uma vez).
      const escalaAlvo = this.tempoGigante > 0 ? 2.5 : 1;
      this.escala += (escalaAlvo - this.escala) * Math.min(1, dt * 4);

      // Andar até o alvo.
      if (ESTADOS_ANDANDO.includes(this.estado)) {
        const dx = this.alvoX - this.x;
        const dy = this.alvoY - this.y;
        const dist = Math.hypot(dx, dy);
        const passo = this.velocidade * dt;
        if (dist <= passo) {
          this.x = this.alvoX;
          this.y = this.alvoY;
          if (this.estado === "saindo") this.removido = true;
          else this.estado = "dancando";
        } else {
          this.x += (dx / dist) * passo;
          this.y += (dy / dist) * passo;
        }
      }
    }

    // Tamanho pela profundidade: quem está mais embaixo na tela parece mais perto (maior).
    escalaPerspectiva() {
      if (this.estado === "dj") return 1.1;
      if (this.estado === "palco") return 1;
      const p = U.limitar((this.y - C.pista.topo) / (C.pista.base - C.pista.topo), 0, 1);
      return 0.72 + p * 0.38;
    }

    // t = tempo do jogo em segundos; festa = info da balada (drop, etc.)
    desenhar(ctx, t, festa) {
      const escalaTotal = this.escala * this.escalaPerspectiva();
      // A batida vem da música que está tocando (ver musica.js).
      const batida = Balada.batidaAtual + this.desfase * 2;
      const emMovimento = this.x !== this.alvoX || this.y !== this.alvoY;
      const andando = ESTADOS_ANDANDO.includes(this.estado) && emMovimento;

      // --- quanto o rato sobe e como ele estica/amassa ---
      let salto, esticaX = 1, esticaY = 1, inclinacao = 0, deslocX = 0, bracos;
      if (andando) {
        salto = Math.abs(Math.sin(t * 14)) * 10;
        bracos = Math.sin(t * 14) * 0.6;
      } else {
        const b = Math.abs(Math.sin(Math.PI * batida)); // 0 na batida, 1 no meio
        const forca = festa.drop ? 4 : 1;
        salto = b * 22 * forca;
        esticaX = 1 + 0.08 * (1 - b);
        esticaY = 1 - 0.08 * (1 - b);
        if (this.estado === "dj") {
          bracos = 1.2 + Math.sin(Math.PI * batida * 2) * 0.5; // mexendo nos discos
        } else if (this.estilo === 0) {
          inclinacao = Math.sin(Math.PI * batida) * 0.12; // balança
          bracos = 0.8 + b * 0.8;
        } else if (this.estilo === 1) {
          deslocX = Math.sin((Math.PI * batida) / 2) * 18; // passinho para os lados
          bracos = Math.sin(Math.PI * batida) * 1.2;
        } else {
          bracos = (Math.floor(batida) % 2 === 0 ? 2.6 : 0.6) + b * 0.3; // braços para cima
        }
        // Bolas caindo do céu: todo mundo da pista levanta os braços para bater nelas.
        if (festa.bolas && this.estado === "dancando") bracos = 2.5 + Math.sin(Math.PI * batida) * 0.3;
      }

      // Giro: espelha o desenho rapidamente, parece que está rodando.
      let giroX = 1;
      if (this.tempoGiro > 0) giroX = Math.cos((1 - this.tempoGiro / 0.8) * Math.PI * 4);

      const px = this.x + deslocX * escalaTotal;
      const py = this.y;

      // Holofote de quem acabou de seguir.
      if (this.tempoHolofote > 0) desenharHolofote(ctx, px, py, escalaTotal, this.tempoHolofote);

      // Sombra no chão.
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(px, py, 45 * escalaTotal * (1 - salto / 300), 12 * escalaTotal, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Corpo.
      ctx.save();
      ctx.translate(px, py - salto * escalaTotal);
      ctx.rotate(inclinacao);
      ctx.scale(escalaTotal * esticaX * giroX * this.virado, escalaTotal * esticaY);
      this.desenharCorpo(ctx, t, bracos);
      ctx.restore();

      // Foto, nome e balão ficam por cima, sem girar nem esticar.
      const topo = py - (salto + 185) * escalaTotal;
      this.desenharEtiqueta(ctx, px, topo);
    }

    // Desenho do rato com os pés no ponto (0, 0). Para cima é negativo.
    desenharCorpo(ctx, t, bracos) {
      const pelo = this.corPelo;
      const rosa = "#ff9fb2";

      // Rabo (mexendo).
      const mexe = Math.sin(t * 6) * 15;
      ctx.strokeStyle = "#e88a9c";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(20, -30);
      ctx.bezierCurveTo(80, -15, 70, -90 + mexe, 110, -100 + mexe);
      ctx.stroke();

      // Manto de rei (atrás do corpo, balançando).
      if (this.usa("manto")) {
        const vento = Math.sin(t * 4) * 6;
        ctx.fillStyle = "#7b1fa2";
        ctx.beginPath();
        ctx.moveTo(-34, -95);
        ctx.quadraticCurveTo(-78, -35 + vento, -62, 0);
        ctx.lineTo(62, 0);
        ctx.quadraticCurveTo(78, -35 - vento, 34, -95);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffd400";
        ctx.lineWidth = 5;
        ctx.stroke();
      }

      // Pés (ou tênis vermelho).
      if (this.usa("tenis")) {
        for (const lado of [-1, 1]) {
          ctx.fillStyle = "#e01e37";
          U.retanguloArredondado(ctx, lado * 21 - 20, -20, 40, 18, 9);
          ctx.fill();
          ctx.fillStyle = "#fff"; // sola
          ctx.fillRect(lado * 21 - 20, -6, 40, 5);
          ctx.strokeStyle = "#fff"; // cadarço
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lado * 21 - 6, -16);
          ctx.lineTo(lado * 21 + 4, -12);
          ctx.moveTo(lado * 21 - 6, -11);
          ctx.lineTo(lado * 21 + 4, -16);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = rosa;
        elipse(ctx, -20, -6, 17, 8);
        elipse(ctx, 20, -6, 17, 8);
      }

      // Braços (o ângulo vem da dança). Com jaqueta, a manga é preta.
      ctx.strokeStyle = this.usa("jaqueta") ? "#222" : pelo;
      ctx.lineWidth = 11;
      // Ângulo do braço: 0 = apontando para baixo, ~1.6 = esticado para o lado, ~3.1 = para cima.
      const ang = 0.5 + bracos;
      for (const lado of [-1, 1]) {
        const ox = lado * 32, oy = -78; // ombro
        const mx = ox + lado * Math.sin(ang) * 34; // mão
        const my = oy + Math.cos(ang) * 34;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.fillStyle = rosa;
        circulo(ctx, mx, my, 8);
      }

      // Corpo e barriga.
      ctx.fillStyle = pelo;
      elipse(ctx, 0, -55, 40, 50);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      elipse(ctx, 0, -48, 26, 34);

      // Jaqueta: pintamos só dentro do corpo (clip = "recorte").
      if (this.usa("jaqueta")) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -55, 40, 50, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#222";
        ctx.fillRect(-45, -110, 90, 115);
        // jaqueta aberta: aparece a barriga no meio
        ctx.fillStyle = pelo;
        ctx.beginPath();
        ctx.moveTo(-12, -100);
        ctx.lineTo(12, -100);
        ctx.lineTo(16, 0);
        ctx.lineTo(-16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Orelhas (antes da cabeça, para ficarem atrás).
      for (const lado of [-1, 1]) {
        ctx.fillStyle = pelo;
        circulo(ctx, lado * 32, -155, 23);
        ctx.fillStyle = rosa;
        circulo(ctx, lado * 32, -155, 13);
      }

      // Cabeça.
      ctx.fillStyle = pelo;
      circulo(ctx, 0, -125, 38);

      // O que vai no pescoço.
      if (this.usa("manto")) {
        // gola branca com pintinhas, de rei
        ctx.fillStyle = "#fff";
        elipse(ctx, 0, -86, 38, 11);
        ctx.fillStyle = "#111";
        for (const px of [-24, -8, 8, 24]) circulo(ctx, px, -86, 2.5);
      }
      if (this.usa("cordao")) {
        // cordão de ouro grosso com medalha
        ctx.strokeStyle = "#ffd400";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, -98, 28, 0.18 * Math.PI, 0.82 * Math.PI);
        ctx.stroke();
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // elos da corrente
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffd400";
        circulo(ctx, 0, -66, 10);
        ctx.fillStyle = "#b8860b";
        circulo(ctx, 0, -66, 5);
      }

      // Focinho, nariz, boca e bigodes.
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      elipse(ctx, 0, -107, 17, 13);
      ctx.fillStyle = "#ff6f91";
      circulo(ctx, 0, -114, 6);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -106, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 2;
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lado * 12, -110);
        ctx.lineTo(lado * 46, -117);
        ctx.moveTo(lado * 12, -106);
        ctx.lineTo(lado * 46, -102);
        ctx.stroke();
      }

      const rata = this.genero === "f";

      // Bochechas rosadas da rata.
      if (rata) {
        ctx.fillStyle = "rgba(255,110,150,0.45)";
        elipse(ctx, -26, -112, 9, 6);
        elipse(ctx, 26, -112, 9, 6);
      }

      // Olhos (ou óculos escuros, ganhos com presente).
      if (this.usa("oculos")) {
        ctx.fillStyle = "#111";
        U.retanguloArredondado(ctx, -32, -142, 28, 18, 7);
        ctx.fill();
        U.retanguloArredondado(ctx, 4, -142, 28, 18, 7);
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-4, -136);
        ctx.lineTo(4, -136);
        ctx.stroke();
        // brilho na lente
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 3;
        for (const lx of [-24, 12]) {
          ctx.beginPath();
          ctx.moveTo(lx, -128);
          ctx.lineTo(lx + 8, -138);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#111";
        circulo(ctx, -14, -131, 7);
        circulo(ctx, 14, -131, 7);
        ctx.fillStyle = "#fff";
        circulo(ctx, -12, -134, 2.5);
        circulo(ctx, 16, -134, 2.5);
        // Cílios da rata.
        if (rata) {
          ctx.strokeStyle = "#111";
          ctx.lineWidth = 2.5;
          for (const lado of [-1, 1]) {
            for (const [dx, dy] of [[4, -8], [10, -4], [12, 2]]) {
              ctx.beginPath();
              ctx.moveTo(lado * 14 + lado * dx * 0.6, -131 + dy * 0.6);
              ctx.lineTo(lado * 14 + lado * dx, -131 + dy - 3);
              ctx.stroke();
            }
          }
        }
      }

      // Laço da rata (no lugar do boné).
      if (rata) {
        ctx.fillStyle = this.corAcessorio;
        ctx.beginPath();
        ctx.moveTo(-18, -160);
        ctx.lineTo(-40, -174);
        ctx.lineTo(-40, -146);
        ctx.closePath();
        ctx.moveTo(-18, -160);
        ctx.lineTo(4, -174);
        ctx.lineTo(4, -146);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        circulo(ctx, -18, -160, 6);
      }

      // Boné (só no rato).
      if (this.acessorio === "bone" && !rata) {
        ctx.fillStyle = this.corAcessorio;
        ctx.beginPath();
        ctx.arc(0, -138, 37, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        elipse(ctx, 22, -139, 32, 7);
      }

      // Coroa VIP (de quem seguiu).
      if (this.vip) {
        ctx.fillStyle = "#ffd400";
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-26, -168);
        ctx.lineTo(-26, -196);
        ctx.lineTo(-13, -180);
        ctx.lineTo(0, -202);
        ctx.lineTo(13, -180);
        ctx.lineTo(26, -196);
        ctx.lineTo(26, -168);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Foto de perfil, nome e balão de fala.
    desenharEtiqueta(ctx, x, topo) {
      const img = Balada.fotos.obter(this.id, this.fotoUrl);
      const r = 22;
      const yFoto = topo - 18 - r;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, yFoto, r, 0, Math.PI * 2);
      ctx.closePath();
      if (Balada.fotos.pronta(img)) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, x - r, yFoto - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = this.corAcessorio;
        ctx.fill();
        U.texto(ctx, (this.nome[0] || "?").toUpperCase(), x, yFoto + 1, 24, "#fff");
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, yFoto, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      U.texto(ctx, this.nome, x, topo, 26, this.vip ? "#ffd400" : "#fff");

      if (this.balao) desenharBalao(ctx, this.balao, x, yFoto - r - 12);
    }
  }

  // ---------- desenhos auxiliares ----------
  function circulo(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function elipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function desenharBalao(ctx, balao, x, base) {
    ctx.save();
    ctx.globalAlpha = U.limitar(balao.tempo / 0.3, 0, 1);
    ctx.font = '700 28px "Arial", sans-serif';
    const largura = Math.min(ctx.measureText(balao.texto).width + 32, 700);
    const altura = 50;
    const bx = U.limitar(x - largura / 2, 10, C.largura - largura - 10);
    const by = base - altura - 14;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    U.retanguloArredondado(ctx, bx, by, largura, altura, 18);
    ctx.fill();
    ctx.stroke();
    // pontinha do balão
    ctx.beginPath();
    ctx.moveTo(x - 10, by + altura - 2);
    ctx.lineTo(x, by + altura + 14);
    ctx.lineTo(x + 10, by + altura - 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(balao.texto, bx + largura / 2, by + altura / 2 + 1, largura - 20);
    ctx.restore();
  }

  function desenharHolofote(ctx, x, y, escala, tempo) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = U.limitar(tempo, 0, 1) * 0.5;
    const grad = ctx.createLinearGradient(x, 0, x, y);
    grad.addColorStop(0, "rgba(255,240,150,0)");
    grad.addColorStop(1, "rgba(255,240,150,0.9)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - 20, 0);
    ctx.lineTo(x + 20, 0);
    ctx.lineTo(x + 90 * escala, y);
    ctx.lineTo(x - 90 * escala, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  Balada.Rato = Rato;
})();
