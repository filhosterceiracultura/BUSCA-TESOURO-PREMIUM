/* ENTRE MUNDOS — JOGO NOVO LIMPO */

const CONFIG = {
  DURACAO_RODADA: 5 * 60,
  MAX_DICAS: 2,
  PONTOS_SEM_DICA: 1000,
  PONTOS_COM_DICA: 800,
  PONTOS_ERRO: -1000
};

const estado = {
  tela: "tela-inicio",
  modo: "individual",
  jogadores: [],
  jogadorAtual: 0,
  rodadaAtual: 1,
  totalRodadas: 1,
  categoriaAtual: "",
  perguntaAtual: null,
  indicePergunta: 0,
  perguntasEmbaralhadas: {},
  progresso: {},
  dicaUsada: false,
  dicasRestantes: CONFIG.MAX_DICAS,
  trocaUsada: false,
  tempoRestante: CONFIG.DURACAO_RODADA,
  intervalo: null,
  respondendo: false,
  categoriaMaisJogada: {}
};

function $(id) {
  return document.getElementById(id);
}

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(tela => tela.classList.remove("ativa"));
  const tela = $(id);
  if (tela) tela.classList.add("ativa");
  estado.tela = id;
}
function abrirModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("oculto");
}

function fecharModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("oculto");
}

function tocarSom(tipo) {
  const arquivos = {
    ok: "som-acerto.mp3",
    erro: "som-erro.mp3",
    final: "som-final.mp3"
  };

  try {
    const audio = new Audio(arquivos[tipo]);
    audio.volume = 0.55;
    audio.play();
  } catch (e) {}
}

function embaralharArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function prepararNovaPartida() {
  estado.perguntasEmbaralhadas = {};
  estado.progresso = {};
  estado.categoriaMaisJogada = {};

  Object.keys(CATEGORIAS).forEach(key => {
    estado.perguntasEmbaralhadas[key] = embaralharArray(perguntasBanco[key] || []);
    estado.progresso[key] = 0;
    estado.categoriaMaisJogada[key] = 0;
  });
}

function resetarRodada() {
  estado.categoriaAtual = "";
  estado.perguntaAtual = null;
  estado.indicePergunta = 0;
  estado.dicaUsada = false;
  estado.dicasRestantes = CONFIG.MAX_DICAS;
  estado.trocaUsada = false;
  estado.tempoRestante = CONFIG.DURACAO_RODADA;
  estado.respondendo = false;
  if (estado.intervalo) clearInterval(estado.intervalo);
  estado.intervalo = null;
}

function jogadorAtual() {
  return estado.jogadores[estado.jogadorAtual] || { nome: "Jogador", pontos: 0, acertos: 0, erros: 0 };
}

function abrirLogin() {
  $("cpf-acesso").value = "";
  $("codigo-acesso").value = "";
  $("erro-login").classList.add("oculto");
  abrirModal("modal-login");
}

function validarLogin() {
  const cpf = $("cpf-acesso").value.trim();
  const codigo = $("codigo-acesso").value.trim();

  if (cpf.length >= 11 && codigo.length >= 4) {
    fecharModal("modal-login");
    mostrarTela("tela-menu");
  } else {
    $("erro-login").classList.remove("oculto");
  }
}

function abrirModoJogo() {
  mostrarTela("tela-modo");
}

function abrirCadastroGrupal() {
  mostrarTela("tela-menu");
  $("nome-j1").value = "";
  $("nome-j2").value = "";
  $("nome-j3").value = "";
  abrirModal("modal-grupal");
}

function iniciarModoIndividual() {
  estado.modo = "individual";
  estado.jogadores = [{ nome: "Jogador", pontos: 0, acertos: 0, erros: 0 }];
  estado.jogadorAtual = 0;
  estado.rodadaAtual = 1;
  estado.totalRodadas = 1;

  prepararNovaPartida();
  resetarRodada();
  mostrarTelaCategorias();
}

function iniciarModoGrupal() {
  const nomes = [$("nome-j1").value.trim(), $("nome-j2").value.trim(), $("nome-j3").value.trim()].filter(Boolean);

  if (nomes.length < 2) {
    alert("Digite o nome de pelo menos 2 jogadores.");
    return;
  }

  estado.modo = "grupal";
  estado.jogadores = nomes.map(nome => ({ nome, pontos: 0, acertos: 0, erros: 0 }));
  estado.jogadorAtual = 0;
  estado.rodadaAtual = 1;
  estado.totalRodadas = estado.jogadores.length;

  prepararNovaPartida();
  resetarRodada();
  fecharModal("modal-grupal");
  mostrarTelaCategorias();
}

