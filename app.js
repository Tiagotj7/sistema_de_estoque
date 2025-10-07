// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRWmLW8DbSLEaUFgt-t4_oiUbtxKpkDuw",
  authDomain: "sistemaestoque-6c590.firebaseapp.com",
  projectId: "sistemaestoque-6c590",
  storageBucket: "sistemaestoque-6c590.appspot.com",
  messagingSenderId: "1098803790399",
  appId: "1:1098803790399:web:4175e08c8dfed553da6e8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Controle de autenticação / proteção de rota ---

const isLoginPage = location.pathname.includes("index.html") || location.pathname === "/" ;

if (!isLoginPage) {
  // Se não estiver na página de login, verificar estado do usuário
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // não logado → redireciona para login
      window.location.href = "index.html";
    }
  });
}

// Função de logout global
window.logout = async function () {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error("Erro ao sair:", err);
  }
};

// --- Login / Cadastro na página index.html ---

if (isLoginPage) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const authButton = document.getElementById("authButton");
  const formTitle = document.getElementById("formTitle");
  const toggleLink = document.getElementById("toggleLink");
  const toggleText = document.getElementById("toggleText");

  let isLogin = true;

  toggleLink.addEventListener("click", () => {
    isLogin = !isLogin;
    formTitle.textContent = isLogin ? "Login" : "Cadastro";
    authButton.textContent = isLogin ? "Entrar" : "Cadastrar";
    toggleText.innerHTML = isLogin
      ? `Não tem uma conta? <a id="toggleLink">Cadastre-se</a>`
      : `Já tem uma conta? <a id="toggleLink">Entrar</a>`;
  });

  authButton.addEventListener("click", async () => {
    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value.trim();

    if (!emailVal || !passwordVal) {
      alert("Preencha email e senha!");
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, emailVal, passwordVal);
      } else {
        await createUserWithEmailAndPassword(auth, emailVal, passwordVal);
      }
      // Após autenticar, redirecionar para dashboard
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Erro auth:", err);
      alert("Erro: " + err.message);
    }
  });
}

// --- CRUD / Integração com Firestore de produtos (dashboard) ---

const produtosRef = collection(db, "produtos");

