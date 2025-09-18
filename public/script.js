import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const fichaForm = document.getElementById("fichaForm");
const listaFichas = document.getElementById("listaFichas");
const btnNovaFicha = document.getElementById("btnNovaFicha");

// Array de marcas para cada categoria (exemplo, ajuste conforme seu jogo)
const MARCAS = {
  corpo: [
    "Marca de Força",
    "Marca de Resistência",
    "Marca de Agilidade",
    "Marca de Vigor",
    "Marca de Vitalidade",
    "Marca Extra 6",
    "Marca Extra 7",
    "Marca Extra 8",
    "Marca Extra 9",
    "Marca Extra 10",
    // ... até 20 se quiser
  ],
  mente: [
    "Marca de Inteligência",
    "Marca de Sabedoria",
    "Marca de Carisma",
    "Marca de Percepção",
    "Marca de Memória",
    "Marca Extra 6",
    "Marca Extra 7",
    "Marca Extra 8",
    "Marca Extra 9",
    "Marca Extra 10",
  ],
  sangria: [
    "Marca de Sangue 1",
    "Marca de Sangue 2",
    "Marca de Sangue 3",
    "Marca de Sangue 4",
    "Marca de Sangue 5",
    "Marca Extra 6",
    "Marca Extra 7",
    "Marca Extra 8",
    "Marca Extra 9",
    "Marca Extra 10",
  ],
};

function renderizarMarcas() {
  document.querySelectorAll(".categoria").forEach((categoriaDiv) => {
    const categoria = categoriaDiv.dataset.categoria;
    const maxInput = categoriaDiv.querySelector(".max-marcas-input");
    let maxMarcas = parseInt(maxInput.value, 10);

    // Limita o máximo para não ultrapassar o total de marcas disponíveis
    const totalMarcasDisponiveis = MARCAS[categoria].length;
    if (maxMarcas > totalMarcasDisponiveis) {
      maxMarcas = totalMarcasDisponiveis;
      maxInput.value = maxMarcas; // Atualiza o input para o máximo permitido
    }
    if (maxMarcas < 1) {
      maxMarcas = 1;
      maxInput.value = maxMarcas;
    }

    const lista = categoriaDiv.querySelector(".marcas-lista");

    // Limpa lista antes de renderizar
    lista.innerHTML = "";

    // Cria os itens de marca com checkbox, só até maxMarcas
    for (let idx = 0; idx < maxMarcas; idx++) {
      const li = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `marca_${categoria}_${idx}`;
      checkbox.classList.add("marca-checkbox");
      checkbox.dataset.categoria = categoria;
      checkbox.dataset.index = idx;
      li.appendChild(checkbox);
      // Não adiciona texto ao lado do checkbox
      lista.appendChild(li);
    }


    // Controla máximo selecionável (opcional, se quiser limitar seleção)
    lista.addEventListener("change", () => {
      const checked = lista.querySelectorAll("input[type=checkbox]:checked")
        .length;
      lista.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        if (!cb.checked) cb.disabled = checked >= maxMarcas;
      });
    });

    // Atualiza a lista ao mudar o input max-marcas-input
    maxInput.addEventListener("input", () => {
      renderizarMarcas(); // Re-renderiza toda a lista para refletir o novo máximo
    });
  });
}

// Chame renderizarMarcas() ao carregar a página para inicializar
window.addEventListener("load", () => {
  renderizarMarcas();
});


