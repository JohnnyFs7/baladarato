// =============================================================
// EFEITOS: confete, corações, brilhos, fogos e textos que sobem.
// Cada efeito é uma "partícula": tem posição, velocidade e um
// tempo de vida. Quando o tempo acaba, ela some.
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const U = Balada.util;
  const particulas = [];
  const textos = [];

  // Limite para não pesar o computador quando chovem presentes.
  const MAX_PARTICULAS = 1500;

  function adicionar(p) {
    if (particulas.length < MAX_PARTICULAS) particulas.push(p);
  }

  Balada.efeitos = {
    confete(x, y, quantidade) {
      for (let i = 0; i < quantidade; i++) {
        adicionar({
          tipo: "confete",
          x, y,
          vx: U.aleatorio(-500, 500),
          vy: U.aleatorio(-900, -200),
          gravidade: 900,
          vida: U.aleatorio(2, 3.5),
          cor: U.escolher(Balada.config.coresNeon),
          giro: U.aleatorio(0, Math.PI * 2),
          velGiro: U.aleatorio(-10, 10),
          tamanho: U.aleatorio(10, 20),
        });
      }
    },

    // Chuva de confete caindo do teto (usada no DROP).
    chuvaConfete(quantidade) {
      for (let i = 0; i < quantidade; i++) {
        adicionar({
          tipo: "confete",
          x: U.aleatorio(0, Balada.config.largura),
          y: U.aleatorio(-300, 0),
          vx: U.aleatorio(-80, 80),
          vy: U.aleatorio(100, 400),
          gravidade: 200,
          vida: U.aleatorio(4, 6),
          cor: U.escolher(Balada.config.coresNeon),
          giro: U.aleatorio(0, Math.PI * 2),
          velGiro: U.aleatorio(-10, 10),
          tamanho: U.aleatorio(12, 22),
        });
      }
    },

    coracoes(x, y, quantidade) {
      for (let i = 0; i < quantidade; i++) {
        adicionar({
          tipo: "coracao",
          x: x + U.aleatorio(-30, 30), y,
          vx: U.aleatorio(-40, 40),
          vy: U.aleatorio(-260, -160),
          gravidade: 0,
          vida: U.aleatorio(1.2, 2),
          cor: U.escolher(["#ff2e88", "#ff4d6d", "#ff8fab"]),
          tamanho: U.aleatorio(18, 30),
        });
      }
    },

    brilhos(x, y, quantidade) {
      for (let i = 0; i < quantidade; i++) {
        const angulo = U.aleatorio(0, Math.PI * 2);
        const vel = U.aleatorio(150, 450);
        adicionar({
          tipo: "brilho",
          x, y,
          vx: Math.cos(angulo) * vel,
          vy: Math.sin(angulo) * vel,
          gravidade: 200,
          vida: U.aleatorio(0.6, 1.2),
          cor: U.escolher(["#fff", "#ffd400", "#00e5ff"]),
          tamanho: U.aleatorio(6, 12),
        });
      }
    },

    // Um fogo de artifício: várias faíscas saindo de um ponto.
    fogos(x, y) {
      const cor = U.escolher(Balada.config.coresNeon);
      for (let i = 0; i < 60; i++) {
        const angulo = (i / 60) * Math.PI * 2;
        const vel = U.aleatorio(300, 600);
        adicionar({
          tipo: "brilho",
          x, y,
          vx: Math.cos(angulo) * vel,
          vy: Math.sin(angulo) * vel,
          gravidade: 350,
          vida: U.aleatorio(1, 1.6),
          cor,
          tamanho: U.aleatorio(7, 11),
        });
      }
    },

    // Texto que sobe e some (ex.: "Ana seguiu!").
    texto(texto, x, y, cor, tamanho) {
      textos.push({ texto, x, y, cor: cor || "#fff", tamanho: tamanho || 44, vida: 2.5, vidaTotal: 2.5 });
      if (textos.length > 12) textos.shift();
    },

    atualizar(dt) {
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vida -= dt;
        if (p.vida <= 0) {
          particulas.splice(i, 1);
          continue;
        }
        p.vy += p.gravidade * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.velGiro) p.giro += p.velGiro * dt;
      }
      for (let i = textos.length - 1; i >= 0; i--) {
        const t = textos[i];
        t.vida -= dt;
        t.y -= 70 * dt;
        if (t.vida <= 0) textos.splice(i, 1);
      }
    },

    desenhar(ctx) {
      for (const p of particulas) {
        ctx.save();
        ctx.globalAlpha = U.limitar(p.vida, 0, 1);
        ctx.fillStyle = p.cor;
        ctx.translate(p.x, p.y);
        if (p.tipo === "confete") {
          ctx.rotate(p.giro);
          ctx.fillRect(-p.tamanho / 2, -p.tamanho / 4, p.tamanho, p.tamanho / 2);
        } else if (p.tipo === "coracao") {
          desenharCoracao(ctx, p.tamanho);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.tamanho / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      for (const t of textos) {
        ctx.save();
        ctx.globalAlpha = U.limitar(t.vida / 0.5, 0, 1); // some no último meio segundo
        U.texto(ctx, t.texto, t.x, t.y, t.tamanho, t.cor);
        ctx.restore();
      }
    },
  };

  function desenharCoracao(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.4, -s, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }
})();