function mostrarTelaCategorias() {
  const jogador = jogadorAtual();

  $("nome-jogador-atual").textContent = jogador.nome;
  $("info-rodada").textContent = estado.modo === "grupal"
    ? `Rodada ${estado.rodadaAtual} de ${estado.totalRodadas}`
    : "Escolha uma categoria";

  const grade = $("grade-categorias");
  grade.innerHTML = "";

  Object.entries(CATEGORIAS).forEach(([key, cat]) => {
    const total = (perguntasBanco[key] || []).length;
    const usadas = estado.progresso[key] || 0;
    const restantes = Math.max(0, total - usadas);

    const btn = document.createElement("button");
    btn.className = "btn-categoria";
    btn.dataset.cat = key;
    btn.disabled = restantes <= 0;
    btn.innerHTML = `
      <span class="cat-emoji">${cat.emoji}</span>
      <span class="cat-label">${cat.label}</span>
      <span class="cat-progresso">${restantes} perguntas</span>
    `;
    btn.addEventListener("click", () => iniciarCategoria(key));
    grade.appendChild(btn);
  });

  mostrarTela("tela-categorias");
}


function iniciarCategoria(key) {
  estado.categoriaAtual = key;
  estado.categoriaMaisJogada[key] = (estado.categoriaMaisJogada[key] || 0) + 1;
  estado.dicaUsada = false;

  $("painel-dica").classList.add("oculto");
  $("painel-dica").textContent = "";

  mostrarTela("tela-jogo");
  atualizarHUD();
  mostrarPergunta();
  iniciarCronometro();
}

function mostrarPergunta() {
  const lista = estado.perguntasEmbaralhadas[estado.categoriaAtual] || [];
  const indice = estado.progresso[estado.categoriaAtual] || 0;

  if (indice >= lista.length) {
    alert("Essa categoria terminou. Escolha outra.");
    mostrarTelaCategorias();
    return;
  }

  estado.indicePergunta = indice + 1;
  estado.perguntaAtual = lista[indice];
  estado.respondendo = true;
  estado.dicaUsada = false;

  $("pergunta-numero").textContent = `Pergunta ${estado.indicePergunta}`;
  $("pergunta-texto").textContent = estado.perguntaAtual.t;
  $("painel-dica").classList.add("oculto");
  $("painel-dica").textContent = "";

  const opcoes = $("opcoes");
  opcoes.innerHTML = "";

  estado.perguntaAtual.o.forEach((texto, idx) => {
    const btn = document.createElement("button");
    btn.className = "alternativa";
    btn.textContent = `${String.fromCharCode(65 + idx)}) ${texto}`;
    btn.addEventListener("click", () => checarResposta(idx));
    opcoes.appendChild(btn);
  });

  configurarBotoes();
}

function checarResposta(idx) {
  if (!estado.respondendo || !estado.perguntaAtual) return;

  estado.respondendo = false;

  const correta = estado.perguntaAtual.r;
  const acertou = idx === correta;
  const jogador = jogadorAtual();

  let pontos;

  if (acertou) {
    pontos = estado.dicaUsada ? CONFIG.PONTOS_COM_DICA : CONFIG.PONTOS_SEM_DICA;
    jogador.acertos++;
    tocarSom("ok");
  } else {
    pontos = CONFIG.PONTOS_ERRO;
    jogador.erros++;
    tocarSom("erro");
  }

  jogador.pontos += pontos;

  document.querySelectorAll(".alternativa").forEach((btn, i) => {
    btn.disabled = true;

    if (i === correta) btn.classList.add("correta");
    if (i === idx && !acertou) btn.classList.add("errada");
  });

  estado.progresso[estado.categoriaAtual] = (estado.progresso[estado.categoriaAtual] || 0) + 1;

  atualizarHUD();

  $("feedback-icone").textContent = acertou ? "✅" : "❌";
  $("feedback-msg").textContent = acertou ? "Resposta correta!" : "Resposta incorreta";
  $("feedback-pts").textContent = `${pontos > 0 ? "+" : ""}${pontos} pontos`;

  abrirModal("modal-feedback");
}

function proximaPergunta() {
  fecharModal("modal-feedback");

  if (estado.tempoRestante <= 0) {
    finalizarRodada();
    return;
  }

  mostrarPergunta();
}

function usarDica() {
  if (!estado.perguntaAtual || estado.dicasRestantes <= 0 || estado.dicaUsada) return;

  estado.dicaUsada = true;
  estado.dicasRestantes--;

  $("painel-dica").textContent = `💡 ${estado.perguntaAtual.d}`;
  $("painel-dica").classList.remove("oculto");

  configurarBotoes();
}

function trocarCategoria() {
  if (estado.trocaUsada) return;

  estado.trocaUsada = true;
  mostrarTelaCategorias();
}


