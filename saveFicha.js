import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseApp } from "./firebase-config.js"; // ou de onde estiver exportado

const db = getFirestore(firebaseApp);

document.getElementById('btnSalvarFicha').addEventListener('click', async () => {
  try {
    const form = document.getElementById('fichaForm');

    // Dados gerais
    const nome = form.nome.value;
    const papel = form.papel.value;
    const espec = form.espec.value;
    const circulo = form.circulo.value;
    const plano = form.plano.value;
    const religiao = form.religiao.value;

    // Função para coletar impulsos e ações de um atributo
    function coletarAtributo(id) {
      const atributoDiv = document.getElementById(id);
      const maxImpulsos = atributoDiv.querySelector('.max-impulsos-input').value;

      // Impulsos marcados
      const impulsosCheckboxes = atributoDiv.querySelectorAll('.checkbox-impulso');
      const impulsos = Array.from(impulsosCheckboxes).map(cb => cb.checked);

      // Ações douradas e normais
      const douradoCheckboxes = Array.from(atributoDiv.querySelectorAll('input.dourado-checkbox'));
      const acoesCheckboxes = Array.from(atributoDiv.querySelectorAll('input.checkbox-acao'));

      // Agrupar ações por grupo (Mover, Atacar, Controlar, etc)
      // Cada label com dourado-checkbox é seguido por 7 checkbox-acao
      const acoes = [];
      for (let i = 0; i < douradoCheckboxes.length; i++) {
        const dourado = douradoCheckboxes[i].checked;
        // Para cada dourado, pegar os próximos 7 checkbox-acao
        const acoesGrupo = acoesCheckboxes.slice(i * 7, i * 7 + 7).map(cb => cb.checked);
        acoes.push({
          dourado,
          acoes: acoesGrupo
        });
      }

      return {
        maxImpulsos: Number(maxImpulsos),
        impulsos,
        acoes
      };
    }

    // Coletar dados dos atributos
    const corpo = coletarAtributo('corpo');
    const astucia = coletarAtributo('astucia');
    const intuicao = coletarAtributo('intuicao');

    // TODO: Coletar outras informações da ficha, como marcas, cicatrizes, etc
    // Se estiverem em outros campos, faça a coleta similar

    // Montar objeto ficha
    const ficha = {
      nome,
      papel,
      espec,
      circulo,
      plano,
      religiao,
      atributos: {
        corpo,
        astucia,
        intuicao
      },
      // Adicione aqui outras propriedades coletadas
    };

    // Salvar no Firestore
    // Use o ID do usuário autenticado para salvar a ficha, por exemplo:
    const user = firebaseApp.auth().currentUser ;
    if (!user) {
      alert('Usuário não autenticado');
      return;
    }

    const fichaDocRef = doc(db, 'fichas', user.uid);
    await setDoc(fichaDocRef, ficha);

    alert('Ficha salva com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar ficha:', error);
    alert('Erro ao salvar ficha. Veja o console para detalhes.');
  }
});
