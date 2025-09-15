import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const signupLink = document.getElementById('signupLink');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Login ok, redireciona para ficha
    window.location.href = 'index.html';
  } catch (error) {
    errorMsg.textContent = 'Erro no login: ' + error.message;
  }
});

// Link para criar conta nova
signupLink.addEventListener('click', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    errorMsg.textContent = 'Preencha email e senha para criar conta.';
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Conta criada com sucesso! Você já está logado.');
    window.location.href = 'index.html';
  } catch (error) {
    errorMsg.textContent = 'Erro ao criar conta: ' + error.message;
  }
});