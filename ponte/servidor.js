// =============================================================
// PONTE: liga a sua live do TikTok ao jogo.
//
// 1) Abre o jogo num endereço do seu PC: http://localhost:8080
//    (é esse link que vai no TikTok LIVE Studio ou no OBS).
// 2) Conecta na sua live com a biblioteca tiktok-live-connector
//    (usando a sua chave da Euler Stream).
// 3) Cada comentário, curtida, seguida, compartilhamento e presente
//    vira um evento que é mandado para o jogo na hora.
//
// Configuração: arquivo ".env" nesta pasta (veja ".env.exemplo").
// Iniciar: dois cliques em "iniciar.bat"  (ou: npm start)
// Testar sem live: "iniciar-demo.bat"     (ou: npm run demo)
// =============================================================
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection, WebcastEvent, ControlEvent, UserOfflineError } from "tiktok-live-connector";

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_JOGO = resolve(AQUI, "..");

// ---------- Configuração (.env) ----------
const ARQUIVO_ENV = join(AQUI, ".env");
if (existsSync(ARQUIVO_ENV)) process.loadEnvFile(ARQUIVO_ENV);
const USUARIO = (process.env.TIKTOK_USUARIO || "").replace(/^@/, "").trim();
const CHAVE_EULER = (process.env.EULER_API_KEY || "").trim();
const PORTA = Number(process.env.PORTA) || 8080;
const MODO_DEMO = process.argv.includes("--demo");

const hora = () => new Date().toLocaleTimeString("pt-BR");
const log = (texto) => console.log(`[${hora()}] ${texto}`);

// ---------- Servidor de arquivos (o jogo) ----------
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

// Nunca entregar a pasta da ponte (tem a sua chave no .env), node_modules ou arquivos ocultos.
function caminhoPermitido(caminho) {
  const rel = relative(PASTA_JOGO, caminho);
  if (!rel || rel.startsWith("..") || resolve(PASTA_JOGO, rel) !== caminho) return false;
  const partes = rel.split(sep);
  if (partes[0] === "ponte" || partes.includes("node_modules")) return false;
  return !partes.some((p) => p.startsWith("."));
}

const servidor = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    let nome = decodeURIComponent(url.pathname);
    if (nome === "/") nome = "/index.html";
    const caminho = resolve(PASTA_JOGO, "." + nome);
    const tipo = TIPOS[extname(caminho).toLowerCase()];
    if (!tipo || !caminhoPermitido(caminho) || !existsSync(caminho)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Não encontrado");
      return;
    }
    const conteudo = await readFile(caminho);
    res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : conteudo);
  } catch {
    res.writeHead(400).end();
  }
});

// ---------- Canal com o jogo (WebSocket em /eventos) ----------
const canal = new WebSocketServer({ server: servidor, path: "/eventos" });
let ultimoStatus = "iniciando...";

function enviarParaJogo(mensagem) {
  const texto = JSON.stringify(mensagem);
  for (const cliente of canal.clients) {
    if (cliente.readyState === 1) cliente.send(texto);
  }
}

function status(texto) {
  ultimoStatus = texto;
  log(texto);
  enviarParaJogo({ tipo: "status", texto });
}

canal.on("connection", (cliente) => {
  log("O jogo abriu e se conectou na ponte.");
  cliente.send(JSON.stringify({ tipo: "status", texto: ultimoStatus }));
});

// ---------- Tradução: evento do TikTok -> evento do jogo ----------
function pessoa(u) {
  if (!u) return null;
  const id = u.displayId || u.uniqueId || u.id || u.userId;
  if (!id) return null;
  const foto =
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    u.profilePictureUrl ||
    u.profilePicture?.url?.[0] ||
    null;
  return { id: String(id), nome: u.nickname || u.displayId || u.uniqueId || String(id), foto };
}

// Guarda um exemplo de cada tipo de evento (ajuda a corrigir se o TikTok mudar o formato).
const exemplos = {};
function guardarExemplo(tipo, dados) {
  if (exemplos[tipo]) return;
  try {
    exemplos[tipo] = JSON.parse(JSON.stringify(dados, (_, v) => (typeof v === "bigint" ? String(v) : v)));
    writeFileSync(join(AQUI, "exemplos-eventos.json"), JSON.stringify(exemplos, null, 2));
  } catch {
    // não é importante
  }
}

function mandar(evento) {
  if (!evento.usuario) return;
  enviarParaJogo(evento);
}

