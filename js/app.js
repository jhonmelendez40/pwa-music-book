n `<section class="view"><h2>Error cargando vista</h2><p>${err.message}</p></section>`;
  }
}

async function showView(name){
  const html = await loadView(VIEWS[name]);
  app.innerHTML = html;
  // enlazar comportamiento según la vista cargada
  if(name === 'login') bindLogin();
  if(name === 'register') bindRegister();
  if(name === 'recover') bindRecover();
  if(name === 'main') bindMain();
}

// ------------------ Inicialización ------------------
(async function init(){
  // Si ya existe sesión abierta, ir a main
  const session = localStorage.getItem(sessionKey());
  if(session) {
    await showView('main');
  } else {
    await showView('login');
  }

  // Registrar service worker (ya en index.html también se registra, esto es redundante pero seguro)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js')
      .then(()=>console.log('SW registrado'))
      .catch(err=>console.warn('SW no registrado', err));
  }
})();

// ------------------ Bind Login ------------------
function bindLogin(){
  const toRegisterBtn = document.getElementById('to-register');
  const toRecoverBtn = document.getElementById('to-recover');
  const form = document.getElementById('form-login');

  if(toRegisterBtn) toRegisterBtn.onclick = ()=> showView('register');
  if(toRecoverBtn) toRecoverBtn.onclick = ()=> showView('recover');

  if(form){
    form.onsubmit = (e)=>{
      e.preventDefault();
      const user = document.getElementById('login-user').value.trim();
      const pass = document.getElementById('login-pass').value;
      const users = getUsers();
      if(!user || !pass){ alert('Completa usuario y contraseña'); return; }
      if(users[user] && users[user].pass === pass){
        localStorage.setItem(sessionKey(), user);
        showView('main');
      } else {
        alert('Usuario o contraseña incorrectos');
      }
    };
  }
}

// ------------------ Bind Register ------------------
function bindRegister(){
  const toLogin = document.getElementById('to-login-from-register');
  const form = document.getElementById('form-register');

  if(toLogin) toLogin.onclick = ()=> showView('login');

  if(form){
    form.onsubmit = (e)=>{
      e.preventDefault();
      const nombre = document.getElementById('reg-nombre').value.trim();
      const apellido = document.getElementById('reg-apellido').value.trim();
      const user = document.getElementById('reg-user').value.trim();
      const key = document.getElementById('reg-key').value;
      const pass = document.getElementById('reg-pass').value;

      if(!nombre || !apellido || !user || !key || !pass){
        alert('Completa todos los campos');
        return;
      }

      const users = getUsers();
      if(users[user]){ alert('Usuario ya existe'); return; }

      users[user] = { nombre, apellido, key, pass };
      saveUsers(users);
      alert('Registrado con éxito. Inicia sesión.');
      showView('login');
    };
  }
}

// ------------------ Bind Recover ------------------
function bindRecover(){
  const toLogin = document.getElementById('to-login-from-recover');
  const form = document.getElementById('form-recover');

  if(toLogin) toLogin.onclick = ()=> showView('login');

  if(form){
    form.onsubmit = (e)=>{
      e.preventDefault();
      const nombre = document.getElementById('rec-nombre').value.trim();
      const apellido = document.getElementById('rec-apellido').value.trim();
      const user = document.getElementById('rec-user').value.trim();
      const key = document.getElementById('rec-key').value;

      if(!nombre || !apellido || !user || !key){
        alert('Completa todos los campos');
        return;
      }

      const users = getUsers();
      if(users[user] && users[user].nombre === nombre && users[user].apellido === apellido && users[user].key === key){
        alert('La contraseña es: ' + users[user].pass);
        showView('login');
      } else {
        alert('Datos no coinciden');
      }
    };
  }
}

// Fin de Parte 1/3 — en la siguiente parte continuaré con la lógica de la vista principal (songs, renderizado y drag&drop)



// ------------------ Vista Principal ------------------
function bindMain(){
  const logoutBtn = document.getElementById('logout');
  const addBtn = document.getElementById('add-song');
  const list = document.getElementById('song-list');

  const user = localStorage.getItem(sessionKey());
  if(!user){ showView('login'); return; }

  const songs = getSongs(user);

  renderSongList(list, songs);
  enableDragOrder(list, songs, user);

  if(logoutBtn){
    logoutBtn.onclick = ()=>{
      localStorage.removeItem(sessionKey());
      showView('login');
    };
  }

  if(addBtn){
    addBtn.onclick = ()=>{
      addSongPrompt(user, list, songs);
    };
  }
}

