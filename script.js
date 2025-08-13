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
  // Usa redirect en lugar de popup
  const provider = new firebase.auth.GoogleAuthProvider();
  showLoading();
  
  auth.signInWithRedirect(provider)
    .catch(error => {
      console.error("Error redirección:", error);
      // Fallback a ventana emergente si redirect falla
      auth.signInWithPopup(provider)
        .catch(finalError => {
          alert("Por favor permite ventanas emergentes para iniciar sesión");
          console.error("Error final:", finalError);
        });
    });
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
  auth.onAuthStateChanged(user => {
    if (user) {
      // Verifica si es redirección después de login
      if (auth.isSignInWithEmailLink(window.location.href)) {
        window.location.href = "/"; // Limpia la URL
      }
      loadAppData();
    } else {
      // Solo inicia auto-login en producción, no en localhost
      if (window.location.hostname !== "localhost" && 
          window.location.hostname !== "127.0.0.1") {
        loginWithGoogle();
      }
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
      database: database,
      manifest: manifestAssignments
    }, { merge: true }); // ¡Agrega merge!
    console.log("Datos guardados correctamente");
    return true;
  } catch (error) {
    console.error("Error Firestore:", error.code, error.message);
    alert(`Error al guardar: ${error.message}`);
    return false;
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
    
    // Obtener ciudad del manifiesto (para CUALQUIER descripción)
    const ciudad = manifestAssignments[item.manifiesto] || item.ciudad || '';
    
    if(item.descripcion === "RETENER") {
      descClass = ciudad === "GYE" ? 'retener-amarillo' : 
                 ciudad === "QUT" ? 'retener-naranja' : 'retener';
    } else if(item.descripcion === "LIBERAR") {
      descClass = 'liberar';
    }
    
    newRow.innerHTML = `
      <td>${item.guia}</td>
      <td>${item.manifiesto}</td>
      <td class="${descClass}">${item.descripcion}</td>
      <td>${ciudad}</td> <!-- Muestra ciudad si el manifiesto está asignado -->
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
  
  // Busca ciudad asignada al manifiesto (para CUALQUIER descripción)
  const ciudad = manifestAssignments[manifiesto] || '';
  
  database.push({
    guia: guia,
    manifiesto: manifiesto,
    descripcion: descripcion,
    ciudad: ciudad // Asigna la ciudad si el manifiesto existe
  });
  
  try {
    await saveToFirestore();
    loadData();
    // Limpiar campos...
  } catch (error) {
    console.error(error);
  }
}

async function assignManifest() {
  const manifiesto = document.getElementById('assign-manifiesto').value.trim();
  const ciudad = document.getElementById('assign-ciudad').value;
  
  if (!manifiesto || !ciudad) {
    alert('Complete todos los campos');
    return;
  }

  // Validación adicional
  if (!/^\d+$/.test(manifiesto)) {
    alert('El manifiesto debe contener solo números');
    return;
  }

  manifestAssignments[manifiesto] = ciudad;
  
  // Actualiza solo las guías relevantes
  database.forEach(item => {
    if (item.manifiesto === manifiesto && item.descripcion === "RETENER") {
      item.ciudad = ciudad;
    }
  });
  
  if (await saveToFirestore()) {
    loadData();
    document.getElementById('assign-manifiesto').value = '';
    closeAssignModal();
  }
}

/*****************************
 * FUNCIONES DE OPERACIONES *
 *****************************/
async function handleFileImport(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    showLoading();
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      // Procesar filas desde la 1 (omitir encabezado)
      for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i];
        if (!rowData || rowData.length < 3) continue;

        const guia = (rowData[0]?.toString() || '').trim();
        const manifiesto = (rowData[1]?.toString() || '').trim();
        const descripcion = (rowData[2]?.toString() || '').trim().toUpperCase();
        
        if (!guia || !manifiesto || !descripcion) continue;

        // Obtener ciudad del manifiesto si existe
        let ciudad = '';
        if (descripcion === "RETENER" && manifestAssignments[manifiesto]) {
          ciudad = manifestAssignments[manifiesto];
        }

        // Buscar si la guía ya existe
        const existingIndex = database.findIndex(item => item.guia === guia);

        if (existingIndex === -1) {
          // Guía nueva
          database.push({
            guia,
            manifiesto,
            descripcion,
            ciudad
          });
        } else {
          // Actualizar guía existente
          database[existingIndex] = {
            guia,
            manifiesto,
            descripcion,
            ciudad: ciudad || database[existingIndex].ciudad || ''
          };
        }
      }

      // Actualiza todas las guías RETENER con sus manifiestos asignados
      database.forEach(item => {
        if (item.descripcion === "RETENER" && manifestAssignments[item.manifiesto]) {
          item.ciudad = manifestAssignments[item.manifiesto];
        }
      });

      await saveToFirestore();
      loadData();
      alert(`Importadas ${jsonData.length - 1} guías correctamente`);
    } catch (error) {
      console.error("Error en importación:", error);
      alert("Error al importar. Verifica el formato del Excel.");
    } finally {
      hideLoading();
      fileInput.value = ''; // Limpia el input de archivo
    }
  };
  reader.readAsArrayBuffer(file);
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