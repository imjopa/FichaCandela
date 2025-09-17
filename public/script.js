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

// Elementos do DOM
const listaFichasEl = document.getElementById("listaFichas");
const btnNovaFicha = document.getElementById("btnNovaFicha");
const fichaForm = document.getElementById("fichaForm");

// Variável para guardar a ficha selecionada (id do documento)
let fichaSelecionadaId = null;

// Cria um item da lista de fichas com botão excluir
function criarItemFicha(id, nome) {
  const li = document.createElement("li");
  li.textContent = nome || "(Sem nome)";
  li.dataset.id = id;

  const btnExcluir = document.createElement("button");
  btnExcluir.textContent = "X";
  btnExcluir.classList.add("btn-excluir");
  btnExcluir.title = "Excluir ficha";
  btnExcluir.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm("Deseja realmente excluir esta ficha?")) {
      await excluirFicha(id);
    }
  });

  li.appendChild(btnExcluir);

  li.addEventListener("click", () => {
    selecionarFicha(id);
  });

  return li;
}

// Carrega lista de fichas do usuário logado
async function carregarListaFichas(userUid) {
  listaFichasEl.innerHTML = "";
  const fichasRef = collection(db, "fichas");
  const q = query(fichasRef, where("userUid", "==", userUid));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = criarItemFicha(docSnap.id, data.nome);
    listaFichasEl.appendChild(li);
  });
}

// Seleciona uma ficha para edição
async function selecionarFicha(id) {
  fichaSelecionadaId = id;

  // Marca visualmente a ficha selecionada
  Array.from(listaFichasEl.children).forEach((li) => {
    li.classList.toggle("selecionada", li.dataset.id === id);
  });

  // Carrega dados da ficha e preenche o formulário
  const docRef = doc(db, "fichas", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    alert("Ficha não encontrada!");
    return;
  }
  const data = docSnap.data();
  preencherFormulario(data);
}

