// =============================================================
// CONEXÃO COM A PONTE (TikTok)
// Quando o jogo é aberto pela ponte (http://localhost:8080), ele
// recebe os eventos da sua live por aqui e passa para
// Balada.receberEvento - o mesmo caminho que o simulador usa.
// Aberto direto do arquivo (dois cliques), só o simulador funciona.
// =============================================================
window.Balada = window.Balada || {};

(function () {
  if (!/^https?:$/.test(window.location.protocol)) return;

  const aviso = document.createElement("div");
  aviso.id = "status-ponte";
  document.body.appendChild(aviso);
  if (new URLSearchParams(window.location.search).has("live")) aviso.classList.add("escondido");

  function mostrar(texto) {
    aviso.textContent = texto;
  }

  let tentativas = 0;
  function conectar() {
    const protocolo = window.location.protocol === "https:" ? "wss" : "ws";
    const canal = new WebSocket(`${protocolo}://${window.location.host}/eventos`);

    canal.onopen = () => {
      tentativas = 0;
      mostrar("Ponte ligada");
    };
    canal.onmessage = (mensagem) => {
      let evento;
      try {
        evento = JSON.parse(mensagem.data);
      } catch {
        return;
      }
      if (evento.tipo === "status") mostrar("TikTok: " + evento.texto);
      else Balada.receberEvento(evento);
    };
    canal.onclose = () => {
      mostrar("Ponte desligada. Tentando de novo...");
      tentativas++;
      setTimeout(conectar, Math.min(10000, 1000 * tentativas));
    };
  }
  conectar();
})();
