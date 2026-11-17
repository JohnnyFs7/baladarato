# Balada dos Ratos: jogo interativo para live do TikTok

Cada pessoa da live vira um rato (ou rata) que dança na pista. Comentários, curtidas,
quem segue e presentes fazem coisas acontecerem na tela. O maior apoiador vira o DJ
e escolhe a música.

## Duas formas de abrir

| Para quê | Como |
|---|---|
| **Testar / mexer no jogo** | Dois cliques em `index.html`. Use o simulador (teclas abaixo). |
| **Testar a ligação com o TikTok sem estar ao vivo** | Dois cliques em `ponte/iniciar-demo.bat`. |
| **Na live de verdade** | Dois cliques em `ponte/iniciar.bat` (veja "Fazer a live"). |

Truques no endereço: `?auto` liga o modo automático do simulador e `?live` esconde
o painel e os avisos (é assim que vai na transmissão).

O navegador só deixa tocar som depois de um clique: se aparecer o botão
**"Clique para ligar o som"**, clique nele.

## Fazer a live

1. **Primeira vez:** dê dois cliques em `ponte/iniciar.bat`. Ele instala o que falta e
   abre o arquivo `.env` no Bloco de Notas. Preencha:
   - `TIKTOK_USUARIO=` seu usuário, sem o @
   - `EULER_API_KEY=` sua chave da Euler Stream
   Salve, feche e dê dois cliques em `iniciar.bat` de novo.
   **Nunca mande o `.env` para ninguém:** ele tem a sua chave.
2. Deixe a janela preta da ponte aberta (fechar = desligar). Ela mostra o que está
   acontecendo, por exemplo "ainda não está ao vivo, tento de novo em 60 s".
3. No **TikTok LIVE Studio**: Adicionar fonte → **Link** → `http://localhost:8080/?live`,
   tamanho **1080 × 1920**. Confira se o áudio dessa fonte não está mudo.
   (No OBS: fonte "Navegador", mesmo endereço e tamanho.)
4. Comece a live. A ponte conecta sozinha em até 1 minuto.

Se algo não funcionar na primeira live: a ponte salva um exemplo de cada tipo de
evento em `ponte/exemplos-eventos.json`. Com ele dá para ajustar o código se o TikTok
tiver mudado o formato dos dados.

## Simulador (teclas)

| Tecla | O que finge |
|---|---|
| C | Alguém comenta |
| L | 25 curtidas |
| F | Alguém segue |
| S | Alguém compartilha |
| R / T | Alguém comenta "rata" / "rato" |
| 1 a 5 | Os presentes do cardápio (1 = Rosa ... 5 = Galáxia) |
| M | O DJ escolhe uma música |
| P | Próxima música |
| N | 10 pessoas entram de uma vez |
| A | Liga/desliga o modo automático |
| H | Esconde/mostra o painel |

## O que cada coisa da live faz

| Na live | No jogo |
|---|---|
| Qualquer interação de alguém novo | Um rato com o nome e a foto da pessoa entra na pista |
| Comentário | Balão de fala em cima do rato |
| Comentar **rata** (ou menina) | Vira rata: laço, cílios e bochecha rosada |
| Comentar **rato** (ou menino) | Volta a ser rato |
| Curtidas | A barra de **HYPE** enche. Cheia (300) = **DROP!** com lasers e confete |
| Seguir | Coroa VIP dourada e holofote |
| Compartilhar | O rato dá um giro |

No máximo 40 ratos (sai quem está parado há mais tempo); quem fica 10 minutos sem
interagir vai embora. Quem está no pódio nunca sai.

### Presentes: efeito na hora (pelo valor do presente)

| Valor | Efeito |
|---|---|
| 1 a 9 moedas | O rato gira com brilhos |
| 10 a 99 | O rato fica **GIGANTE** por 15 s |
| 100 a 999 | Fogos de artifício e holofote |
| 1000+ | **Bolas gigantes caem do céu**, como em show: a galera levanta os braços e rebate |

Presentes em combo (várias rosas seguidas) contam quando o combo termina.

### Roupas: o cardápio (embaixo da tela)