// Preenche o formulário com os dados da ficha
function preencherFormulario(data) {
  // Dados gerais simples
  fichaForm.nome.value = data.nome || "";
  fichaForm.papel.value = data.papel || "";
  fichaForm.espec.value = data.espec || "";
  fichaForm.circulo.value = data.circulo || "";
  fichaForm.plano.value = data.plano || "";
  fichaForm.religiao.value = data.religiao || "";

  // Atributos (corpo, astucia, intuicao)
  ["corpo", "astucia", "intuicao"].forEach((atributo) => {
    const maxImpulsoInput = fichaForm.querySelector(`input.max-impulsos-input[data-atributo="${atributo}"]`);
    maxImpulsoInput.value = data.atributos?.[atributo]?.maxImpulsos || 1;

    const impulsosCheckboxes = fichaForm.querySelectorAll(`input.checkbox-impulso[name^="${atributo}_impulso_"]`);
    impulsosCheckboxes.forEach((checkbox, i) => {
      checkbox.checked = data.atributos?.[atributo]?.impulsos?.[i] || false;
    });

    const atributoDiv = fichaForm.querySelector(`div.atributo#${atributo}`);
    if (!atributoDiv) return;

    const douradoCheckboxes = atributoDiv.querySelectorAll("input.dourado-checkbox");
    douradoCheckboxes.forEach((douradoCheckbox, idx) => {
      douradoCheckbox.checked = data.atributos?.[atributo]?.acoes?.[idx]?.dourado || false;

      const label = douradoCheckbox.parentElement;
      const acoesCheckboxes = label.querySelectorAll("input.checkbox-acao");
      acoesCheckboxes.forEach((acaoCheckbox, i) => {
        acaoCheckbox.checked = data.atributos?.[atributo]?.acoes?.[idx]?.acoes?.[i] || false;
      });
    });
  });

  // Habilidades do papel e especialidade
  fichaForm.papelDescricao.value = data.papelDescricao || "";
  fichaForm.especialidade.value = data.especialidade || "";

  // Marcas (corpo, mente, sangria)
  ["corpo", "mente", "sangria"].forEach((categoria) => {
    const categoriaDiv = fichaForm.querySelector(`.categoria[data-categoria="${categoria}"]`);
    if (!categoriaDiv) return;

    const maxMarcasInput = categoriaDiv.querySelector("input.max-marcas-input");
    maxMarcasInput.value = data.marcas?.[categoria]?.maxMarcas || 3;

    const marcasLista = categoriaDiv.querySelector("ul.marcas-lista");
    marcasLista.innerHTML = "";
    const marcas = data.marcas?.[categoria]?.itens || [];
    marcas.forEach((marca) => {
      const li = document.createElement("li");
      li.textContent = marca;
      marcasLista.appendChild(li);
    });
  });

  // Cicatrizes (checkbox + descrição)
  for (let i = 1; i <= 3; i++) {
    const cicatrizCheckbox = fichaForm.querySelector(`input[name="cicatriz_${i}"]`);
    const cicatrizDesc = fichaForm.querySelector(`input[name="desc_cicatriz_${i}"]`);
    if (cicatrizCheckbox) cicatrizCheckbox.checked = data.cicatrizes?.[`cicatriz_${i}`]?.checked || false;
    if (cicatrizDesc) cicatrizDesc.value = data.cicatrizes?.[`cicatriz_${i}`]?.descricao || "";
  }

  // Relacionamentos (lista de inputs)
  const relInputs = fichaForm.querySelectorAll(".lista-relacionamento input[type=text]");
  const rels = data.relacionamentos || [];
  relInputs.forEach((input, i) => {
    input.value = rels[i] || "";
  });

  // Equipamento (checkbox + texto)
  const equipItems = fichaForm.querySelectorAll(".lista-equipamento li");
  const equipamentos = data.equipamento || [];
  equipItems.forEach((li, i) => {
    const checkbox = li.querySelector("input[type=checkbox]");
    const textInput = li.querySelector("input[type=text]");
    if (checkbox) checkbox.checked = equipamentos[i]?.checked || false;
    if (textInput) textInput.value = equipamentos[i]?.descricao || "";
  });

  // Notas e habilidades de círculo (textareas)
  const notasTextarea = fichaForm.querySelector(".subsection.notas textarea");
  const habilidadesCirculoTextarea = fichaForm.querySelector(".subsection.habilidades-circulo textarea");
  if (notasTextarea) notasTextarea.value = data.notas || "";
  if (habilidadesCirculoTextarea) habilidadesCirculoTextarea.value = data.habilidadesCirculo || "";

  // Atualiza a limitação dos impulsos para refletir o valor carregado
  ["corpo", "astucia", "intuicao"].forEach(atributo => {
    atualizarLimiteImpulsos(atributo);
  });
}

