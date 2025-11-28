    /* ============================================================
   PWA MUSIC BOOK – app.js LIMPIO, REPARADO Y OPTIMIZADO
   ============================================================ */

/* ------------------------------
   UTILIDADES
--------------------------------*/
function loadView(view) {
  return fetch(`views/${view}.html`)
    .then(res => res.text())
    .then(html => {
      document.getElementById("app").innerHTML = html;
      initViewLogic(view);
    });
}

/* ------------------------------
   SISTEMA DE USUARIOS
--------------------------------*/
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function loginUser(username, pass) {
  const users = getUsers();
  return users.find(u => u.user === username && u.pass === pass);
}

/* ------------------------------
   SISTEMA DE CANCIONES
--------------------------------*/
function getSongs() {
  return JSON.parse(localStorage.getItem("songs")) || [];
}

function saveSongs(list) {
  localStorage.setItem("songs", JSON.stringify(list));
}

/* ============================================================
   INICIALIZAR LA VISTA SEGÚN CUAL SE CARGUE
   ============================================================ */
function initViewLogic(view) {
  switch (view) {
    case "login":
      initLoginView();
      break;

    case "register":
      initRegisterView();
      break;

    case "recover":
      initRecoverView();
      break;

    case "main":
      initMainView();
      break;
  }
}

/* ============================================================
   LOGIN
   ============================================================ */
function initLoginView() {
  const form = document.getElementById("form-login");
  const toRegister = document.getElementById("to-register");
  const toRecover = document.getElementById("to-recover");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value.trim();

    const logged = loginUser(user, pass);

    if (!logged) {
      alert("Usuario o contraseña incorrectos");
      return;
    }

    localStorage.setItem("currentUser", logged.user);
    loadView("main");
  });

  toRegister.onclick = () => loadView("register");
  toRecover.onclick = () => loadView("recover");
}

/* ============================================================
   REGISTRO
   ============================================================ */
function initRegisterView() {
  document.getElementById("form-register").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("reg-name").value.trim();
    const lastname = document.getElementById("reg-lastname").value.trim();
    const user = document.getElementById("reg-user").value.trim();
    const key = document.getElementById("reg-key").value.trim();
    const pass = document.getElementById("reg-pass").value.trim();

    const users = getUsers();

    if (users.some(u => u.user === user)) {
      alert("Ese usuario ya existe");
      return;
    }

    users.push({ name, lastname, user, key, pass });
    saveUsers(users);

    alert("Registro exitoso. Ahora inicia sesión.");
    loadView("login");
  });
}

/* ============================================================
   RECUPERAR CONTRASEÑA
   ============================================================ */
function initRecoverView() {
  document.getElementById("form-recover").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("rec-name").value.trim();
    const lastname = document.getElementById("rec-lastname").value.trim();
    const user = document.getElementById("rec-user").value.trim();
    const key = document.getElementById("rec-key").value.trim();

    const users = getUsers();

    const found = users.find(
      u =>
        u.name === name &&
        u.lastname === lastname &&
        u.user === user &&
        u.key === key
    );

    if (!found) {
      alert("Datos incorrectos");
      return;
    }

    alert(`Tu contraseña es: ${found.pass}`);
    loadView("login");
  });
}

/* ============================================================
   VISTA PRINCIPAL (MAIN)
   ============================================================ */
