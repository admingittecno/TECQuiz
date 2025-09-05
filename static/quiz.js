// --- Estado ---
let perguntas = [];
let perguntasSelecionadas = [];
let perguntaAtual = 0;
let acertos = 0;
let timer = null;
let tempoRestante = 30;

// Dados do cadastro
let cadastro = {
  nome: "",
  empresa: "",
  cargo: "",
  email: "",
  telefone: "",
  promo: false
};

// --- Elementos ---
const versao = "1.4.6"; // Versão do quiz

const startScreen   = document.getElementById("start-screen");
const quizScreen    = document.getElementById("quiz-screen");
const resultScreen  = document.getElementById("result-screen");

const statusMsg     = document.getElementById("status-msg");
const startBtn      = document.getElementById("start-btn");

const questionEl    = document.getElementById("question");
const answersEl     = document.getElementById("answers");
const timerEl       = document.getElementById("timer");
const progressEl    = document.getElementById("progress");

const resultTextEl  = document.getElementById("result-text");
const playAgainBtn  = document.getElementById("play-again");
const backHomeBtn   = document.getElementById("back-home");

// ==== Termo de Consentimento (modal + aceite) ====
const abrirTermoBtn = document.getElementById('abrir-termo');
const modalTermo    = document.getElementById('modal-termo');
const fecharTermo   = document.getElementById('fechar-termo');
const fecharTermoBg = document.getElementById('fechar-termo-bg');
const fecharRodape  = document.getElementById('fechar-termo-rodape');
const aceitarTermo  = document.getElementById('aceitar-termo');
const aceiteCheck   = document.getElementById('aceite-termo');


// --- Util ---
const hidden = el => el.classList.add("hidden");
const show   = el => el.classList.remove("hidden");





function embaralhar(array){
  // Fisher–Yates
  const a = array.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function selecionar5Perguntas(){
  const pool = embaralhar(perguntas);
  return pool.slice(0, Math.min(5, pool.length));
}

// --- Carregar perguntas ---
async function carregarPerguntas(){
  // Aviso se estiver rodando via file://
  if (location.protocol === "file:"){
    show(statusMsg);
    statusMsg.textContent = "Dica: abra com Live Server no VSCode (fetch de JSON não funciona com file://).";
  }
  try{
    const resp = await fetch("/static/perguntas.json", { cache: "no-store" });
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    perguntas = await resp.json();

    if(!Array.isArray(perguntas) || perguntas.length === 0){
      throw new Error("JSON vazio ou inválido.");
    }
  }catch(err){
    // Fallback mínimo para não travar a demo
    show(statusMsg);
    statusMsg.textContent = "Não foi possível carregar 'perguntas.json'. Usando perguntas de fallback.";
    perguntas = [
      { pergunta:"Fallback: capital do Brasil?", respostas:["RJ","Brasília","SP","BH"], correta:1 },
      { pergunta:"Fallback: símbolo do Ferro?", respostas:["Fe","Ir","Pb","Cu"], correta:0 },
      { pergunta:"Fallback: fórmula da água?", respostas:["H2","O2","H2O","HO2"], correta:2 },
      { pergunta:"Fallback: planeta vermelho?", respostas:["Marte","Vênus","Mercúrio","Júpiter"], correta:0 },
      { pergunta:"Fallback: ano da Lua?", respostas:["1965","1969","1972","1975"], correta:1 }
    ];
  }
}

// --- Fluxo do jogo ---
function iniciarQuiz(){
  hidden(startScreen);
  show(quizScreen);

  perguntasSelecionadas = selecionar5Perguntas();
  perguntaAtual = 0;
  acertos = 0;

  mostrarPergunta();
}

function mostrarPergunta(){
  limparTimer();
  const p = perguntasSelecionadas[perguntaAtual];

  progressEl.textContent = `Pergunta ${perguntaAtual+1}/${perguntasSelecionadas.length}`;
  questionEl.textContent = p.pergunta;

  answersEl.innerHTML = "";
  p.respostas.forEach((texto, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = texto;
    btn.onclick = () => verificarResposta(idx, btn);
    answersEl.appendChild(btn);
  });

  tempoRestante = 30;
  timerEl.textContent = `Tempo: ${tempoRestante}s`;
  iniciarTimer();
}

function iniciarTimer(){
  limparTimer();
  timer = setInterval(() => {
    tempoRestante--;
    timerEl.textContent = `Tempo: ${tempoRestante}s`;
    if (tempoRestante <= 0){
      limparTimer();
      verificarResposta(-1, null); // tempo esgotado, conta como erro
    }
  }, 1000);
}

function limparTimer(){
  if (timer){
    clearInterval(timer);
    timer = null;
  }
}

function verificarResposta(indiceEscolhido, btnClicado){
  limparTimer();

  const p = perguntasSelecionadas[perguntaAtual];
  const botoes = Array.from(answersEl.querySelectorAll(".option"));

  // Desabilita tudo
  botoes.forEach(b => b.disabled = true);

  if (indiceEscolhido === p.correta){
    acertos++;
    if (btnClicado) btnClicado.classList.add("correct");
    else botoes[p.correta].classList.add("correct"); // caso tempo esgote sem clique
  } else {
    if (btnClicado) btnClicado.classList.add("wrong");
    botoes[p.correta].classList.add("correct");
  }

  // Pausa breve para o usuário ver o feedback
  setTimeout(() => {
    perguntaAtual++;
    if (perguntaAtual < perguntasSelecionadas.length){
      mostrarPergunta();
    } else {
      finalizarQuiz();
    }
  }, 1200);
}

function enviarParaForms(nome, empresa, cargo, email, telefone, promo, acertos){
  // --- Envia para Google Forms ---
  const formURL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSdqP6PJmmrzDglGUHbT88BzlqpKc0Kf3jkh8KZMFzghiarLYQ/formResponse";
  const formData = new FormData();
  formData.append("entry.256952764", nome);
  formData.append("entry.2095918796", empresa);
  formData.append("entry.1632623222", cargo);
  formData.append("entry.1737381222", email);
  formData.append("entry.1913146510",telefone);
  formData.append('entry.693821394', promo ? "Sim" : "Não");
  formData.append("entry.2107464986", acertos);

  fetch(formURL, {
    method: "POST",
    body: formData,
    mode: "no-cors"

  }).then(() => {
    // Google não responde JSON (no-cors), mas já salva
    msg.textContent = "";
    iniciarQuiz(); // inicia quiz normalmente
  }).catch(err => {
    msg.textContent = "⚠ Erro ao salvar cadastro.";
    console.error(err);
  });
  
}

function finalizarQuiz(){
  hidden(quizScreen);
  show(resultScreen);

  // Envia os dados do cadastro junto com a pontuação
  enviarParaForms(cadastro.nome, cadastro.empresa, cadastro.cargo, cadastro.email,cadastro.telefone, cadastro.promo, acertos);

  if (acertos === perguntasSelecionadas.length){
    resultTextEl.innerHTML = `🎉 Parabéns!!!<br> <br>Você acertou ${acertos}/${perguntasSelecionadas.length} <br> Escolha seu brinde,<br> E boa sorte no sorteio!<br>`;
  } else {
    resultTextEl.innerHTML = `Que pena 😭<br>Você acertou ${acertos}/${perguntasSelecionadas.length}.<br>Tente novamente!`;
  }
}

// abre modal
function abrirModal(){ modalTermo.hidden = false; document.body.style.overflow='hidden'; }
// fecha modal
function fecharModal(){ modalTermo.hidden = true; document.body.style.overflow=''; }




// --- Controles ---

// Atualiza todos os elementos com a classe .version
document.querySelectorAll(".version").forEach(el => {
  el.textContent = versao;
});


document.getElementById("telefone").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos

  // Aplica a máscara dinamicamente
  if (value.length <= 2) {
    value = `(${value}`; // Adiciona o parêntese ao DDD
  } else if (value.length <= 7) {
    value = `(${value.slice(0, 2)})${value.slice(2)}`; // Adiciona o parêntese e mantém os primeiros 7 dígitos
  } else {
    value = `(${value.slice(0, 2)})${value.slice(2, 7)}-${value.slice(7, 11)}`; // Adiciona o hífen após o quinto dígito
  }

  e.target.value = value.slice(0, 14); // Limita o valor ao formato completo
});


startBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  // --- Validação do cadastro ---
  const nome   = document.getElementById("nome").value.trim();
  const empresa= document.getElementById("empresa").value.trim();
  const cargo  = document.getElementById("cargo").value;
  const email  = document.getElementById("email").value.trim();
  const telefone  = document.getElementById("telefone").value.trim();
  const promo  = document.getElementById("promo").checked;
  const msg    = document.getElementById("cadastro-msg");

  if(!nome || !empresa || !cargo || !email || !telefone){
    msg.textContent = "⚠ Preencha todos os campos antes de começar.";
    return;
  }

  if (aceiteCheck && !aceiteCheck.checked){
    //show(statusMsg);
    msg.textContent = "⚠ Você precisa aceitar o Termo de Consentimento para começar.";
    return;
  }
  // Armazena os dados no objeto global
  cadastro = { nome, empresa, cargo, email, telefone, promo };

  // --- Inicia o quiz normalmente ---
  if (perguntas.length === 0) {
    await carregarPerguntas();
  }
  iniciarQuiz();
});

playAgainBtn.addEventListener("click", () => {
  hidden(resultScreen);
  show(quizScreen);
  perguntasSelecionadas = selecionar5Perguntas();
  perguntaAtual = 0;
  acertos = 0;
  mostrarPergunta();
});

backHomeBtn.addEventListener("click", () => {
  hidden(resultScreen);
  show(startScreen);
});


// wire
abrirTermoBtn?.addEventListener('click', abrirModal);
fecharTermo?.addEventListener('click', fecharModal);
fecharTermoBg?.addEventListener('click', fecharModal);
fecharRodape?.addEventListener('click', fecharModal);

// botão "Aceito o termo" dentro do modal marca o checkbox e fecha
//aceitarTermo?.addEventListener('click', () => {
//  if (aceiteCheck) aceiteCheck.checked = true;
//  fecharModal();
//});
//
//// (opcional) impedir início do quiz se checkbox não estiver marcado
//// Basta manter este guard no seu listener do botão Start:
//const originalStartHandler = async (e) => {
//  // Validação de aceite do termo:
//  if (aceiteCheck && !aceiteCheck.checked){
//    show(statusMsg);
//    statusMsg.textContent = "⚠ Você precisa aceitar o Termo de Consentimento para começar.";
//    return;
//  }
//
//  // carrega perguntas se necessário e inicia:
//  if (perguntas.length === 0) await carregarPerguntas();
//  iniciarQuiz();
//};

// substitui seu handler anterior do startBtn
//startBtn.replaceWith(startBtn.cloneNode(true)); // remove handlers antigos sem quebrar estilo
//const newStartBtn = document.getElementById('start-btn') || document.querySelector('#start-screen #start-btn');
//newStartBtn.addEventListener('click', async (e) => {
//  e.preventDefault();
//  // SE você já tem validação de cadastro aqui, mantenha-a ANTES deste guard.
//  await originalStartHandler(e);
//});


// Pré-carrega perguntas ao abrir (mostra tela inicial mesmo se falhar)
carregarPerguntas();
//hidden(startScreen);
//hidden(quizScreen);
//finalizarQuiz();