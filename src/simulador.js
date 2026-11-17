// =============================================================
// SIMULADOR: finge eventos da live para testar sem estar ao vivo.
// Ele só usa Balada.receberEvento(...), igual fará a ponte com o
// TikTok. Assim, o que funciona aqui funciona na live.
//
// Teclas: C comentário | L curtidas | F seguir | S compartilhar
//         1 a 5 presentes do cardápio | R alguém vira rata | T alguém vira rato
//         M o DJ escolhe uma música | P próxima música
//         N 10 pessoas entram | A automático | H esconder/mostrar o painel
//         No celular: o botão redondo abre o painel; dá para digitar comentários
// Na URL: ?live esconde o painel | ?auto já começa no automático
// =============================================================
window.Balada = window.Balada || {};

(function () {
  const U = Balada.util;
  const C = Balada.config;

  const NOMES = [
    "Joaozinho", "Bia_gamer", "Pedrão", "Lu.dancinha", "Kaique", "MariFlor", "Zé do Funk",
    "Gabi", "Thiaguinho", "Duda", "Rafinha", "Leleco", "Nanda", "Vitão", "Cacau", "Juju",
    "Biel", "Mel", "Toninho", "Larissinha", "DJ Pipoca", "Fefe", "Guizinho", "Aninha",
    "Mumu", "Theo", "Pri", "Lipe", "Babi", "Netinho",
  ];
  const FRASES = [
    "salve!", "boa noite balada", "toca um funk!", "kkkkkk", "olha eu aqui",
    "vamo que vamo", "que rato lindo", "solta o grave DJ", "cheguei!", "manda o drop",
    "solta as bolas!", "aumenta o som!!", "primeira vez aqui", "quero o óculos",
  ];

  const usuarios = []; // pessoas que o simulador já "criou"
  let contador = 0;

  function novoUsuario() {
    contador++;
    const base = NOMES[(contador - 1) % NOMES.length];
    const nome = contador > NOMES.length ? `${base}${Math.floor(contador / NOMES.length)}` : base;
    const u = { id: "sim-" + contador, nome, foto: null };
    usuarios.push(u);
    return u;
  }

  // Às vezes alguém novo, às vezes quem já está na festa.
  function alguem(chanceNovo) {
    if (!usuarios.length || Math.random() < chanceNovo) return novoUsuario();
    return U.escolher(usuarios);
  }

  function enviar(evento) {
    Balada.receberEvento(evento);
  }

  // Presente número n do cardápio (1 = o mais barato).
  function mandarPresente(n) {
    const item = C.cardapio[n - 1];
    if (!item) return;
    enviar({
      tipo: "presente",
      usuario: alguem(0.2),
      nomePresente: item.presente,
      moedas: item.moedas,
      quantidade: 1,
    });
  }

  const acoes = {
    comentario: () => enviar({ tipo: "comentario", usuario: alguem(0.4), texto: U.escolher(FRASES) }),
    curtida: () => enviar({ tipo: "curtida", usuario: alguem(0.1), quantidade: 25 }),
    seguir: () => enviar({ tipo: "seguir", usuario: alguem(0.3) }),
    compartilhar: () => enviar({ tipo: "compartilhar", usuario: alguem(0.2) }),
    virarRata: () => enviar({ tipo: "comentario", usuario: alguem(0.2), texto: "rata" }),
    virarRato: () => enviar({ tipo: "comentario", usuario: alguem(0.2), texto: "rato" }),
    // Finge que o DJ (TOP 1) comentou o número de uma música.
    djEscolhe: () => {
      const dj = Balada.djAtual && Balada.djAtual();
      const total = Balada.musica ? Balada.musica.lista().length : 0;
      if (!dj || !total) return;
      const n = 1 + Math.floor(Math.random() * total);
      enviar({ tipo: "comentario", usuario: { id: dj.id, nome: dj.nome, foto: null }, texto: String(n) });
    },
    proximaMusica: () => Balada.musica && Balada.musica.proxima(),
    entrarDez: () => {
      for (let i = 0; i < 10; i++) enviar({ tipo: "comentario", usuario: novoUsuario(), texto: "cheguei!" });
    },
  };

  // ---------- Modo automático ----------
  let automatico = false;
  let temporizador = null;

  function eventoAleatorio() {
    const sorteio = Math.random();
    if (sorteio < 0.38) acoes.comentario();
    else if (sorteio < 0.7) acoes.curtida();
    else if (sorteio < 0.76) acoes.virarRata();
    else if (sorteio < 0.79) acoes.virarRato();
    else if (sorteio < 0.84) acoes.seguir();
    else if (sorteio < 0.87) acoes.compartilhar();
    else if (sorteio < 0.93) mandarPresente(1);
    else if (sorteio < 0.96) mandarPresente(2);
    else if (sorteio < 0.98) mandarPresente(3);
    else if (sorteio < 0.995) mandarPresente(4);
    else mandarPresente(5);
  }

  function proximoAutomatico() {
    eventoAleatorio();
    temporizador = setTimeout(proximoAutomatico, U.aleatorio(300, 1500));
  }

  function alternarAutomatico() {
    automatico = !automatico;
    clearTimeout(temporizador);
    if (automatico) proximoAutomatico();
    const botao = document.getElementById("botao-auto");
    if (botao) botao.textContent = automatico ? "A  Automático: LIGADO" : "A  Automático: desligado";
  }

  // ---------- Teclado ----------
  const TECLAS = {
    c: acoes.comentario,
    l: acoes.curtida,
    f: acoes.seguir,
    s: acoes.compartilhar,
    r: acoes.virarRata,
    t: acoes.virarRato,
    m: acoes.djEscolhe,
    p: acoes.proximaMusica,
    n: acoes.entrarDez,
    a: alternarAutomatico,
    h: () => alternarPainel(),
  };
  C.cardapio.forEach((_, i) => (TECLAS[String(i + 1)] = () => mandarPresente(i + 1)));

  window.addEventListener("keydown", (e) => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; // digitando um comentário
    const acao = TECLAS[e.key.toLowerCase()];
    if (acao && !e.repeat) acao();
  });

  // ---------- Painel com botões ----------
  const BOTOES = [
    ["C  Comentário", acoes.comentario],
    ["L  25 curtidas", acoes.curtida],
    ["F  Seguir", acoes.seguir],
    ["S  Compartilhar", acoes.compartilhar],
    ["R  Alguém comenta \"rata\"", acoes.virarRata],
    ["T  Alguém comenta \"rato\"", acoes.virarRato],
    ...C.cardapio.map((item, i) => [`${i + 1}  ${item.presente} (${item.moedas})`, () => mandarPresente(i + 1)]),
    ["M  O DJ escolhe uma música", acoes.djEscolhe],
    ["P  Próxima música", acoes.proximaMusica],
    ["N  10 pessoas entram", acoes.entrarDez],
  ];

  const painel = document.createElement("div");
  painel.id = "simulador";
  const titulo = document.createElement("strong");
  titulo.textContent = "Simulador";
  painel.appendChild(titulo);

  // Comentário digitado (para testar "rata", "rato" e o número da música do DJ).
  const linhaComentario = document.createElement("div");
  linhaComentario.className = "linha-comentario";
  const campo = document.createElement("input");
  campo.type = "text";
  campo.maxLength = 60;
  campo.placeholder = "Escreva um comentário...";
  const botaoAlguem = document.createElement("button");
  botaoAlguem.textContent = "Enviar";
  const botaoDJ = document.createElement("button");
  botaoDJ.textContent = "Como DJ";
  function comentarDigitado(comoDJ) {
    const texto = campo.value.trim();
    if (!texto) return;
    const dj = Balada.djAtual && Balada.djAtual();
    const usuario = comoDJ && dj ? { id: dj.id, nome: dj.nome, foto: null } : alguem(0.3);
    enviar({ tipo: "comentario", usuario, texto });
    campo.value = "";
  }
  botaoAlguem.addEventListener("click", () => comentarDigitado(false));
  botaoDJ.addEventListener("click", () => comentarDigitado(true));
  campo.addEventListener("keydown", (e) => e.key === "Enter" && comentarDigitado(false));
  linhaComentario.append(campo, botaoAlguem, botaoDJ);
  painel.appendChild(linhaComentario);

  const grade = document.createElement("div");
  grade.className = "grade";
  for (const [texto, acao] of BOTOES) {
    const b = document.createElement("button");
    b.textContent = texto;
    b.addEventListener("click", acao);
    grade.appendChild(b);
  }
  const botaoAuto = document.createElement("button");
  botaoAuto.id = "botao-auto";
  botaoAuto.textContent = "A  Automático: desligado";
  botaoAuto.addEventListener("click", alternarAutomatico);
  grade.appendChild(botaoAuto);
  painel.appendChild(grade);
  document.body.appendChild(painel);

  // Botão redondo que abre/fecha o painel (bom para o celular).
  const botaoPainel = document.createElement("button");
  botaoPainel.id = "abrir-simulador";
  botaoPainel.title = "Abrir/fechar o simulador (tecla H)";
  document.body.appendChild(botaoPainel);
  function alternarPainel(mostrar) {
    const aberto = mostrar === undefined ? painel.classList.contains("escondido") : mostrar;
    painel.classList.toggle("escondido", !aberto);
    botaoPainel.textContent = aberto ? "✕" : "🎮";
  }
  botaoPainel.addEventListener("click", () => alternarPainel());
  // No celular começa fechado, para ver a balada inteira.
  alternarPainel(!window.matchMedia("(max-width: 700px)").matches);

  const parametros = new URLSearchParams(window.location.search);
  if (parametros.has("live")) {
    painel.classList.add("escondido");
    botaoPainel.classList.add("escondido");
  }
  if (parametros.has("auto")) alternarAutomatico();
})();
