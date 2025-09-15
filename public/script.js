import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById('fichaForm');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Redireciona para login se não estiver logado
    window.location.href = 'login.html';
    return;
  }
  currentUser = user;

  // Carregar ficha do Firestore
  const fichaRef = doc(db, 'fichas', user.uid);
  const fichaSnap = await getDoc(fichaRef);

  if (fichaSnap.exists()) {
    const dados = fichaSnap.data();
    for (const key in dados) {
      const el = form.elements[key];
      if (el) {
        el.value = dados[key];
      }
    }
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) {
    alert('Usuário não autenticado.');
    return;
  }

  const dados = {};
  for (let element of form.elements) {
    if (element.name) {
      dados[element.name] = element.value;
    }
  }

  try {
    // Salvar ficha no Firestore, documento com id do usuário
    await setDoc(doc(db, 'fichas', currentUser.uid), dados);
    alert('Ficha salva no banco de dados.');
  } catch (error) {
    alert('Erro ao salvar ficha: ' + error.message);
  }
});