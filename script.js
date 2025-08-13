/**************************************
 * VARIABLES GLOBALES Y CONFIGURACIÓN *
 **************************************/
let database = [];
let manifestAssignments = {};
let currentEditingRow = null;

// Configuración de Firebase (REEMPLAZA CON TUS DATOS)
const firebaseConfig = {
  apiKey: "AIzaSyD7ZJ5qaJ4tsy-lRCifOiRsRS42R9OQKNA",
  authDomain: "pizarra-digital-29922.firebaseapp.com",
  projectId: "pizarra-digital-29922",
  storageBucket: "pizarra-digital-29922.appspot.com",
  messagingSenderId: "205605287574",
  appId: "1:205605287574:web:e56c8f071906d89f7774b7",
  measurementId: "G-6KWBGN070G"
};

// Inicialización de Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


/*****************************
 * AUTENTICACIÓN CON GOOGLE *
 *****************************/
function loginWithGoogle() {
  showLoading();
  const provider = new firebase.auth.GoogleAuthProvider();
  
  auth.signInWithPopup(provider)
    .then((result) => {
      console.log("Usuario de Google:", result.user.displayName);
    })
    .catch((error) => {
      console.error("Error en login con Google:", error);
      alert(`Error: ${error.message}`);
    })
    .finally(() => hideLoading());
}

function logoutUser() {
  showLoading();
  auth.signOut()
    .then(() => window.location.reload())
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
      hideLoading();
    });
}

// Listener de estado de autenticación
function initAuthStateListener() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("Usuario autenticado:", user.displayName);
      loadAppData();
    } else {
      console.log("No autenticado - Redirigiendo a Google");
      loginWithGoogle(); // Login automático con Google
    }
  });
}

/*****************************
 * FUNCIONES PRINCIPALES *
 *****************************/
async function loadAppData() {
  showLoading();
  try {
    const data = await loadFromFirestore();
    database = data.database || [];
    manifestAssignments = data.manifest || {};
    loadData();
  } catch (error) {
    console.error("Error cargando datos:", error);
    alert("Error al cargar datos. Recarga la página.");
  } finally {
    hideLoading();
  }
}

async function loadFromFirestore() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    
    const doc = await db.collection("pizarra").doc("datos").get();
    
    if (!doc.exists) {
      await db.collection("pizarra").doc("datos").set({
        database: [],
        manifest: {}
      });
      return { database: [], manifest: {} };
    }
    return doc.data();
  } catch (error) {
    console.error("Error en loadFromFirestore:", error);
    throw error;
  }
}

async function saveToFirestore() {
  showLoading();
  try {
    await db.collection("pizarra").doc("datos").set({
      database,
      manifest: manifestAssignments
    });
  } catch (error) {
    console.error("Error guardando datos:", error);
    throw error;
  } finally {
    hideLoading();
  }
}

/*****************************
 * FUNCIONES DE INTERFAZ *
 *****************************/
function loadData() {
  const tableBody = document.getElementById('pizarra-table').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';
  
  database.forEach(item => {
    const newRow = tableBody.insertRow();
    let descClass = '';
    
    if(item.descripcion === "RETENER") {
      descClass = item.ciudad === "GYE" ? 'retener-amarillo' : 
                 item.ciudad === "QUT" ? 'retener-naranja' : 'retener';
    } else if(item.descripcion === "LIBERAR") {
      descClass = 'liberar';
    }
    
    newRow.innerHTML = `
      <td>${item.guia}</td>
      <td>${item.manifiesto}</td>
      <td class="${descClass}">${item.descripcion}</td>
      <td>${item.ciudad || ''}</td>
      <td>${generateActionButtons(item.descripcion)}</td>
    `;
  });
  updateCounter();
}

function generateActionButtons(descripcion) {
  if (descripcion === "RETENER") {
    return `
      <div class="action-buttons">
        <div class="action-trigger">
          <button class="btn-action btn-blue" onclick="toggleActionMenu(this)">Acción</button>
          <div class="action-menu">
            <button class="btn-action btn-light-blue" onclick="assignFromRow(this)">Asignar</button>
            <button class="btn-action btn-green" onclick="liberarFromRow(this)">Liberar</button>
          </div>
        </div>
        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
      </div>
    `;
  }
  return `
    <div class="action-buttons">
      <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
    </div>
  `;
}