// Se estiver na dashboard, configura a lógica de produtos:
if (!isLoginPage) {
  const btnNovoProduto = document.getElementById("btnNovoProduto");
  const modal = document.getElementById("modalProduto");
  const closeModal = document.getElementById("closeModal");
  const btnCancelar = document.getElementById("btnCancelar");
  const formProduto = document.getElementById("formProduto");
  const modalTitle = document.getElementById("modalTitle");
  const btnSalvarProduto = document.getElementById("btnSalvarProduto");
  const tbody = document.getElementById("produtosTbody");
  const searchInput = document.getElementById("searchInput"); // se você tiver busca

  const nomeField = document.getElementById("nomeProduto");
  const categoriaField = document.getElementById("categoriaProduto");
  const estoqueField = document.getElementById("estoqueProduto");

  let editingId = null;

  function calcStatus(estoque) {
    if (estoque <= 0) return "out-of-stock";
    if (estoque < 5) return "low-stock";
    return "in-stock";
  }

  function openModalForCreate() {
    editingId = null;
    modalTitle.textContent = "Novo Produto";
    btnSalvarProduto.textContent = "Salvar";
    nomeField.value = "";
    categoriaField.value = "";
    estoqueField.value = 0;
    modal.classList.add("show");
    nomeField.focus();
  }

  function openModalForEdit(produto, id) {
    editingId = id;
    modalTitle.textContent = "Editar Produto";
    btnSalvarProduto.textContent = "Atualizar";
    nomeField.value = produto.nome || "";
    categoriaField.value = produto.categoria || "";
    estoqueField.value = produto.estoque !== undefined ? produto.estoque : 0;
    modal.classList.add("show");
    nomeField.focus();
  }

  function closeModalFn() {
    modal.classList.remove("show");
    editingId = null;
    formProduto.reset();
  }

  btnNovoProduto.addEventListener("click", openModalForCreate);
  closeModal.addEventListener("click", closeModalFn);
  btnCancelar.addEventListener("click", closeModalFn);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModalFn();
  });

  formProduto.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = nomeField.value.trim();
    const categoria = categoriaField.value.trim();
    const estoque = parseInt(estoqueField.value, 10) || 0;
    const status = calcStatus(estoque);

    try {
      if (editingId) {
        const docRef = doc(db, "produtos", editingId);
        await updateDoc(docRef, {
          nome,
          categoria,
          estoque,
          status
        });
      } else {
        await addDoc(produtosRef, {
          nome,
          categoria,
          estoque,
          status,
          dataCadastro: serverTimestamp()
        });
      }
      closeModalFn();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      alert("Ocorreu um erro ao salvar. Veja o console.");
    }
  });

  function renderRow(docSnap) {
    const data = docSnap.data();
    const id = docSnap.id;

    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    tdNome.textContent = data.nome || "-";
    const tdCategoria = document.createElement("td");
    tdCategoria.textContent = data.categoria || "-";
    const tdEstoque = document.createElement("td");
    tdEstoque.textContent = (data.estoque !== undefined) ? data.estoque : "-";
    const tdStatus = document.createElement("td");
    const spanStatus = document.createElement("span");
    spanStatus.className = `status ${data.status || calcStatus(data.estoque || 0)}`;
    const statusText = (s) => {
      if (s === "in-stock") return "Em estoque";
      if (s === "low-stock") return "Baixo";
      if (s === "out-of-stock") return "Sem estoque";
      return s;
    };
    spanStatus.textContent = statusText(data.status || calcStatus(data.estoque || 0));
    tdStatus.appendChild(spanStatus);

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "action-btn edit-btn";
    btnEdit.title = "Editar";
    btnEdit.innerHTML = "✏️";
    btnEdit.addEventListener("click", () => openModalForEdit(data, id));

    const btnDelete = document.createElement("button");
    btnDelete.className = "action-btn delete-btn";
    btnDelete.title = "Excluir";
    btnDelete.innerHTML = "🗑️";
    btnDelete.addEventListener("click", async () => {
      const confirmDel = confirm(`Excluir "${data.nome}"?`);
      if (!confirmDel) return;
      try {
        await deleteDoc(doc(db, "produtos", id));
      } catch (err) {
        console.error("Erro ao excluir:", err);
        alert("Erro ao excluir. Veja o console.");
      }
    });

    tdAcoes.appendChild(btnEdit);
    tdAcoes.appendChild(btnDelete);

    tr.appendChild(tdNome);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdEstoque);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);

    return tr;
  }

  function updateCards(snapshotDocs) {
    const total = snapshotDocs.length;
    const falta = snapshotDocs.filter(d => {
      const dt = d.data();
      return (dt.estoque === 0 || dt.estoque === undefined);
    }).length;

    const totalProdutosEl = document.getElementById("totalProdutos");
    const produtosFaltaEl = document.getElementById("produtosFalta");
    const totalCategoriasEl = document.getElementById("totalCategorias");
    const totalFornecedoresEl = document.getElementById("totalFornecedores");

    totalProdutosEl.textContent = total;
    produtosFaltaEl.textContent = falta;

    // Se você tiver coleções “categorias” e “fornecedores”, pode contar esses também.
    totalCategoriasEl.textContent = 0;
    totalFornecedoresEl.textContent = 0;
  }

  // Listener real-time
  const q = query(produtosRef, orderBy("dataCadastro", "desc"));
  onSnapshot(q, (snapshot) => {
    tbody.innerHTML = "";
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">Nenhum produto cadastrado ainda.</td></tr>`;
    } else {
      snapshot.docs.forEach(docSnap => {
        const row = renderRow(docSnap);
        tbody.appendChild(row);
      });
      updateCards(snapshot.docs);
    }
  }, (err) => {
    console.error("Erro onSnapshot:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">Erro ao carregar produtos. Veja console.</td></tr>`;
  });
}
