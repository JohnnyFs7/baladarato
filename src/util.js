// =============================================================
// FUNÇÕES PEQUENAS USADAS EM VÁRIOS ARQUIVOS
// =============================================================
window.Balada = window.Balada || {};

Balada.util = {
  // Número aleatório entre min e max.
  aleatorio(min, max) {
    return min + Math.random() * (max - min);
  },

  // Escolhe um item aleatório de uma lista.
  escolher(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  },

  // Prende um número entre min e max.
  limitar(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
  },

  // Corta um texto grande e coloca "..." no final.
  cortar(texto, limite) {
    texto = String(texto == null ? "" : texto);
    return texto.length > limite ? texto.slice(0, limite - 1) + "…" : texto;
  },

  // Escreve um texto com contorno preto, para dar para ler em qualquer fundo.
  // larguraMax (opcional): aperta o texto para caber nessa largura.
  texto(ctx, texto, x, y, tamanho, cor, alinhamento, larguraMax) {
    ctx.save();
    ctx.font = `900 ${tamanho}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = alinhamento || "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, tamanho * 0.2);
    ctx.strokeStyle = "#000";
    ctx.strokeText(texto, x, y, larguraMax);
    ctx.fillStyle = cor || "#fff";
    ctx.fillText(texto, x, y, larguraMax);
    ctx.restore();
  },

  // Desenha um retângulo com cantos arredondados (só o caminho).
  retanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