/*****************************
 * FUNCIONES DE MODALES *
 *****************************/
function openAddModal() {
  document.getElementById('addModal').style.display = 'block';
}

function closeAddModal() {
  document.getElementById('addModal').style.display = 'none';
}

function openAssignModal() {
  document.getElementById('assignModal').style.display = 'block';
}

function closeAssignModal() {
  document.getElementById('assignModal').style.display = 'none';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

/*****************************
 * FUNCIONES DE OPERACIONES *
 *****************************/
async function addItem() {
  const guia = document.getElementById('add-guia').value;
  const manifiesto = document.getElementById('add-manifiesto').value;
  const descripcion = document.getElementById('add-descripcion').value;
  
  if (!guia || !manifiesto || !descripcion) {
    alert('Por favor complete los campos obligatorios');
    return;
  }
  
  if (database.some(item => item.guia === guia)) {
    alert('Esta guía ya existe en el sistema');
    return;
  }
  
  let ciudad = '';
  if (descripcion === "RETENER" && manifestAssignments[manifiesto]) {
    ciudad = manifestAssignments[manifiesto];
  }
  
  database.push({
    guia: guia,
    manifiesto: manifiesto,
    descripcion: descripcion,
    ciudad: ciudad
  });
  
  try {
    await saveToFirestore();
    loadData();
    document.getElementById('add-guia').value = '';
    document.getElementById('add-manifiesto').value = '';
    document.getElementById('add-descripcion').value = '';
    closeAddModal();
  } catch (error) {
    alert('Error al guardar el nuevo item');
    console.error(error);
  }
}

async function assignManifest() {
  const manifiesto = document.getElementById('assign-manifiesto').value;
  const ciudad = document.getElementById('assign-ciudad').value;
  
  if (!manifiesto || !ciudad) {
    alert('Por favor complete todos los campos');
    return;
  }
  
  manifestAssignments[manifiesto] = ciudad;
  
  database.forEach(item => {
    if (item.manifiesto === manifiesto && item.descripcion === "RETENER") {
      item.ciudad = ciudad;
    }
  });
  
  try {
    await saveToFirestore();
    loadData();
    document.getElementById('assign-manifiesto').value = '';
    document.getElementById('assign-ciudad').value = '';
    closeAssignModal();
  } catch (error) {
    alert('Error al guardar los cambios');
    console.error(error);
  }
}

async function deleteItem(button) {
  if (!confirm('¿Está seguro que desea eliminar este item?')) return;
  
  const row = button.closest('tr');
  const guia = row.cells[0].textContent;
  
  database = database.filter(item => item.guia !== guia);
  
  try {
    await saveToFirestore();
    row.remove();
    updateCounter();
  } catch (error) {
    alert('Error al eliminar el item');
    console.error(error);
  }
}

function editItem(button) {
  const row = button.closest('tr');
  currentEditingRow = row;
  
  const guia = row.cells[0].textContent;
  const manifiesto = row.cells[1].textContent;
  const descripcion = row.cells[2].textContent;
  
  document.getElementById('edit-guia').value = guia;
  document.getElementById('edit-manifiesto').value = manifiesto;
  document.getElementById('edit-descripcion').value = descripcion;
  
  document.getElementById('editModal').style.display = 'block';
}

async function saveChanges() {
  const guia = document.getElementById('edit-guia').value;
  const manifiesto = document.getElementById('edit-manifiesto').value;
  const descripcion = document.getElementById('edit-descripcion').value;
  
  if (!guia) {
    alert('Por favor complete la guía');
    return;
  }
  
  currentEditingRow.cells[0].textContent = guia;
  currentEditingRow.cells[1].textContent = manifiesto;
  currentEditingRow.cells[2].textContent = descripcion;
  
  if (descripcion === "RETENER") {
    const ciudad = currentEditingRow.cells[3].textContent;
    if(ciudad === "GYE") {
      currentEditingRow.cells[2].className = 'retener-amarillo';
    } else if(ciudad === "QUT") {
      currentEditingRow.cells[2].className = 'retener-naranja';
    } else {
      currentEditingRow.cells[2].className = 'retener';
    }
    
    const actionCell = currentEditingRow.cells[4];
    actionCell.innerHTML = `
      <div class="action-buttons">
        <div class="action-trigger">
          <button class="btn-action btn-blue" onclick="toggleActionMenu(this)">Acción</button>
          <div class="action-menu">
            <div class="action-buttons">
              <button class="btn-action btn-light-blue" onclick="assignFromRow(this)">Asignar</button>
              <button class="btn-action btn-green" onclick="liberarFromRow(this)">Liberar</button>
            </div>
          </div>
        </div>
        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
      </div>
    `;
  } else if (descripcion === "LIBERAR") {
    currentEditingRow.cells[2].className = 'liberar';
    currentEditingRow.cells[3].textContent = '';
    
    const actionCell = currentEditingRow.cells[4];
    actionCell.innerHTML = `
      <div class="action-buttons">
        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
      </div>
    `;
  } else {
    currentEditingRow.cells[2].className = '';
    currentEditingRow.cells[3].textContent = '';
    
    const actionCell = currentEditingRow.cells[4];
    actionCell.innerHTML = `
      <div class="action-buttons">
        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
      </div>
    `;
  }
  
  const index = database.findIndex(item => item.guia === currentEditingRow.cells[0].textContent);
  if(index !== -1) {
    database[index] = {
      guia: guia,
      manifiesto: manifiesto,
      descripcion: descripcion,
      ciudad: currentEditingRow.cells[3].textContent || ''
    };
    await saveToFirestore();
  }
  
  closeEditModal();
}

async function liberarFromRow(button) {
  const row = button.closest('tr');
  const guia = row.cells[0].textContent;
  
  const index = database.findIndex(item => item.guia === guia);
  if(index !== -1) {
    database[index].descripcion = "LIBERAR";
    database[index].ciudad = '';
    
    try {
      await saveToFirestore();
      
      row.cells[2].textContent = "LIBERAR";
      row.cells[2].className = 'liberar';
      row.cells[3].textContent = '';
      
      const actionCell = row.cells[4];
      actionCell.innerHTML = `
        <div class="action-buttons">
          <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
        </div>
      `;
    } catch (error) {
      alert('Error al liberar el item');
      console.error(error);
    }
  }
  
  toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
}

async function assignFromRow(button) {
  const row = button.closest('tr');
  const manifiesto = row.cells[1].textContent;
  
  if (manifestAssignments[manifiesto]) {
    const ciudad = manifestAssignments[manifiesto];
    
    database.forEach(item => {
      if (item.manifiesto === manifiesto && item.descripcion === "RETENER") {
        item.ciudad = ciudad;
      }
    });
    
    try {
      await saveToFirestore();
      loadData();
    } catch (error) {
      console.error(error);
    }
  } else {
    alert('Este manifiesto no tiene una ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
  }
  
  toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
}

/*****************************
 * FUNCIONES AUXILIARES *
 *****************************/
function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function updateCounter() {
  const count = database.length;
  document.getElementById('itemCounter').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
}

function toggleActionMenu(button) {
  const menu = button.nextElementSibling;
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function filterTable() {
  const input = document.getElementById('searchInput');
  const filter = input.value.toUpperCase();
  const table = document.getElementById('pizarra-table');
  const tr = table.getElementsByTagName('tr');
  
  for (let i = 1; i < tr.length; i++) {
    const td = tr[i].getElementsByTagName('td')[0];
    if (td) {
      const txtValue = td.textContent || td.innerText;
      tr[i].style.display = txtValue.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }       
  }
}

/*****************************
 * EVENT LISTENERS *
 *****************************/
document.addEventListener('click', function(e) {
  // Cerrar menús de acción al hacer clic fuera
  if(!e.target.closest('.action-trigger')) {
    document.querySelectorAll('.action-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  }
  
  // Cerrar modales al hacer clic fuera
  const modals = ['addModal', 'assignModal', 'editModal'];
  modals.forEach(modalId => {
    if (e.target == document.getElementById(modalId)) {
      document.getElementById(modalId).style.display = 'none';
    }
  });
});

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  initAuthStateListener();
});