function ligarEventos(conexao) {
  conexao.on(WebcastEvent.CHAT, (d) => {
    guardarExemplo("comentario", d);
    mandar({ tipo: "comentario", usuario: pessoa(d.user), texto: d.content ?? d.comment ?? "" });
  });

  conexao.on(WebcastEvent.LIKE, (d) => {
    guardarExemplo("curtida", d);
    mandar({ tipo: "curtida", usuario: pessoa(d.user), quantidade: Number(d.count ?? d.likeCount) || 1 });
  });

  conexao.on(WebcastEvent.FOLLOW, (d) => {
    guardarExemplo("seguir", d);
    mandar({ tipo: "seguir", usuario: pessoa(d.user) });
  });

  conexao.on(WebcastEvent.SHARE, (d) => {
    guardarExemplo("compartilhar", d);
    mandar({ tipo: "compartilhar", usuario: pessoa(d.user) });
  });

  conexao.on(WebcastEvent.GIFT, (d) => {
    guardarExemplo("presente", d);
    const g = d.gift || d.giftDetails || {};
    const extra = d.extendedGiftInfo || {};
    // Presentes em combo (ex.: várias rosas seguidas) chegam várias vezes.
    // Só contamos quando o combo termina, com a quantidade final.
    const tipoPresente = Number(g.type ?? g.giftType ?? extra.type);
    const terminou = d.repeatEnd === true || d.repeatEnd === 1;
    if (tipoPresente === 1 && !terminou) return;

    const moedas = Number(g.diamondCount ?? extra.diamond_count ?? extra.diamondCount) || 1;
    const quantidade = Number(d.repeatCount) || 1;
    const nomePresente = g.name || g.giftName || extra.name || "presente";
    const evento = { tipo: "presente", usuario: pessoa(d.user), nomePresente, moedas, quantidade };
    log(`Presente: ${evento.usuario?.nome} mandou ${quantidade}x ${nomePresente} (${moedas} moedas cada)`);
    mandar(evento);
  });

  conexao.on(WebcastEvent.STREAM_END, () => {
    status("A live acabou. Quando você abrir outra, eu conecto sozinho.");
    reconectarEm(60);
  });

  conexao.on(ControlEvent.DISCONNECTED, ({ reason } = {}) => {
    status(`Desconectou da live${reason ? ` (${reason})` : ""}. Tentando de novo em 15 s...`);
    reconectarEm(15);
  });

  conexao.on(ControlEvent.ERROR, ({ info, exception } = {}) => {
    log(`Aviso da biblioteca: ${info || ""} ${exception?.message || ""}`);
  });
}

// ---------- Conexão com a live ----------
let conexaoAtual = null;
let temporizador = null;

function reconectarEm(segundos) {
  clearTimeout(temporizador);
  temporizador = setTimeout(conectarTikTok, segundos * 1000);
}

async function conectarTikTok() {
  if (!USUARIO) {
    status("Falta o seu usuário: escreva TIKTOK_USUARIO no arquivo .env da pasta ponte.");
    return;
  }
  if (conexaoAtual) {
    conexaoAtual.removeAllListeners();
    try {
      conexaoAtual.disconnect();
    } catch {
      // já estava desconectada
    }
  }
  conexaoAtual = new TikTokLiveConnection(USUARIO, {
    signApiKey: CHAVE_EULER || undefined,
    processInitialData: false, // não repetir comentários antigos
    enableExtendedGiftInfo: true, // nome e valor dos presentes
  });
  ligarEventos(conexaoAtual);

  try {
    status(`Conectando na live de @${USUARIO}...`);
    await conexaoAtual.connect();
    status(`Conectado na live de @${USUARIO}!`);
  } catch (erro) {
    if (erro instanceof UserOfflineError || /offline|not live/i.test(String(erro?.message))) {
      status(`@${USUARIO} ainda não está ao vivo. Tento de novo em 60 s.`);
    } else {
      status(`Não consegui conectar: ${erro?.message || erro}. Tento de novo em 60 s.`);
    }
    reconectarEm(60);
  }
}

// ---------- Modo demonstração (testar sem estar ao vivo) ----------
function iniciarDemo() {
  status("MODO DEMO: eventos de mentira, sem TikTok.");
  const nomes = ["Demo_Ana", "Demo_Beto", "Demo_Caio", "Demo_Duda", "Demo_Enzo", "Demo_Fê"];
  const presentes = [
    ["Rosa", 1],
    ["Coração", 5],
    ["Rosquinha", 30],
    ["Mãos de coração", 100],
    ["Galáxia", 1000],
  ];
  let n = 0;
  setInterval(() => {
    n++;
    const nome = nomes[n % nomes.length];
    const usuario = { id: nome, nome, foto: null };
    const sorteio = Math.random();
    if (sorteio < 0.5) mandar({ tipo: "comentario", usuario, texto: n % 7 === 0 ? "rata" : "oi da ponte!" });
    else if (sorteio < 0.8) mandar({ tipo: "curtida", usuario, quantidade: 15 });
    else {
      const [nomePresente, moedas] = presentes[Math.floor(Math.random() * (Math.random() < 0.9 ? 3 : 5))];
      mandar({ tipo: "presente", usuario, nomePresente, moedas, quantidade: 1 });
    }
  }, 900);
}

// ---------- Ligar tudo ----------
servidor.listen(PORTA, "127.0.0.1", () => {
  console.log("");
  console.log("  =============================================");
  console.log("   BALADA DOS RATOS - ponte com o TikTok");
  console.log(`   Jogo:          http://localhost:${PORTA}`);
  console.log(`   Para a live:   http://localhost:${PORTA}/?live`);
  console.log("   Para fechar: feche esta janela (ou Ctrl+C)");
  console.log("  =============================================");
  console.log("");
  if (MODO_DEMO) iniciarDemo();
  else {
    if (!CHAVE_EULER) log("Aviso: sem EULER_API_KEY no .env. Pode funcionar, mas com limites menores.");
    conectarTikTok();
  }
});

servidor.on("error", (erro) => {
  if (erro.code === "EADDRINUSE") {
    log(`A porta ${PORTA} já está em uso. Feche a outra janela da ponte ou mude PORTA no .env.`);
  } else {
    log(`Erro no servidor: ${erro.message}`);
  }
  process.exit(1);
});
