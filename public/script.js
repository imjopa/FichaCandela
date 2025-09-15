// SCRIPT.JS
const form = document.getElementById('fichaForm');

// Carrega dados do localStorage se existir
window.onload = () => {
  const dadosSalvos = localStorage.getItem('fichaRPG');
  if (dadosSalvos) {
    const dados = JSON.parse(dadosSalvos);
    for (const key in dados) {
      const el = form.elements[key];
      if (el) {
        el.value = dados[key];
      }
    }
  }
};

// Salvar os dados ao enviar o formulário
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dados = {};
  for (let element of form.elements) {
    if (element.name) {
      dados[element.name] = element.value;
    }
  }

  // Salvar em localStorage
  localStorage.setItem('fichaRPG', JSON.stringify(dados));

  alert('Ficha salva localmente no navegador.');
});