// --- Função para salvar ficha no Firestore ---
async function salvarFicha() {
  if (!auth.currentUser) {
    alert("Usuário não autenticado.");
    return;
  }
  const userId = auth.currentUser.uid;

//Salvar Impulsos
  function coletarImpulsos() {
    const impulsos = {};

    ['corpo', 'astucia', 'intuicao'].forEach(atributo => {
      const checkboxes = document.querySelectorAll(`#${atributo} .impulsos-checkboxes input[type="checkbox"]`);
      impulsos[atributo] = Array.from(checkboxes).map(cb => cb.checked);
    });

    return impulsos;
  }


  // Coleta dados do formulário
  const formData = new FormData(fichaForm);
  const data = {};

  // Campos simples
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  // Marcas: para cada categoria, salva array de booleanos
  ["corpo", "mente", "sangria"].forEach((categoria) => {
    const checkboxes = document.querySelectorAll(
      `.categoria[data-categoria="${categoria}"] .marca-checkbox`
    );
    data[`marcas_${categoria}`] = Array.from(checkboxes).map((cb) => cb.checked);
    // Também salva o máximo definido
    const maxInput = document.querySelector(
      `.categoria[data-categoria="${categoria}"] .max-marcas-input`
    );
    data[`marcas_${categoria}_max`] = parseInt(maxInput.value, 10);
  });

  // Cicatrizes: checkbox e descrição
  data.cicatrizes = [];
  for (let i = 1; i <= 3; i++) {
    const marcado = fichaForm.querySelector(`input[name="cicatriz_${i}"]`)
      .checked;
    const desc = fichaForm.querySelector(`input[name="desc_cicatriz_${i}"]`).value;
    data.cicatrizes.push({ marcado, descricao: desc });
  }

  // Relacionamentos (inputs de texto na lista)
  data.relacionamentos = Array.from(
    fichaForm.querySelectorAll(".lista-relacionamento input[type=text]")
  ).map((input) => input.value);

  // Equipamentos (checkbox + texto)
  data.equipamentos = Array.from(
    fichaForm.querySelectorAll(".lista-equipamento li")
  ).map((li) => {
    const checkbox = li.querySelector("input[type=checkbox]");
    const texto = li.querySelector("input[type=text]").value;
    return { marcado: checkbox.checked, descricao: texto };
  });

  // Notas e habilidades de círculo (textareas)
  data.notas = fichaForm.querySelector(".subsection.notas textarea").value;
  data.habilidadesCirculo = fichaForm.querySelector(
    ".subsection.habilidades-circulo textarea"
  ).value;

  // Papel e especialidade (textareas)
  data.papelDescricao = fichaForm.querySelector(
    "section.papel-especialidade textarea[name=papelDescricao]"
  ).value;
  data.especialidade = fichaForm.querySelector(
    "section.papel-especialidade textarea[name=especialidade]"
  ).value;

  // Nome da ficha para identificar
  if (!data.nome || data.nome.trim() === "") {
    alert("Por favor, preencha o nome da ficha.");
    return;
  }

  try {
    // Se fichaAtualId não existe, cria um novo doc com id baseado no nome
    if (!fichaAtualId) {
      fichaAtualId = data.nome.trim().toLowerCase().replace(/\s+/g, "_");
    }
    await setDoc(doc(db, "fichas", fichaAtualId), data);
    alert("Ficha salva com sucesso!");
    carregarListaFichas();
  } catch (error) {
    console.error("Erro ao salvar ficha:", error);
    alert("Erro ao salvar ficha. Veja o console para detalhes.");
  }
}

