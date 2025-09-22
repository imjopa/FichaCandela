import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase (APENAS AQUI)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById('fichaForm');
const listaFichas = document.getElementById('listaFichas');
const btnNovaFicha = document.getElementById('btnNovaFicha');

// Certifique-se de que o ID do botão de salvar no HTML é 'btnSalvarFichaForm' ou ajuste aqui
const logoutBtn = document.getElementById('logoutBtn'); // Obtenha o botão de logout aqui

const modalSucesso = document.getElementById('modalSucesso');
const fecharModalSucessoBtn = document.getElementById('fecharModalSucesso');
const btnOkSucesso = document.getElementById('btnOkSucesso');
const mensagemSucesso = document.getElementById('mensagemSucesso');


let currentUser = null;
let fichaSelecionadaId = null;
let resistencias = {
  corpo: [],
  astucia: [],
  intuicao: []
}; // Objeto para resistências por atributo
console.log('SCRIPT INICIADO: fichaSelecionadaId =', fichaSelecionadaId);

// --- Funções de Limpeza e Preenchimento do Formulário ---

function limparFormulario() {
  console.log('limparFormulario() chamado. fichaSelecionadaId ANTES:', fichaSelecionadaId);
  form.reset(); // Reseta todos os campos do formulário
  fichaSelecionadaId = null; // Garante que não há ficha selecionada
  // Limpar campos dinâmicos ou específicos
  document.querySelector('textarea[name="papelDescricao"]').value = '';
  document.querySelector('textarea[name="especialidade"]').value = '';
  document.querySelector('.subsection.notas textarea').value = ''; // Corrigido o seletor
  document.querySelector('.subsection.habilidades-circulo textarea').value = ''; // Corrigido o seletor


  // Limpar campos de relacionamento e equipamento
  document.querySelectorAll('.lista-relacionamento input[type="text"]').forEach(input => input.value = '');
  document.querySelectorAll('.lista-equipamento input[type="text"]').forEach(input => input.value = '');
  document.querySelectorAll('.lista-equipamento input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);

  // Resetar marcas e cicatrizes
  inicializarMarcas(); // Recria os checkboxes de marcas com valores padrão
  document.querySelectorAll('.section.cicatrizes input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.section.cicatrizes input[type="text"]').forEach(input => input.value = '');

  // Resetar impulsos e ações
  document.querySelectorAll('.max-impulsos-input').forEach(input => input.value = '1');
  document.querySelectorAll('.checkbox-impulso').forEach(cb => cb.checked = false);
  document.querySelectorAll('.dourado-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('.checkbox-acao').forEach(cb => cb.checked = false);
  inicializarControleMaxImpulsos(); // Re-aplica a lógica de impulsos

  // Resetar resistências por atributo
  resistencias = { corpo: [], astucia: [], intuicao: [] };
  ['corpo', 'astucia', 'intuicao'].forEach(atributo => {
    gerarResistenciasPorAtributo(atributo, 0);
  });

  console.log('limparFormulario() CONCLUÍDO. fichaSelecionadaId AGORA:', fichaSelecionadaId);
}

function resetarCamposFormulario() {
  form.reset();
  // Se precisar limpar campos extras manualmente, faça aqui
  // Exemplo:
  // inputNome.value = '';
  // inputVida.value = '';
  // ...
}

function preencherFormulario(dados) {
  console.log('preencherFormulario() chamado. fichaSelecionadaId ANTES:', fichaSelecionadaId);


  // 1. Dados Gerais
  form.elements['nome'].value = dados.nome || '';
  form.elements['papel'].value = dados.papel || '';
  form.elements['espec'].value = dados.espec || '';
  form.elements['circulo'].value = dados.circulo || '';
  form.elements['plano'].value = dados.plano || '';
  form.elements['religiao'].value = dados.religiao || '';

  // 2. Atributos (Corpo, Astúcia, Intuição)
  ['corpo', 'astucia', 'intuicao'].forEach(attrId => {
    const attrData = dados.atributos && dados.atributos[attrId];
    if (attrData) {
      const atributoDiv = document.getElementById(attrId);

      // Max Impulsos
      const maxImpulsosInput = atributoDiv.querySelector('.max-impulsos-input');
      if (maxImpulsosInput) {
        maxImpulsosInput.value = attrData.maxImpulsos || 1;
        // Chamar a função para atualizar os checkboxes de impulso visíveis/habilitados
        const checkboxesImpulso = atributoDiv.querySelectorAll('.checkbox-impulso');
        atualizarImpulsosPermitidos(checkboxesImpulso, parseInt(maxImpulsosInput.value));
      }

      // Impulsos
      const impulsosCheckboxes = atributoDiv.querySelectorAll('.checkbox-impulso');
      if (attrData.impulsos) {
        attrData.impulsos.forEach((checked, index) => {
          if (impulsosCheckboxes[index]) {
            impulsosCheckboxes[index].checked = checked;
          }
        });
      }

      // Ações (Dourado e Ações normais)
      const douradoCheckboxes = Array.from(atributoDiv.querySelectorAll('input.dourado-checkbox'));
      const acoesCheckboxes = Array.from(atributoDiv.querySelectorAll('input.checkbox-acao'));
      if (attrData.acoes) {
        attrData.acoes.forEach((acaoGroup, groupIndex) => {
          if (douradoCheckboxes[groupIndex]) {
            douradoCheckboxes[groupIndex].checked = acaoGroup.dourado;
          }
          if (acaoGroup.acoes) {
            acaoGroup.acoes.forEach((checked, actionIndex) => {
              const globalIndex = (groupIndex * 7) + actionIndex; // 7 checkboxes por grupo
              if (acoesCheckboxes[globalIndex]) {
                acoesCheckboxes[globalIndex].checked = checked;
              }
            });
          }
        });
      }
    }
  });

  // 3. Habilidades do Papel e Especialidade
  form.elements['papelDescricao'].value = dados.papelDescricao || '';
  form.elements['especialidade'].value = dados.especialidade || '';

  // 4. Marcas
  ['corpo', 'mente', 'sangria'].forEach(categoria => {
    const categoriaDiv = document.querySelector(`.categoria[data-categoria="${categoria}"]`);
    if (categoriaDiv && dados.marcas && dados.marcas[categoria]) {
      const maxMarcasInput = categoriaDiv.querySelector('.max-marcas-input');
      if (maxMarcasInput) {
        maxMarcasInput.value = dados.marcas[categoria].maxMarcas || 3;
        gerarMarcasCategoria(categoriaDiv, parseInt(maxMarcasInput.value)); // Regenera os checkboxes
      }

      const marcasCheckboxes = categoriaDiv.querySelectorAll('.marcas-lista input[type="checkbox"]');
      if (dados.marcas[categoria].marcadas) {
        dados.marcas[categoria].marcadas.forEach((checked, index) => {
          if (marcasCheckboxes[index]) {
            marcasCheckboxes[index].checked = checked;
          }
        });
      }
    }
  });

  // 5. Cicatrizes
  if (dados.cicatrizes) {
    for (let i = 1; i <= 3; i++) {
      const cicatrizData = dados.cicatrizes[`cicatriz_${i}`];
      if (cicatrizData) {
        form.elements[`cicatriz_${i}`].checked = cicatrizData.checked;
        form.elements[`desc_cicatriz_${i}`].value = cicatrizData.descricao || '';
      }
    }
  }

  // 6. Relacionamentos
  if (dados.relacionamentos) {
    const relInputs = document.querySelectorAll('.lista-relacionamento input[type="text"]');
    dados.relacionamentos.forEach((rel, index) => {
      if (relInputs[index]) {
        relInputs[index].value = rel;
      }
    });
  }

  // 7. Equipamento
  if (dados.equipamento) {
    const equipListItems = document.querySelectorAll('.lista-equipamento li');
    dados.equipamento.forEach((item, index) => {
      if (equipListItems[index]) {
        equipListItems[index].querySelector('input[type="checkbox"]').checked = item.checked;
        equipListItems[index].querySelector('input[type="text"]').value = item.descricao || '';
      }
    });
  }

  // 8. Notas e Habilidades de Círculo
  document.querySelector('.subsection.notas textarea').value = dados.notas || '';
  document.querySelector('.subsection.habilidades-circulo textarea').value = dados.habilidadesCirculo || '';

  // 9. Resistências por atributo
  resistencias = dados.resistencias || { corpo: [], astucia: [], intuicao: [] };
  // Recalcula e exibe para cada atributo (garante sincronia com impulsos carregados)
  ['corpo', 'astucia', 'intuicao'].forEach(atributo => {
    atualizarResistenciasPorAtributo(atributo);
  });

  console.log('preencherFormulario() CONCLUÍDO. fichaSelecionadaId AGORA:', fichaSelecionadaId); // Deve ser null aqui
}

// --- Lógica de Resistências por Atributo ---

// Função para gerar os checkboxes de resistência para um atributo específico
function gerarResistenciasPorAtributo(atributo, quantidade) {
  const listaId = `listaResistencias${atributo.charAt(0).toUpperCase() + atributo.slice(1)}`; // ex: listaResistenciasCorpo
  const lista = document.getElementById(listaId);
  if (!lista) return;

  lista.innerHTML = ''; // Limpa a lista existente

  const arrayResistencias = resistencias[atributo];
  for (let i = 0; i < quantidade; i++) {
    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = `resistencia_${atributo}_${i + 1}`;
    checkbox.id = `resistencia_${atributo}_${i + 1}`;
    checkbox.checked = arrayResistencias[i] || false;
    checkbox.addEventListener('change', (e) => {
      arrayResistencias[i] = e.target.checked; // Atualiza o array específico
    });
    li.appendChild(checkbox);
    lista.appendChild(li);
  }
}

   // Função para calcular o número de resistências para um atributo específico
   function calcularResistenciasPorAtributo(atributo) {
     const atributoDiv = document.getElementById(atributo);
     const maxImpulsosInput = atributoDiv.querySelector('.max-impulsos-input');
     if (!maxImpulsosInput) return 0; // Se não encontrar o input, retorna 0

     let maxImpulsos = parseInt(maxImpulsosInput.value);
     if (isNaN(maxImpulsos) || maxImpulsos < 1) maxImpulsos = 1;
     if (maxImpulsos > 9) maxImpulsos = 9; // Limita como no controle de impulsos

     return Math.floor(maxImpulsos / 3); // 1 resistência a cada 3 impulsos máximos
   }
   

   // Função principal para atualizar as resistências de um atributo específico
   function atualizarResistenciasPorAtributo(atributo) {
     const numResistencias = calcularResistenciasPorAtributo(atributo);
     const arrayResistencias = resistencias[atributo];

     if (numResistencias === 0) {
       arrayResistencias.length = 0; // Limpa o array se não houver resistências
     } else {
       // Ajusta o array: adiciona 'false' se necessário, ou trunca se menor
       while (arrayResistencias.length < numResistencias) {
         arrayResistencias.push(false);
       }
       arrayResistencias.length = numResistencias; // Trunca se necessário
     }

     gerarResistenciasPorAtributo(atributo, numResistencias);
   }
   

// Função auxiliar para atualizar TODAS as resistências (usada na inicialização ou load)
function atualizarTodasResistencias() {
  ['corpo', 'astucia', 'intuicao'].forEach(atributo => {
    atualizarResistenciasPorAtributo(atributo);
  });
}

// --- Função auxiliar para impulsos (mova para global) ---
function atualizarImpulsosPermitidos(checkboxes, max) {
  checkboxes.forEach((cb, index) => {
    if (index < max) {
      cb.disabled = false;
      cb.parentElement.style.opacity = '1';
    } else {
      cb.disabled = true;
      cb.checked = false;
      cb.parentElement.style.opacity = '0.4';
    }
  });
}

function inicializarControleMaxImpulsos() {
  const maxImpulsosInputs = document.querySelectorAll('.max-impulsos-input');
  maxImpulsosInputs.forEach(input => {
    const atributo = input.dataset.atributo;
    const checkboxes = document.querySelectorAll(`#${atributo} .checkbox-impulso`);
    input.addEventListener('input', () => {
      let max = parseInt(input.value);
      if (isNaN(max) || max < 1) max = 1;
      if (max > 9) max = 9;
      input.value = max;
      atualizarImpulsosPermitidos(checkboxes, max);
      atualizarResistenciasPorAtributo(atributo); // Atualiza só este atributo
    });
    let max = parseInt(input.value);
    if (isNaN(max) || max < 1) max = 1;
    if (max > 9) max = 9;
    atualizarImpulsosPermitidos(checkboxes, max);

    // Event listener para cada checkbox de impulso (só atualiza o atributo)
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => atualizarResistenciasPorAtributo(atributo));
    });
  });
  atualizarTodasResistencias(); // Inicializa todas as resistências uma vez
}

