/* Music Book — app.js
   Funciones principales:
   - persistencia en localStorage
   - CRUD (crear, leer, actualizar, eliminar)
   - búsqueda
   - export/import JSON (útil para backup)
   - manejo básico de la UI dentro de este archivo (SPA simple)
*/

/* ----- Configuración ----- */
// Clave usada en localStorage
const STORAGE_KEY = 'musicbook.songs';

// Elementos DOM
const el = {
  list: document.getElementById('song-list'),
  btnAdd: document.getElementById('btn-add'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modal-title'),
  inputTitle: document.getElementById('input-title'),
  inputLyrics: document.getElementById('input-lyrics'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  viewer: document.getElementById('viewer'),
  songTitle: document.getElementById('song-title'),
  songLyrics: document.getElementById('song-lyrics'),
  btnEdit: document.getElementById('btn-edit'),
  btnDelete: document.getElementById('btn-delete'),
  btnBack: document.getElementById('btn-back'),
  search: document.getElementById('search'),
  btnExport: document.getElementById('btn-export'),
  btnImport: document.getElementById('btn-import')
};

// Estado de la app
let songs = [];         // array de canciones {title, lyrics, id}
let currentIndex = -1;  // índice de la canción abierta (o -1)
let editingIndex = -1;  // índice que estamos editando en el modal (-1 si es nueva)

/* ----- Utilitarios ----- */
// Genera un id simple basado en tiempo (suficiente para local)
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Cargar canciones desde localStorage
function loadSongs() {
  try {
    songs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    console.warn('Error leyendo storage, reseteando', e);
    songs = [];
  }
}

// Guardar en localStorage
function saveSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

/* ----- Renderizado ----- */
// Renderiza la lista según la búsqueda
function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  el.list.innerHTML = songs
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !q || s.title.toLowerCase().includes(q))
    .map(({ s, i }) => {
      // cada item tiene data-index para identificar
      return `
      <li data-index="${i}" class="song-item">
        <div>
          <strong>${escapeHtml(s.title)}</strong>
          <div class="meta">${shortPreview(s.lyrics)}</div>
        </div>
        <div><button class="btn small open-btn">Ver</button></div>
      </li>`;
    }).join('') || '<li class="meta">No hay canciones. Agrega una nueva.</li>';

  // Attach events to items
  document.querySelectorAll('.song-item').forEach(li => {
    li.querySelector('.open-btn').addEventListener('click', e => {
      const idx = Number(li.getAttribute('data-index'));
      openSong(idx);
    });
  });
}

// Muestra un pequeño preview de la letra
function shortPreview(lyrics) {
  if (!lyrics) return '';
  const s = lyrics.trim().split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

// Escapa HTML básico para evitar inyección simple al mostrar
function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/* ----- CRUD ----- */
function addSong(title, lyrics) {
  const item = { id: genId(), title: title.trim(), lyrics: lyrics.trim() };
  songs.unshift(item); // añadir al inicio
  saveSongs();
  renderList(el.search.value);
  return item;
}

function updateSong(index, title, lyrics) {
  if (index < 0 || index >= songs.length) return null;
  songs[index].title = title.trim();
  songs[index].lyrics = lyrics.trim();
  saveSongs();
  renderList(el.search.value);
  return songs[index];
}

function deleteSong(index) {
  if (!confirm('¿Eliminar esta canción?')) return false;
  songs.splice(index, 1);
  saveSongs();
  renderList(el.search.value);
  closeViewer();
  return true;
}

/* ----- Vista detalle ----- */
function openSong(index) {
  if (index < 0 || index >= songs.length) return;
  currentIndex = index;
  const s = songs[index];
  el.songTitle.textContent = s.title;
  el.songLyrics.textContent = s.lyrics;
  el.viewer.classList.remove('hidden');
  // Scroll to viewer
  el.viewer.scrollIntoView({ behavior: 'smooth' });
}

function closeViewer() {
  currentIndex = -1;
  el.viewer.classList.add('hidden');
}

/* ----- Modal para crear/editar ----- */
function openModalForNew() {
  editingIndex = -1;
  el.modalTitle.textContent = 'Nueva canción';
  el.inputTitle.value = '';
  el.inputLyrics.value = '';
  el.modal.showModal();
  el.inputTitle.focus();
}

function openModalForEdit(index) {
  editingIndex = index;
  const s = songs[index];
  el.modalTitle.textContent = 'Editar canción';
  el.inputTitle.value = s.title;
  el.inputLyrics.value = s.lyrics;
  el.modal.showModal();
  el.inputTitle.focus();
}

/* ----- Export / Import (JSON) ----- */
function exportSongs() {
  const data = JSON.stringify(songs, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'musicbook-songs.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSongs() {
  // Usamos input file temporal
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json';
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('Formato inválido');
        // Podemos fusionar o reemplazar — aquí preguntamos
        if (confirm('¿Reemplazar todas las canciones con las del archivo? pulsa "Cancelar" para fusionar.')) {
          songs = data;
        } else {
          // fusionar: añadimos items nuevos conservando IDs (si hay duplicados, se añaden igual)
          songs = [...data, ...songs];
        }
        saveSongs();
        renderList(el.search.value);
        alert('Importación completada.');
      } catch (err) {
        alert('Archivo inválido: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  };
  inp.click();
}

/* ----- Eventos UI ----- */
function bindEvents() {
  el.btnAdd.addEventListener('click', openModalForNew);

  // Modal save: crear o actualizar
  el.btnSave.addEventListener('click', (e) => {
    e.preventDefault();
    const title = el.inputTitle.value.trim();
    const lyrics = el.inputLyrics.value.trim();
    if (!title || !lyrics) {
      alert('Título y letra son obligatorios.');
      return;
    }
    if (editingIndex === -1) {
      addSong(title, lyrics);
    } else {
      updateSong(editingIndex, title, lyrics);
      editingIndex = -1;
    }
    el.modal.close();
  });

  el.btnCancel.addEventListener('click', () => el.modal.close());

  // Viewer actions
  el.btnBack.addEventListener('click', closeViewer);
  el.btnEdit.addEventListener('click', () => {
    if (currentIndex >= 0) openModalForEdit(currentIndex);
  });
  el.btnDelete.addEventListener('click', () => {
    if (currentIndex >= 0) deleteSong(currentIndex);
  });

  // Búsqueda en tiempo real
  el.search.addEventListener('input', () => renderList(el.search.value));

  // Export / Import
  el.btnExport.addEventListener('click', exportSongs);
  el.btnImport.addEventListener('click', importSongs);
}

/* ----- Inicialización ----- */
function init() {
  loadSongs();
  bindEvents();
  renderList();
  console.log('Music Book listo');
}

// Ejecutar init cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ----- Notas:
   - Este app.js usa localStorage: es simple y suficiente para un libro de letras.
   - Si manejas muchas canciones o archivos grandes, considera IndexedDB.
   - Para sincronizar con la nube necesitarás un backend y endpoints.
*/