// ------------------ Canciones ------------------
function getSongs(user){
  try{
    return JSON.parse(localStorage.getItem(songsKey(user)) || '[]');
  }catch(e){
    return [];
  }
}

function saveSongs(user, arr){
  localStorage.setItem(songsKey(user), JSON.stringify(arr));
}

function addSongPrompt(user, list, songs){
  const nombre = prompt('Nombre de la canción:');
  if(!nombre) return;

  const letra = prompt('Letra de la canción:');
  if(!letra) return;

  songs.push({ nombre, letra });
  saveSongs(user, songs);
  renderSongList(list, songs);
}

// ------------------ Renderizado de lista ------------------
function renderSongList(list, songs){
  list.innerHTML = '';

  songs.forEach((song, i)=>{
    const li = document.createElement('li');
    li.className = 'song-item';
    li.draggable = true;
    li.dataset.index = i;

    li.innerHTML = `
      <span class="song-name">${song.nombre}</span>
      <input type="checkbox" class="song-select" data-index="${i}">
    `;

    // Click para abrir lectura tipo libro (parte 3)
    li.querySelector('.song-name').onclick = ()=>{
      openBookMode(songs, i);
    };

    list.appendChild(li);
  });
}

// ------------------ Drag & Drop + Touch ------------------
function enableDragOrder(list, songs, user){

  let dragIndex = null;

  list.addEventListener('dragstart', (e)=>{
    const li = e.target.closest('.song-item');
    if(!li) return;
    dragIndex = parseInt(li.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragover', (e)=>{
    e.preventDefault();
    const li = e.target.closest('.song-item');
    if(!li) return;
  });

  list.addEventListener('drop', (e)=>{
    e.preventDefault();
    const li = e.target.closest('.song-item');
    if(!li) return;

    const dropIndex = parseInt(li.dataset.index);
    reorderSongs(songs, dragIndex, dropIndex, user, list);
  });

  // ---- Soporte para TOUCH (móvil) ----
  let touchStartY = 0;
  let touchItem = null;

  list.addEventListener('touchstart', (e)=>{
    const li = e.target.closest('.song-item');
    if(!li) return;
    touchItem = li;
    touchStartY = e.touches[0].clientY;
  });

  list.addEventListener('touchmove', (e)=>{
    if(!touchItem) return;
    const touchY = e.touches[0].clientY;
    const direction = touchY - touchStartY;

    const liOver = document.elementFromPoint(
      e.touches[0].clientX,
      e.touches[0].clientY
    )?.closest('.song-item');

    if(liOver && liOver !== touchItem){
      const idx1 = parseInt(touchItem.dataset.index);
      const idx2 = parseInt(liOver.dataset.index);
      reorderSongs(songs, idx1, idx2, user, list);
    }
  });

  list.addEventListener('touchend', ()=>{
    touchItem = null;
  });
}

function reorderSongs(songs, from, to, user, list){
  const moved = songs.splice(from, 1)[0];
  songs.splice(to, 0, moved);
  saveSongs(user, songs);
  renderSongList(list, songs);
      }
// ------------------ MODO LIBRO ------------------

let bookState = {
  songs: [],
  index: 0,
  page: 0,
  linesPerPage: 14
};

function openBookMode(songs, index){
  bookState.songs = songs;
  bookState.index = index;
  bookState.page = 0;

  const book = document.getElementById('book');
  const bookTitle = document.getElementById('book-title');
  const bookContent = document.getElementById('book-content');
  const bookClose = document.getElementById('book-close');

  book.style.display = 'block';
  bookTitle.textContent = songs[index].nombre;

  bookClose.onclick = ()=> closeBookMode();

  renderBookPage();
}

function closeBookMode(){
  const book = document.getElementById('book');
  book.style.display = 'none';
}

function renderBookPage(){
  const bookContent = document.getElementById('book-content');
  const pageIndicator = document.getElementById('page-indicator');

  const letra = bookState.songs[bookState.index].letra.split('\n');
  const totalPages = Math.ceil(letra.length / bookState.linesPerPage);

  const start = bookState.page * bookState.linesPerPage;
  const end = start + bookState.linesPerPage;

  const currentLines = letra.slice(start, end);

  bookContent.textContent = currentLines.join('\n');
  pageIndicator.textContent = `Página ${bookState.page + 1} / ${totalPages}`;
}

// Botones siguiente / anterior
document.addEventListener('click', (e)=>{
  if(e.target.id === 'book-next'){
    changePage(1);
  }
  if(e.target.id === 'book-prev'){
    changePage(-1);
  }
});

function changePage(dir){
  const letra = bookState.songs[bookState.index].letra.split('\n');
  const totalPages = Math.ceil(letra.length / bookState.linesPerPage);

  bookState.page += dir;

  if(bookState.page < 0) bookState.page = 0;
  if(bookState.page >= totalPages) bookState.page = totalPages - 1;

  renderBookPage();
}
/* App JS: Maneja vistas, auth en localStorage, canciones y drag&drop + touch */
const app = document.getElementById('app');
const VIEWS = {
  login: '/views/login.html',
  register: '/views/register.html',
  recover: '/views/recover.html',
  main: '/views/main.html'
};

// Simple fetch de vistas (Acode soporta rutas locales)
async function loadView(path){
  const res = await fetch(path);
  return await res.text();
}

// Render inicial: mostrar login si no hay user en session
(async function init(){
  await showView('login');
})();

async function showView(name){
  const html = await loadView(VIEWS[name]);
  app.innerHTML = html;
  if(name === 'login') bindLogin();
  if(name === 'register') bindRegister();
  if(name === 'recover') bindRecover();
  if(name === 'main') bindMain();
}

// ---- Auth using localStorage ----
function usersKey(){return 'pwb_users_v1'}
function sessionKey(){return 'pwb_session_v1'}
function songsKey(user){return `pwb_songs_${user}`}

function getUsers(){return JSON.parse(localStorage.getItem(usersKey())||'{}')}
function saveUsers(u){localStorage.setItem(usersKey(),JSON.stringify(u))}

function bindLogin(){
  document.getElementById('to-register').onclick = ()=>showView('register');
  document.getElementById('to-recover').onclick = ()=>showView('recover');
  document.getElementById('form-login').onsubmit = e=>{
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const users = getUsers();
    if(users[user] && users[user].pass === pass){
      localStorage.setItem(sessionKey(), user);
      showView('main');
    } else alert('Usuario o contraseña incorrectos');
  }
}

function bindRegister(){
  document.getElementById('to-login-from-register').onclick = ()=>showView('login');
  document.getElementById('form-register').onsubmit = e=>{
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const user = document.getElementById('reg-user').value.trim();
    const key = document.getElementById('reg-key').value;
    const pass = document.getElementById('reg-pass').value;
    const users = getUsers();
    if(users[user]){alert('Usuario ya existe');return}
    users[user] = {nombre,apellido,key,pass};
    saveUsers(users);
    alert('Registrado con éxito');
    showView('login');
  }
}

function bindRecover(){
  document.getElementById('to-login-from-recover').onclick = ()=>showView('login');
  document.getElementById('form-recover').onsubmit = e=>{
    e.preventDefault();
    const nombre = document.getElementById('rec-nombre').value.trim();
    const apellido = document.getElementById('rec-apellido').value.trim();
    const user = document.getElementById('rec-user').value.trim();
    const key = document.getElementById('rec-key').value;
    const users = getUsers();
    if(users[user] && users[user].nombre===nombre && users[user].apellido===apellido && users[user].key===key){
      alert('La contraseña es: ' + users[user].pass);
      showView('login');
    } else alert('Datos no coinciden');
  }
}

// ---- Main view logic: songs, drag&drop, touch and book view ----
function bindMain(){
  document.getElementById('logout').onclick = ()=>{localStorage.removeItem(sessionKey());showView('login')};
  const user = localStorage.getItem(sessionKey());
  const users = getUsers();
  document.getElementById('user-welcome').textContent = user? `${users[user].nombre} ${users[user].apellido}` : '';

  const listEl = document.getElementById('songs-list');
  const form = document.getElementById('form-song');
  const bookPages = document.getElementById('book-pages');
  const pageIndicator = document.getElementById('page-indicator');
  let songs = JSON.parse(localStorage.getItem(songsKey(user))||'[]');
  let currentPages = []; 
  let currentPageIdx = 0;

  function renderList(){
    listEl.innerHTML='';
    songs.forEach((s,i)=>{
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.index = i;
      li.textContent = s.name;
      li.addEventListener('click', ()=>{
        li.classList.toggle('selected');
      });
      li.addEventListener('dragstart', e=>{
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', i);
      });
      li.addEventListener('dragend', ()=>li.classList.remove('dragging'));

      let touchTimer = null;
      li.addEventListener('touchstart', ()=>{
        touchTimer = setTimeout(()=>li.classList.toggle('selected'), 600);
      });
      li.addEventListener('touchend', ()=>{
        if(touchTimer) clearTimeout(touchTimer);
      });

      listEl.appendChild(li);
    });
  }

  listEl.addEventListener('dragover', e=>{
    e.preventDefault();
    const dragging = listEl.querySelector('.dragging');
    const after = Array.from(listEl.children).find(li=>{
      const box = li.getBoundingClientRect();
      return e.clientY < box.top + box.height/2;
    });
    listEl.insertBefore(dragging, after);
  });

  function saveSongs(){
    localStorage.setItem(songsKey(user), JSON.stringify(songs));
  }

  form.onsubmit = e=>{
    e.preventDefault();
    const name = document.getElementById('song-name').value.trim();
    const lyrics = document.getElementById('song-lyrics').value;
    if(!name) return;
    songs.push({name, lyrics});
    saveSongs();
    form.reset();
    renderList();
  };

  document.getElementById('open-selected').onclick = ()=>{
    const selected = Array.from(listEl.querySelectorAll('.selected'));
    if(selected.length === 0){ alert('No seleccionaste canciones'); return; }

    currentPages = selected.map(li=>{
      const idx = parseInt(li.dataset.index);
      return songs[idx];
    });
    currentPageIdx = 0;
    renderBook();
  };

  document.getElementById('clear-selected').onclick = ()=>{
    listEl.querySelectorAll('.selected').forEach(li=>li.classList.remove('selected'));
  };

  function renderBook(){
    if(currentPages.length === 0){ 
      bookPages.innerHTML = '<p>No hay páginas</p>';
      pageIndicator.textContent = '0 / 0';
      return;
    }
    const page = currentPages[currentPageIdx];
    bookPages.innerHTML = `
      <h2>${page.name}</h2>
      <pre>${page.lyrics}</pre>
    `;
    pageIndicator.textContent = `${currentPageIdx+1} / ${currentPages.length}`;
  }

  document.getElementById('prev-page').onclick = ()=>{
    if(currentPageIdx > 0){
      currentPageIdx--;
      renderBook();
    }
  };

  document.getElementById('next-page').onclick = ()=>{
    if(currentPageIdx < currentPages.length-1){
      currentPageIdx++;
      renderBook();
    }
  };

  renderList();
}/* App JS: Maneja vistas, auth en localStorage, canciones y drag&drop + touch */
const app = document.getElementById('app');
const VIEWS = {
  login: '/views/login.html',
  register: '/views/register.html',
  recover: '/views/recover.html',
  main: '/views/main.html'
};

// Simple fetch de vistas (Acode soporta rutas locales)
async function loadView(path){
  const res = await fetch(path);
  return await res.text();
}

// Render inicial: mostrar login si no hay user en session
(async function init(){
  await showView('login');
})();

async function showView(name){
  const html = await loadView(VIEWS[name]);
  app.innerHTML = html;
  if(name === 'login') bindLogin();
  if(name === 'register') bindRegister();
  if(name === 'recover') bindRecover();
  if(name === 'main') bindMain();
}

// ---- Auth using localStorage ----
function usersKey(){return 'pwb_users_v1'}
function sessionKey(){return 'pwb_session_v1'}
function songsKey(user){return `pwb_songs_${user}`}

function getUsers(){return JSON.parse(localStorage.getItem(usersKey())||'{}')}
function saveUsers(u){localStorage.setItem(usersKey(),JSON.stringify(u))}

function bindLogin(){
  document.getElementById('to-register').onclick = ()=>showView('register');
  document.getElementById('to-recover').onclick = ()=>showView('recover');
  document.getElementById('form-login').onsubmit = e=>{
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const users = getUsers();
    if(users[user] && users[user].pass === pass){
      localStorage.setItem(sessionKey(), user);
      showView('main');
    } else alert('Usuario o contraseña incorrectos');
  }
}

function bindRegister(){
  document.getElementById('to-login-from-register').onclick = ()=>showView('login');
  document.getElementById('form-register').onsubmit = e=>{
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const user = document.getElementById('reg-user').value.trim();
    const key = document.getElementById('reg-key').value;
    const pass = document.getElementById('reg-pass').value;
    const users = getUsers();
    if(users[user]){alert('Usuario ya existe');return}
    users[user] = {nombre,apellido,key,pass};
    saveUsers(users);
    alert('Registrado con éxito');
    showView('login');
  }
}

function bindRecover(){
  document.getElementById('to-login-from-recover').onclick = ()=>showView('login');
  document.getElementById('form-recover').onsubmit = e=>{
    e.preventDefault();
    const nombre = document.getElementById('rec-nombre').value.trim();
    const apellido = document.getElementById('rec-apellido').value.trim();
    const user = document.getElementById('rec-user').value.trim();
    const key = document.getElementById('rec-key').value;
    const users = getUsers();
    if(users[user] && users[user].nombre===nombre && users[user].apellido===apellido && users[user].key===key){
      alert('La contraseña es: ' + users[user].pass);
      showView('login');
    } else alert('Datos no coinciden');
  }
}

// ---- Main view logic: songs, drag&drop, touch and book view ----
function bindMain(){
  document.getElementById('logout').onclick = ()=>{localStorage.removeItem(sessionKey());showView('login')};
  const user = localStorage.getItem(sessionKey());
  const users = getUsers();
  document.getElementById('user-welcome').textContent = user? `${users[user].nombre} ${users[user].apellido}` : '';

  const listEl = document.getElementById('songs-list');
  const form = document.getElementById('form-song');
  const bookPages = document.getElementById('book-pages');
  const pageIndicator = document.getElementById('page-indicator');
  let songs = JSON.parse(localStorage.getItem(songsKey(user))||'[]');
  let currentPages = []; 
  let currentPageIdx = 0;

  function renderList(){
    listEl.innerHTML='';
    songs.forEach((s,i)=>{
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.index = i;
      li.textContent = s.name;
      li.addEventListener('click', ()=>{
        li.classList.toggle('selected');
      });
      li.addEventListener('dragstart', e=>{
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', i);
      });
      li.addEventListener('dragend', ()=>li.classList.remove('dragging'));

      let touchTimer = null;
      li.addEventListener('touchstart', ()=>{
        touchTimer = setTimeout(()=>li.classList.toggle('selected'), 600);
      });
      li.addEventListener('touchend', ()=>{
        if(touchTimer) clearTimeout(touchTimer);
      });

      listEl.appendChild(li);
    });
  }

  listEl.addEventListener('dragover', e=>{
    e.preventDefault();
    const dragging = listEl.querySelector('.dragging');
    const after = Array.from(listEl.children).find(li=>{
      const box = li.getBoundingClientRect();
      return e.clientY < box.top + box.height/2;
    });
    listEl.insertBefore(dragging, after);
  });

  function saveSongs(){
    localStorage.setItem(songsKey(user), JSON.stringify(songs));
  }

  form.onsubmit = e=>{
    e.preventDefault();
    const name = document.getElementById('song-name').value.trim();
    const lyrics = document.getElementById('song-lyrics').value;
    if(!name) return;
    songs.push({name, lyrics});
    saveSongs();
    form.reset();
    renderList();
  };

  document.getElementById('open-selected').onclick = ()=>{
    const selected = Array.from(listEl.querySelectorAll('.selected'));
    if(selected.length === 0){ alert('No seleccionaste canciones'); return; }

    currentPages = selected.map(li=>{
      const idx = parseInt(li.dataset.index);
      return songs[idx];
    });
    currentPageIdx = 0;
    renderBook();
  };

  document.getElementById('clear-selected').onclick = ()=>{
    listEl.querySelectorAll('.selected').forEach(li=>li.classList.remove('selected'));
  };

  function renderBook(){
    if(currentPages.length === 0){ 
      bookPages.innerHTML = '<p>No hay páginas</p>';
      pageIndicator.textContent = '0 / 0';
      return;
    }
    const page = currentPages[currentPageIdx];
    bookPages.innerHTML = `
      <h2>${page.name}</h2>
      <pre>${page.lyrics}</pre>
    `;
    pageIndicator.textContent = `${currentPageIdx+1} / ${currentPages.length}`;
  }

  document.getElementById('prev-page').onclick = ()=>{
    if(currentPageIdx > 0){
      currentPageIdx--;
      renderBook();
    }
  };

  document.getElementById('next-page').onclick = ()=>{
    if(currentPageIdx < currentPages.length-1){
      currentPageIdx++;
      renderBook();
    }
  };

  renderList();
     }