function initMainView() {
  const logout = document.getElementById("logout-btn");
  const addSongBtn = document.getElementById("add-song-btn");
  const orderSongBtn = document.getElementById("order-song-btn");
  const songList = document.getElementById("song-list");

  const modalAdd = document.getElementById("modal-add-song");
  const saveSongBtn = document.getElementById("save-song-btn");
  const closeAddSong = document.getElementById("close-add-song");

  const modalReader = document.getElementById("modal-reader");
  const readerTitle = document.getElementById("reader-title");
  const readerText = document.getElementById("reader-text");
  const nextPageBtn = document.getElementById("next-page");
  const prevPageBtn = document.getElementById("prev-page");
  const closeReader = document.getElementById("close-reader");

  const modalOrder = document.getElementById("modal-order");
  const orderList = document.getElementById("order-list");
  const saveOrderBtn = document.getElementById("save-order-btn");
  const closeOrder = document.getElementById("close-order");

  /* ------------------ LOGOUT ------------------ */
  logout.onclick = () => {
    localStorage.removeItem("currentUser");
    loadView("login");
  };

  /* ------------------ MOSTRAR LISTA ------------------ */
  function renderSongs() {
    const songs = getSongs();
    songList.innerHTML = "";

    songs.forEach((song, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <button class="song-item" data-i="${index}">
          ${song.title}
        </button>
      `;
      songList.appendChild(li);
    });

    document.querySelectorAll(".song-item").forEach(btn => {
      btn.onclick = () => openReader(btn.dataset.i);
    });
  }

  renderSongs();

  /* ------------------ AGREGAR CANCIÓN ------------------ */
  addSongBtn.onclick = () => modalAdd.classList.remove("hidden");

  closeAddSong.onclick = () => modalAdd.classList.add("hidden");

  saveSongBtn.onclick = () => {
    const title = document.getElementById("song-title").value.trim();
    const lyrics = document.getElementById("song-lyrics").value.trim();

    if (!title || !lyrics) {
      alert("Todos los campos son obligatorios");
      return;
    }

    const list = getSongs();
    list.push({ title, lyrics });
    saveSongs(list);

    modalAdd.classList.add("hidden");
    renderSongs();
  };

  /* ------------------ LECTOR ------------------ */
  let pageIndex = 0;
  let pageChunks = [];

  function openReader(i) {
    const song = getSongs()[i];

    readerTitle.textContent = song.title;

    // Dividir texto cada 500 caracteres
    pageChunks = song.lyrics.match(/.{1,500}/gs) || [];

    pageIndex = 0;
    updateReaderPage();

    modalReader.classList.remove("hidden");
  }

  function updateReaderPage() {
    readerText.textContent = pageChunks[pageIndex] || "";
  }

  nextPageBtn.onclick = () => {
    if (pageIndex < pageChunks.length - 1) {
      pageIndex++;
      updateReaderPage();
    }
  };

  prevPageBtn.onclick = () => {
    if (pageIndex > 0) {
      pageIndex--;
      updateReaderPage();
    }
  };

  closeReader.onclick = () => modalReader.classList.add("hidden");

  /* ------------------ ORDENAR CANCIONES (DRAG & DROP) ------------------ */
  orderSongBtn.onclick = () => {
    const songs = getSongs();
    modalOrder.classList.remove("hidden");

    orderList.innerHTML = "";

    songs.forEach((song, i) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.i = i;
      li.textContent = song.title;
      li.classList.add("draggable");
      orderList.appendChild(li);
    });

    initDrag(orderList);
  };

  closeOrder.onclick = () => modalOrder.classList.add("hidden");

  saveOrderBtn.onclick = () => {
    const newOrder = [];
    orderList.querySelectorAll("li").forEach(li => {
      newOrder.push(getSongs()[li.dataset.i]);
    });

    saveSongs(newOrder);
    modalOrder.classList.add("hidden");
    renderSongs();
  };
}

/* ------------------------------
   DRAG & DROP
--------------------------------*/
function initDrag(container) {
  let dragEl;

  container.addEventListener("dragstart", e => {
    dragEl = e.target;
  });

  container.addEventListener("dragover", e => {
    e.preventDefault();
    const after = Array.from(container.children).find(child => {
      return e.clientY < child.offsetTop + child.offsetHeight / 2;
    });

    if (after) container.insertBefore(dragEl, after);
    else container.appendChild(dragEl);
  });
}

/* ============================================================
   INICIO AUTOMÁTICO
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const current = localStorage.getItem("currentUser");
  loadView(current ? "main" : "login");
});