// Lê os dados do formulário e retorna um objeto com a ficha
function lerFormulario() {
  const data = {};

  data.nome = fichaForm.nome.value.trim();
  data.papel = fichaForm.papel.value.trim();
  data.espec = fichaForm.espec.value.trim();
  data.circulo = fichaForm.circulo.value.trim();
  data.plano = fichaForm.plano.value.trim();
  data.religiao = fichaForm.religiao.value.trim();

  data.atributos = {};
  ["corpo", "astucia", "intuicao"].forEach((atributo) => {
    data.atributos[atributo] = {};

    const maxImpulsoInput = fichaForm.querySelector(`input.max-impulsos-input[data-atributo="${atributo}"]`);
    data.atributos[atributo].maxImpulsos = Number(maxImpulsoInput.value) || 1;

    const impulsosCheckboxes = fichaForm.querySelectorAll(`input.checkbox-impulso[name^="${atributo}_impulso_"]`);
    data.atributos[atributo].impulsos = Array.from(impulsosCheckboxes).map(cb => cb.checked);

    const atributoDiv = fichaForm.querySelector(`div.atributo#${atributo}`);
    const douradoCheckboxes = atributoDiv.querySelectorAll("input.dourado-checkbox");
    data.atributos[atributo].acoes = Array.from(douradoCheckboxes).map(douradoCheckbox => {
      const label = douradoCheckbox.parentElement;
      const acoesCheckboxes = label.querySelectorAll("input.checkbox-acao");
      return {
        dourado: douradoCheckbox.checked,
        acoes: Array.from(acoesCheckboxes).map(cb => cb.checked)
      };
    });
  });

  data.papelDescricao = fichaForm.papelDescricao.value.trim();
  data.especialidade = fichaForm.especialidade.value.trim();

  data.marcas = {};
  ["corpo", "mente", "sangria"].forEach((categoria) => {
    const categoriaDiv = fichaForm.querySelector(`.categoria[data-categoria="${categoria}"]`);
    const maxMarcasInput = categoriaDiv.querySelector("input.max-marcas-input");
    const marcasLista = categoriaDiv.querySelector("ul.marcas-lista");
    const itens = Array.from(marcasLista.children).map(li => li.textContent.trim());
    data.marcas[categoria] = {
      maxMarcas: Number(maxMarcasInput.value) || 3,
      itens
    };
  });

  data.cicatrizes = {};
  for (let i = 1; i <= 3; i++) {
    const cicatrizCheckbox = fichaForm.querySelector(`input[name="cicatriz_${i}"]`);
    const cicatrizDesc = fichaForm.querySelector(`input[name="desc_cicatriz_${i}"]`);
    data.cicatrizes[`cicatriz_${i}`] = {
      checked: cicatrizCheckbox?.checked || false,
      descricao: cicatrizDesc?.value.trim() || ""
    };
  }

  const relInputs = fichaForm.querySelectorAll(".lista-relacionamento input[type=text]");
  data.relacionamentos = Array.from(relInputs).map(input => input.value.trim());

  const equipItems = fichaForm.querySelectorAll(".lista-equipamento li");
  data.equipamento = Array.from(equipItems).map(li => {
    const checkbox = li.querySelector("input[type=checkbox]");
    const textInput = li.querySelector("input[type=text]");
    return {
      checked: checkbox?.checked || false,
      descricao: textInput?.value.trim() || ""
    };
  });

  const notasTextarea = fichaForm.querySelector(".subsection.notas textarea");
  const habilidadesCirculoTextarea = fichaForm.querySelector(".subsection.habilidades-circulo textarea");
  data.notas = notasTextarea?.value.trim() || "";
  data.habilidadesCirculo = habilidadesCirculoTextarea?.value.trim() || "";

  return data;
}

// Salva a ficha no Firestore
async function salvarFicha(userUid) {
  if (!userUid) {
    alert("Usuário não autenticado.");
    return;
  }

  const data = lerFormulario();
  data.userUid = userUid;

  if (!fichaSelecionadaId) {
    alert("Nenhuma ficha selecionada para salvar.");
    return;
  }

  try {
    await setDoc(doc(db, "fichas", fichaSelecionadaId), data);
    alert("Ficha salva com sucesso!");
    await carregarListaFichas(userUid);
  } catch (error) {
    console.error("Erro ao salvar ficha:", error);
    alert("Erro ao salvar ficha: " + error.message);
  }
}