function configurarBotoes() {
  $("dicas-restantes").textContent = `(${estado.dicasRestantes})`;
  $("btn-dica").disabled = estado.dicasRestantes <= 0 || estado.dicaUsada;
  $("btn-trocar").disabled = estado.trocaUsada;
}

function atualizarHUD() {
  const jogador = jogadorAtual();
  const cat = CATEGORIAS[estado.categoriaAtual] || { label: "Categoria" };
  $("hud-jogador").textContent = jogador.nome;
  $("hud-pontos").textContent = `${jogador.pontos} pts`;
  $("hud-categoria").textContent = cat.label;
  $("hud-acertos").textContent = `✅ ${jogador.acertos} ❌ ${jogador.erros}`;
}

function iniciarCronometro() {
  if (estado.intervalo) return;
  atualizarTimer();

  estado.intervalo = setInterval(() => {
    estado.tempoRestante--;
    atualizarTimer();

    if (estado.tempoRestante <= 0) {
      clearInterval(estado.intervalo);
      estado.intervalo = null;
      finalizarRodada();
    }
  }, 1000);
}

function atualizarTimer() {
  const min = Math.floor(estado.tempoRestante / 60);
  const seg = String(estado.tempoRestante % 60).padStart(2, "0");
  $("timer").textContent = `${min}:${seg}`;
}

function finalizarRodada() {
  if (estado.intervalo) clearInterval(estado.intervalo);
  estado.intervalo = null;
  fecharModal("modal-feedback");

  if (estado.modo === "grupal" && estado.jogadorAtual < estado.jogadores.length - 1) {
    estado.jogadorAtual++;
    estado.rodadaAtual++;
    resetarRodada();
    mostrarTelaCategorias();
  } else {
    mostrarResultadoFinal();
  }
}

function mostrarResultadoFinal() {
  const ordenados = [...estado.jogadores].sort((a, b) => b.pontos - a.pontos);
  $("resultado-titulo").textContent = estado.modo === "grupal" ? "🏆 Ranking Final" : "🏆 Resultado Final";

  const corpo = $("resultado-corpo");
  corpo.innerHTML = "";

  ordenados.forEach((jogador, i) => {
    const item = document.createElement("div");
    item.className = "ranking-item";
    item.innerHTML = `<strong>${i + 1}. ${jogador.nome}</strong><span>${jogador.pontos} pts — ✅ ${jogador.acertos} ❌ ${jogador.erros}</span>`;
    corpo.appendChild(item);
  });

  mostrarTela("tela-resultado");
  tocarSom("ok");
}

function reiniciarJogo() {
  estado.jogadores.forEach(j => {
    j.pontos = 0;
    j.acertos = 0;
    j.erros = 0;
  });
  estado.jogadorAtual = 0;
  estado.rodadaAtual = 1;
  prepararNovaPartida();
  resetarRodada();
  mostrarTelaCategorias();
}

function voltarMenuPrincipal() {
  if (estado.intervalo) clearInterval(estado.intervalo);
  fecharModal("modal-feedback");
  mostrarTela("tela-menu");
}

function sairParaInicio() {
  if (estado.intervalo) clearInterval(estado.intervalo);
  document.querySelectorAll(".modal").forEach(m => m.classList.add("oculto"));
  mostrarTela("tela-inicio");
}

document.addEventListener("DOMContentLoaded", () => {
  $("btn-iniciar").addEventListener("click", abrirLogin);
  $("btn-login-entrar").addEventListener("click", validarLogin);
  $("btn-entrar-jogo").addEventListener("click", abrirModoJogo);
  $("btn-voltar-menu-modo").addEventListener("click", () => mostrarTela("tela-menu"));
  $("btn-regras").addEventListener("click", () => abrirModal("modal-regras"));
  $("btn-sair").addEventListener("click", sairParaInicio);
  $("btn-individual").addEventListener("click", iniciarModoIndividual);
  $("btn-grupal").addEventListener("click", abrirCadastroGrupal);
  $("btn-iniciar-grupal").addEventListener("click", iniciarModoGrupal);
  $("btn-dica").addEventListener("click", usarDica);
  $("btn-trocar").addEventListener("click", trocarCategoria);
  $("btn-sair-jogo").addEventListener("click", sairParaInicio);
  $("btn-proxima").addEventListener("click", proximaPergunta);
  $("btn-jogar-novamente").addEventListener("click", reiniciarJogo);
  $("btn-menu-final").addEventListener("click", voltarMenuPrincipal);

  document.querySelectorAll("[data-fechar]").forEach(btn => {
    btn.addEventListener("click", () => fecharModal(btn.dataset.fechar));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("modal-login").classList.contains("oculto")) {
      validarLogin();
    }
  });
});