function gerarMarcasCategoria(categoriaDiv, quantidade) {
  const lista = categoriaDiv.querySelector('.marcas-lista');
  if (!lista) return;

  lista.innerHTML = '';
  for (let i = 0; i < quantidade; i++) {
    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = `${categoriaDiv.dataset.categoria}_marca_${i + 1}`;
    checkbox.id = `${categoriaDiv.dataset.categoria}_marca_${i + 1}`;
    li.appendChild(checkbox);
    lista.appendChild(li);
  }
}

function inicializarMarcas() {
  const categorias = document.querySelectorAll('.categoria');
  categorias.forEach(categoriaDiv => {
    const inputMax = categoriaDiv.querySelector('.max-marcas-input');
    if (!inputMax) return;

    let val = parseInt(inputMax.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 20) val = 20;

    gerarMarcasCategoria(categoriaDiv, val);

    inputMax.addEventListener('input', () => {
      let novoVal = parseInt(inputMax.value);
      if (isNaN(novoVal) || novoVal < 1) novoVal = 1;
      if (novoVal > 20) novoVal = 20;
      inputMax.value = novoVal;
      gerarMarcasCategoria(categoriaDiv, novoVal);
    });
  });
}

// --- Lógica do Simulador de Dados (já existente) ---
const btnSimuladorDados = document.getElementById('btnSimuladorDados');
const menuSimuladorDados = document.getElementById('menuSimuladorDados');