// --- Função para carregar ficha do Firestore ---
async function carregarFicha(id) {
  if (!auth.currentUser) {
    alert("Usuário não autenticado.");
    return;
  }
  try {
    const docRef = doc(db, "fichas", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      alert("Ficha não encontrada.");
      return;
    }
    const data = docSnap.data();
    fichaAtualId = id;

    // Preenche campos simples
    for (const key in data) {
      const el = fichaForm.elements[key];
      if (!el) continue;

      if (el.type === "checkbox") {
        el.checked = data[key];
      } else if (el.length && el[0].type === "checkbox") {
        // Grupo de checkboxes (não usado aqui, mas pode adaptar)
      } else {
        el.value = data[key];
      }
    }

    // Liga o evento change para controlar a marcação dos checkboxes
    document.querySelectorAll('.checkbox-impulso').forEach(checkbox => {
      checkbox.addEventListener('change', controlarCheckboxes);
    });

    // Impulsos
    document.addEventListener('DOMContentLoaded', () => {
      // Função para limitar checkboxes de impulsos
      function limitarImpulsos(atributo) {
        const maxInput = document.querySelector(`.max-impulsos-input[data-atributo="${atributo}"]`);
        const checkboxes = document.querySelectorAll(`#${atributo} .impulsos-checkboxes input[type="checkbox"]`);

        // Atualiza o estado dos checkboxes conforme o valor máximo
        function atualizarLimite() {
          const max = parseInt(maxInput.value, 10) || 1;
          let checkedCount = 0;

          checkboxes.forEach(cb => {
            if (cb.checked) checkedCount++;
          });

          checkboxes.forEach(cb => {
            // Se já atingiu o máximo e o checkbox não está marcado, desabilita ele
            if (!cb.checked && checkedCount >= max) {
              cb.disabled = true;
            } else {
              cb.disabled = false;
            }
          });
        }

        // Evento para quando o valor do input mudar
        maxInput.addEventListener('input', () => {
          // Se o valor for menor que o número de checkboxes marcados, desmarca os extras
          const max = parseInt(maxInput.value, 10) || 1;
          let checkedCount = 0;

          for (const cb of checkboxes) {
            if (cb.checked) {
              checkedCount++;
              if (checkedCount > max) {
                cb.checked = false;
              }
            }
          }
          atualizarLimite();
        });

        // Evento para quando um checkbox for clicado
        checkboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            const max = parseInt(maxInput.value, 10) || 1;
            const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;

            if (checkedCount > max) {
              // Se ultrapassar o limite, desmarca o checkbox e opcionalmente alerta
              cb.checked = false;
              alert(`Você só pode marcar até ${max} impulsos para ${atributo}.`);
            }
            atualizarLimite();
          });
        });

        // Inicializa o estado
        atualizarLimite();
      }

      // Aplicar para cada atributo
      ['corpo', 'astucia', 'intuicao'].forEach(limitarImpulsos);
    });


    // Preenche marcas
    ["corpo", "mente", "sangria"].forEach((categoria) => {
      const checkboxes = document.querySelectorAll(
        `.categoria[data-categoria="${categoria}"] .marca-checkbox`
      );
      const maxInput = document.querySelector(
        `.categoria[data-categoria="${categoria}"] .max-marcas-input`
      );
      if (data[`marcas_${categoria}_max`]) {
        maxInput.value = data[`marcas_${categoria}_max`];
      }
      if (data[`marcas_${categoria}`]) {
        data[`marcas_${categoria}`].forEach((checked, idx) => {
          if (checkboxes[idx]) checkboxes[idx].checked = checked;
        });
      }
      // Dispara evento para aplicar limite
      maxInput.dispatchEvent(new Event("input"));
    });

    // Cicatrizes
    if (data.cicatrizes) {
      data.cicatrizes.forEach((cicatriz, idx) => {
        const cb = fichaForm.querySelector(`input[name="cicatriz_${idx + 1}"]`);
        const desc = fichaForm.querySelector(
          `input[name="desc_cicatriz_${idx + 1}"]`
        );
        if (cb) cb.checked = cicatriz.marcado;
        if (desc) desc.value = cicatriz.descricao || "";
      });
    }

    // Relacionamentos
    if (data.relacionamentos) {
      const inputs = fichaForm.querySelectorAll(".lista-relacionamento input[type=text]");
      data.relacionamentos.forEach((rel, idx) => {
        if (inputs[idx]) inputs[idx].value = rel;
      });
    }

    // Equipamentos
    if (data.equipamentos) {
      const lis = fichaForm.querySelectorAll(".lista-equipamento li");
      data.equipamentos.forEach((equip, idx) => {
        if (lis[idx]) {
          const cb = lis[idx].querySelector("input[type=checkbox]");
          const txt = lis[idx].querySelector("input[type=text]");
          if (cb) cb.checked = equip.marcado;
          if (txt) txt.value = equip.descricao || "";
        }
      });
    }

    // Notas e habilidades de círculo
    const notasEl = fichaForm.querySelector(".subsection.notas textarea");
    if (notasEl && data.notas) notasEl.value = data.notas;
    const habCircEl = fichaForm.querySelector(".subsection.habilidades-circulo textarea");
    if (habCircEl && data.habilidadesCirculo) habCircEl.value = data.habilidadesCirculo;

    // Papel e especialidade
    const papelDescEl = fichaForm.querySelector(
      "section.papel-especialidade textarea[name=papelDescricao]"
    );
    if (papelDescEl && data.papelDescricao) papelDescEl.value = data.papelDescricao;
    const especialidadeEl = fichaForm.querySelector(
      "section.papel-especialidade textarea[name=especialidade]"
    );
    if (especialidadeEl && data.especialidade) especialidadeEl.value = data.especialidade;

  } catch (error) {
    console.error("Erro ao carregar ficha:", error);
    alert("Erro ao carregar ficha. Veja o console para detalhes.");
  }
}

// --- Função para carregar lista de fichas do usuário ---
async function carregarListaFichas() {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  listaFichas.innerHTML = "";

  try {
    // Busca todas as fichas (aqui simplificado: todas fichas, ideal filtrar por usuário)
    const querySnapshot = await getDocs(collection(db, "fichas"));
    querySnapshot.forEach((docSnap) => {
      const li = document.createElement("li");
      li.textContent = docSnap.data().nome || docSnap.id;
      li.dataset.id = docSnap.id;
      li.addEventListener("click", () => {
        carregarFicha(docSnap.id);
      });
      listaFichas.appendChild(li);
    });
  } catch (error) {
    console.error("Erro ao carregar lista de fichas:", error);
  }
}

// --- Inicialização ---
window.addEventListener("load", () => {
  renderizarMarcas();
  carregarListaFichas();
});


// Atualiza marcas ao mudar max-marcas-input (já tratado na renderizarMarcas)

// Salvar ficha ao enviar formulário
fichaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await salvarFicha();
});

// Botão nova ficha limpa formulário e reseta estado
btnNovaFicha.addEventListener("click", () => {
  fichaAtualId = null;
  fichaForm.reset();
  renderizarMarcas();
});