// Cria uma nova ficha vazia
async function criarNovaFicha(userUid) {
  if (!userUid) {
    alert("Usuário não autenticado.");
    return;
  }

  const fichasRef = collection(db, "fichas");
  const novoDocRef = doc(fichasRef);

  const novaFicha = {
    nome: "Nova Ficha",
    papel: "",
    espec: "",
    circulo: "",
    plano: "",
    religiao: "",
    atributos: {
      corpo: { maxImpulsos: 1, impulsos: Array(9).fill(false), acoes: [] },
      astucia: { maxImpulsos: 1, impulsos: Array(9).fill(false), acoes: [] },
      intuicao: { maxImpulsos: 1, impulsos: Array(9).fill(false), acoes: [] }
    },
    papelDescricao: "",
    especialidade: "",
    marcas: {
      corpo: { maxMarcas: 3, itens: [] },
      mente: { maxMarcas: 3, itens: [] },
      sangria: { maxMarcas: 3, itens: [] }
    },
    cicatrizes: {
      cicatriz_1: { checked: false, descricao: "" },
      cicatriz_2: { checked: false, descricao: "" },
      cicatriz_3: { checked: false, descricao: "" }
    },
    relacionamentos: Array(9).fill(""),
    equipamento: Array(6).fill({ checked: false, descricao: "" }),
    notas: "",
    habilidadesCirculo: "",
    userUid
  };

  try {
    await setDoc(novoDocRef, novaFicha);
    fichaSelecionadaId = novoDocRef.id;
    await carregarListaFichas(userUid);
    selecionarFicha(fichaSelecionadaId);
  } catch (error) {
    console.error("Erro ao criar nova ficha:", error);
    alert("Erro ao criar nova ficha: " + error.message);
  }
}

// Exclui uma ficha
async function excluirFicha(id) {
  if (!id) return;
  if (!confirm("Confirma exclusão da ficha?")) return;

  try {
    await deleteDoc(doc(db, "fichas", id));
    if (fichaSelecionadaId === id) {
      fichaSelecionadaId = null;
      fichaForm.reset();
    }
    const userUid = auth.currentUser ?.uid;
    if (userUid) await carregarListaFichas(userUid);
  } catch (error) {
    console.error("Erro ao excluir ficha:", error);
    alert("Erro ao excluir ficha: " + error.message);
  }
}

// Limita a quantidade de impulsos marcados conforme o máximo
function atualizarLimiteImpulsos(atributo) {
  const maxImpulsoInput = fichaForm.querySelector(`input.max-impulsos-input[data-atributo="${atributo}"]`);
  const impulsosCheckboxes = fichaForm.querySelectorAll(`input.checkbox-impulso[name^="${atributo}_impulso_"]`);

  const maxImpulsos = Number(maxImpulsoInput.value) || 1;

  function contarMarcados() {
    return Array.from(impulsosCheckboxes).filter(cb => cb.checked).length;
  }

  function atualizarCheckboxes() {
    const marcados = contarMarcados();
    impulsosCheckboxes.forEach(cb => {
      if (!cb.checked) {
        cb.disabled = marcados >= maxImpulsos;
      } else {
        cb.disabled = false;
      }
    });
  }

 maxImpulsoInput.addEventListener("input", () => {
  let max = Number(maxImpulsoInput.value);
  if (isNaN(max) || max < 1) max = 1;
  if (max > 9) max = 9;
  maxImpulsoInput.value = max;

  let marcados = contarMarcados();

  if (marcados > max) {
    for (let i = impulsosCheckboxes.length - 1; i >= 0; i--) {
      if (impulsosCheckboxes[i].checked) {
        impulsosCheckboxes[i].checked = false;
        marcados--;
        if (marcados <= max) break;
      }
    }
  }
  atualizarCheckboxes();
});


  impulsosCheckboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      atualizarCheckboxes();
    });
  });

  atualizarCheckboxes();
}

// Inicializa os controles de impulsos para cada atributo
["corpo", "astucia", "intuicao"].forEach(atributo => {
  atualizarLimiteImpulsos(atributo);
});

// Evento submit do formulário para salvar ficha
fichaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userUid = auth.currentUser ?.uid;
  await salvarFicha(userUid);
});

// Evento botão nova ficha
btnNovaFicha.addEventListener("click", async () => {
  const userUid = auth.currentUser ?.uid;
  await criarNovaFicha(userUid);
});

// Observa estado de autenticação
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await carregarListaFichas(user.uid);
  fichaSelecionadaId = null;
  fichaForm.reset();
});
