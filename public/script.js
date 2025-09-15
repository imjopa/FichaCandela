import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById('fichaForm');
const listaFichas = document.getElementById('listaFichas');
const btnNovaFicha = document.getElementById('btnNovaFicha');

let currentUser = null;
let fichaSelecionadaId = null;




// Limpa o formulário
function limparFormulario() {
  for (let element of form.elements) {
    if (element.name) {
      if (element.type === 'checkbox') {
        element.checked = false;
      } else {
        element.value = '';
      }
    }
  }
}

// Preenche o formulário com dados
function preencherFormulario(dados) {
  for (const key in dados) {
    const el = form.elements[key];
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = dados[key];
      } else {
        el.value = dados[key];
      }
    }
  }
}


// Função para gerar checkboxes para uma categoria
function gerarMarcasCategoria(categoriaDiv, quantidade) {
  const lista = categoriaDiv.querySelector('.marcas-lista');
  if (!lista) return;

  lista.innerHTML = ''; // limpa os checkboxes atuais

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

// Inicializa todas as categorias com o valor padrão dos inputs
function inicializarMarcas() {
  const categorias = document.querySelectorAll('.categoria');
  categorias.forEach(categoriaDiv => {
    const inputMax = categoriaDiv.querySelector('.max-marcas-input');
    if (!inputMax) return;

    let val = parseInt(inputMax.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 20) val = 20;

    gerarMarcasCategoria(categoriaDiv, val);

    // Adiciona listener para atualizar a quantidade ao mudar o input
    inputMax.addEventListener('input', () => {
      let novoVal = parseInt(inputMax.value);
      if (isNaN(novoVal) || novoVal < 1) novoVal = 1;
      if (novoVal > 20) novoVal = 20;
      inputMax.value = novoVal; // corrige valor no input se necessário
      gerarMarcasCategoria(categoriaDiv, novoVal);
    });
  });
}

// Chama a inicialização ao carregar o script
inicializarMarcas();



// Atualiza o destaque visual da ficha selecionada na lista
function atualizarDestaqueLista() {
  const itens = listaFichas.querySelectorAll('li');
  itens.forEach(li => {
    li.classList.toggle('selecionada', li.dataset.id === fichaSelecionadaId);
  });
}

// Lista fichas do usuário na interface
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

    // Botão excluir
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

// Carrega ficha pelo ID
async function carregarFicha(fichaId) {
  if (!currentUser ) return;

  const fichaRef = doc(db, 'usuarios', currentUser .uid, 'fichas', fichaId);
  const fichaSnap = await getDoc(fichaRef);

  if (fichaSnap.exists()) {
    fichaSelecionadaId = fichaId;
    preencherFormulario(fichaSnap.data());
    atualizarDestaqueLista(); // Atualiza só o destaque, sem recriar lista
  } else {
    alert('Ficha não encontrada.');
  }
}

// Cria nova ficha vazia
function novaFicha() {
  fichaSelecionadaId = null;
  limparFormulario();
  listarFichas();
}

// Salva ficha atual (cria ou atualiza)
async function salvarFicha() {
  if (!currentUser) {
    alert('Usuário não autenticado.');
    return;
  }

  const dados = {};
  for (let element of form.elements) {
    if (element.name) {
      if (element.type === 'checkbox') {
        dados[element.name] = element.checked;
      } else {
        dados[element.name] = element.value;
      }
    }
  }

  try {
    if (fichaSelecionadaId) {
      await setDoc(doc(db, 'usuarios', currentUser.uid, 'fichas', fichaSelecionadaId), dados);
    } else {
      const fichasRef = collection(db, 'usuarios', currentUser.uid, 'fichas');
      const docRef = await addDoc(fichasRef, dados);
      fichaSelecionadaId = docRef.id;
    }
    alert('Ficha salva no banco de dados.');
    listarFichas();
  } catch (error) {
    alert('Erro ao salvar ficha: ' + error.message);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await salvarFicha();
});

btnNovaFicha.addEventListener('click', (e) => {
  e.preventDefault();
  novaFicha();
});

onAuthStateChanged(auth, async (user) => {
     if (!user) {
       window.location.href = 'login.html';
       return;
     }
     currentUser  = user;
     fichaSelecionadaId = null;
     novaFicha();
     // await listarFichas();  // Remover esta linha
   });
   