btnSimuladorDados.addEventListener('click', () => {
  if (menuSimuladorDados.style.display === 'none') {
    menuSimuladorDados.style.display = 'flex';
    const rect = btnSimuladorDados.getBoundingClientRect();
    menuSimuladorDados.style.position = 'absolute';
    menuSimuladorDados.style.top = rect.bottom + window.scrollY + 'px';
    menuSimuladorDados.style.left = rect.left + window.scrollX + 'px';
  } else {
    menuSimuladorDados.style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
  if (!btnSimuladorDados.contains(e.target) && !menuSimuladorDados.contains(e.target)) {
    menuSimuladorDados.style.display = 'none';
  }
});

const cicatrizCheckboxes = document.querySelectorAll('.section.cicatrizes input[type="checkbox"]');
cicatrizCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    const checkedCount = Array.from(cicatrizCheckboxes).filter(cb => cb.checked).length;
    if (checkedCount > 3) {
      checkbox.checked = false;
      alert('Você pode marcar no máximo 3 cicatrizes.');
    }
  });
});

function rolarDado(lados) {
  return Math.floor(Math.random() * lados) + 1;
}

function mostrarResultadoDado(valor, ladoDado) {
  const modal = document.getElementById('modalDado');
  const resultadoTexto = document.getElementById('resultadoDado');
  const btnFechar = document.getElementById('fecharModal');

  resultadoTexto.textContent = `O valor do seu dado D${ladoDado} foi: ${valor}`;
  modal.style.display = 'block';

  btnFechar.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

menuSimuladorDados.querySelectorAll('button').forEach(botao => {
  botao.addEventListener('click', () => {
    const lados = parseInt(botao.dataset.lados);
    const resultado = rolarDado(lados);
    mostrarResultadoDado(resultado, lados);
    menuSimuladorDados.style.display = 'none';
  });
});

function mostrarModalSucesso(mensagem) {
  mensagemSucesso.textContent = mensagem;
  modalSucesso.style.display = 'block';
}

function fecharModalSucesso() {
  modalSucesso.style.display = 'none';
}

// Adiciona event listeners para fechar o modal
fecharModalSucessoBtn.addEventListener('click', fecharModalSucesso);
btnOkSucesso.addEventListener('click', fecharModalSucesso);

// Fecha o modal se clicar fora dele
window.addEventListener('click', (event) => {
  if (event.target === modalSucesso) {
    fecharModalSucesso();
  }
});



// --- Funções de Gerenciamento de Fichas (Listar, Carregar, Nova, Salvar) ---

function atualizarDestaqueLista() {
  const itens = listaFichas.querySelectorAll('li');
  itens.forEach(li => {
    li.classList.toggle('selecionada', li.dataset.id === fichaSelecionadaId);
  });
}

async function listarFichas() {
  listaFichas.innerHTML = '';
  if (!currentUser) return;

  const fichasRef = collection(db, 'usuarios', currentUser.uid, 'fichas');
  const q = query(fichasRef, orderBy('nome'));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    listaFichas.innerHTML = '<li><em>Nenhuma ficha encontrada.</em></li>';
    fichaSelecionadaId = null;
    limparFormulario();
    return;
  }

  querySnapshot.forEach(docSnap => {
    const ficha = docSnap.data();
    const li = document.createElement('li');
    li.textContent = ficha.nome || '(Sem nome)';
    li.dataset.id = docSnap.id;
    li.classList.toggle('selecionada', docSnap.id === fichaSelecionadaId);

    li.addEventListener('click', () => carregarFicha(docSnap.id));

    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'X';
    btnExcluir.classList.add('btn-excluir');
    btnExcluir.title = 'Excluir ficha';
    btnExcluir.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Excluir ficha "${ficha.nome || '(Sem nome)'}"?`)) {
        await deleteDoc(doc(db, 'usuarios', currentUser.uid, 'fichas', docSnap.id));
        if (docSnap.id === fichaSelecionadaId) {
          fichaSelecionadaId = null;
          limparFormulario();
        }
        listarFichas();
      }
    });

    li.appendChild(btnExcluir);
    listaFichas.appendChild(li);
  });
}

async function carregarFicha(fichaId) {
  console.log('carregarFicha() chamado para ID:', fichaId, 'fichaSelecionadaId ANTES:', fichaSelecionadaId);

  if (!currentUser) return;

  const fichaRef = doc(db, 'usuarios', currentUser.uid, 'fichas', fichaId);
  const fichaSnap = await getDoc(fichaRef);

  if (fichaSnap.exists()) {
    fichaSelecionadaId = fichaId;
    preencherFormulario(fichaSnap.data());
    atualizarDestaqueLista();
  } else {
    alert('Ficha não encontrada.');
    console.warn('Ficha não encontrada para ID:', fichaId);
  }
}

function novaFicha() {
  fichaSelecionadaId = null;
  limparFormulario();
  listarFichas();
}

// --- NOVA LÓGICA DE SALVAMENTO DA FICHA ---
async function salvarFicha() {
  if (!currentUser) {
    alert('Usuário não autenticado.');
    return;
  }

  const dados = {};

  // 1. Dados Gerais
  dados.nome = form.elements['nome'].value;
  dados.papel = form.elements['papel'].value;
  dados.espec = form.elements['espec'].value;
  dados.circulo = form.elements['circulo'].value;
  dados.plano = form.elements['plano'].value;
  dados.religiao = form.elements['religiao'].value;

  // 2. Atributos (Corpo, Astúcia, Intuição)
  dados.atributos = {};
  ['corpo', 'astucia', 'intuicao'].forEach(attrId => {
    const atributoDiv = document.getElementById(attrId);
    const maxImpulsos = atributoDiv.querySelector('.max-impulsos-input').value;

    const impulsosCheckboxes = atributoDiv.querySelectorAll('.checkbox-impulso');
    const impulsos = Array.from(impulsosCheckboxes).map(cb => cb.checked);

    const douradoCheckboxes = Array.from(atributoDiv.querySelectorAll('input.dourado-checkbox'));
    const acoesCheckboxes = Array.from(atributoDiv.querySelectorAll('input.checkbox-acao'));

    const acoes = [];
    for (let i = 0; i < douradoCheckboxes.length; i++) {
      const dourado = douradoCheckboxes[i].checked;
      const acoesGrupo = acoesCheckboxes.slice(i * 7, i * 7 + 7).map(cb => cb.checked);
      acoes.push({
        dourado,
        acoes: acoesGrupo
      });
    }

    dados.atributos[attrId] = {
      maxImpulsos: Number(maxImpulsos),
      impulsos,
      acoes
    };
  });

  // 3. Habilidades do Papel e Especialidade
  dados.papelDescricao = document.querySelector('textarea[name="papelDescricao"]').value;
  dados.especialidade = document.querySelector('textarea[name="especialidade"]').value;

  // 4. Marcas
  dados.marcas = {};
  ['corpo', 'mente', 'sangria'].forEach(categoria => {
    const categoriaDiv = document.querySelector(`.categoria[data-categoria="${categoria}"]`);
    const maxMarcas = categoriaDiv.querySelector('.max-marcas-input').value;
    const marcadas = Array.from(categoriaDiv.querySelectorAll('.marcas-lista input[type="checkbox"]')).map(cb => cb.checked);
    dados.marcas[categoria] = {
      maxMarcas: Number(maxMarcas),
      marcadas
    };
  });

  // 5. Cicatrizes
  dados.cicatrizes = {};
  for (let i = 1; i <= 3; i++) {
    dados.cicatrizes[`cicatriz_${i}`] = {
      checked: form.elements[`cicatriz_${i}`].checked,
      descricao: form.elements[`desc_cicatriz_${i}`].value
    };
  }

  // 6. Relacionamentos
  dados.relacionamentos = Array.from(document.querySelectorAll('.lista-relacionamento input[type="text"]')).map(input => input.value);

  // 7. Equipamento
  dados.equipamento = Array.from(document.querySelectorAll('.lista-equipamento li')).map(li => ({
    checked: li.querySelector('input[type="checkbox"]').checked,
    descricao: li.querySelector('input[type="text"]').value
  }));

  // 8. Notas e Habilidades de Círculo
  dados.notas = document.querySelector('.subsection.notas textarea').value;
  dados.habilidadesCirculo = document.querySelector('.subsection.habilidades-circulo textarea').value;

  // 9. Resistências por atributo
  dados.resistencias = resistencias; // Salva o objeto completo com estados por atributo


  try {
    if (fichaSelecionadaId) {
      await setDoc(doc(db, 'usuarios', currentUser.uid, 'fichas', fichaSelecionadaId), dados);
    } else {
      const fichasRef = collection(db, 'usuarios', currentUser.uid, 'fichas');
      const docRef = await addDoc(fichasRef, dados);
      fichaSelecionadaId = docRef.id;
    }
    mostrarModalSucesso('Ficha salva com sucesso!');
    listarFichas(); // Atualiza a lista de fichas
  } catch (error) {
    console.error('Erro ao salvar ficha:', error);
    mostrarModalSucesso('Erro ao salvar ficha: ' + error.message);
  }
}

// --- Event Listeners ---

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await salvarFicha();
});

btnNovaFicha.addEventListener('click', (e) => {
  e.preventDefault();
  novaFicha();
});

// Adicione o event listener para o botão de Logout aqui
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
  inicializarControleMaxImpulsos();
  inicializarMarcas();
});

// Autenticação e carregamento inicial (APENAS AQUI)
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;
  console.log('onAuthStateChanged: Usuário logado. Resetando fichaSelecionadaId para null.');
  fichaSelecionadaId = null; // Garante que nenhuma ficha está selecionada ao logar
  await listarFichas(); // Lista as fichas do usuário
  // Se houver fichas, carrega a primeira ou a última selecionada
  if (listaFichas.children.length > 0 && listaFichas.children[0].dataset.id) {
    carregarFicha(listaFichas.children[0].dataset.id);
  } else {
    limparFormulario(); // Se não houver fichas, limpa o formulário
  }
  console.log('onAuthStateChanged: Fim da inicialização. fichaSelecionadaId FINAL:', fichaSelecionadaId);
});