Conta o **total de moedas** que a pessoa já mandou na live, e as roupas **se somam**:
quem chega a 30 moedas está de óculos + cordão + tênis.

| Total na live | Presente de exemplo | Ganha |
|---|---|---|
| 1 moeda | Rosa | Óculos escuros |
| 5 | Coração | Cordão de ouro |
| 30 | Rosquinha | Tênis vermelho |
| 100 | Mãos de coração | Jaqueta de couro |
| 1.000 | Galáxia | Manto de rei |

**Confira no app do TikTok** o nome e o valor de cada presente e ajuste em
`cardapio`, no `src/config.js`.

### Pódio: o TOP 1 é o DJ

- **TOP 1**: vira o **DJ** na cabine do meio e **escolhe a música**.
- **TOP 2** (esquerda) e **TOP 3** (direita): nos pedestais.

Troca de lugar na hora quando alguém passa na frente. No empate, fica quem chegou
primeiro. Enquanto ninguém mandou presente, toca o "DJ Rato" da casa.
`palco.criterio` no `config.js`: `"total"` (soma de tudo, padrão) ou `"maior"`
(o presente mais caro de uma vez).

### Música

Quando entra um DJ novo, aparece a lista de músicas na tela. O DJ escolhe
**comentando o número** (ex.: `2`, `!2` ou `musica 2`). Só o comentário do DJ vale.
Em cima da tela aparece "♪ música - artista (DJ Fulano)".

O jogo já vem com 4 **batidas da casa** feitas pelo próprio código (funk, anos 80,
anos 90 e house): são originais e não têm problema de direito autoral. Os ratos dançam
no ritmo da música. Para usar arquivos .mp3, veja `musicas/LEIA-ME.md`, que explica
também que tipo de música pode tocar na live.

## Onde mudar as coisas

Quase tudo está em `src/config.js`: cardápio, pódio, músicas, volume, meta de curtidas,
tempos, comandos, cores e textos. Mude, salve e aperte F5.

| Arquivo | O que tem |
|---|---|
| `src/config.js` | Os números e textos que você pode ajustar |
| `src/util.js` | Funções pequenas (sorteio, texto com contorno...) |
| `src/efeitos.js` | Confete, corações, brilhos, fogos e textos que sobem |
| `src/rato.js` | O desenho do rato/rata e das roupas |
| `src/cenario.js` | A balada: globo, pódio, pista, luzes, bolas, HYPE, lista de músicas e menu |
| `src/musica.js` | As batidas da casa, o tocador de .mp3 e o ritmo da dança |
| `src/jogo.js` | As regras e o loop que desenha a tela 60 vezes por segundo |
| `src/conexao.js` | Recebe os eventos da ponte (quando aberto por `localhost:8080`) |
| `src/simulador.js` | Os eventos de mentira (teclas e painel) |
| `ponte/servidor.js` | Liga a live do TikTok ao jogo (biblioteca tiktok-live-connector) |

## O formato dos eventos

Tudo entra por `Balada.receberEvento(evento)`; o simulador e a ponte usam a mesma função:

```js
Balada.receberEvento({ tipo: "comentario", usuario: { id: "123", nome: "Joao", foto: null }, texto: "salve" });
Balada.receberEvento({ tipo: "curtida", usuario: { id: "123", nome: "Joao" }, quantidade: 15 });
Balada.receberEvento({ tipo: "seguir", usuario: { id: "123", nome: "Joao" } });
Balada.receberEvento({ tipo: "compartilhar", usuario: { id: "123", nome: "Joao" } });
Balada.receberEvento({ tipo: "presente", usuario: { id: "123", nome: "Joao" }, nomePresente: "Rosa", moedas: 1, quantidade: 1 });
```

No console do navegador (F12), `Balada.estado()` mostra um resumo.

## Regras do TikTok para lembrar

- Não prometa prêmio, dinheiro ou sorteio em troca de presentes.
- Converse com quem está assistindo; não deixe só o jogo rodando sozinho.
- Só toque música que você tem direito de tocar (veja `musicas/LEIA-ME.md`).
