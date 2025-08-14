/**************************************
 * VARIABLES GLOBALES Y CONFIGURACIÓN *
 **************************************/
let database = [];
let manifestAssignments = {};
let currentEditingRow = null;

// Configuración de Firebase
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
  const provider = new firebase.auth.GoogleAuthProvider();
  showLoading();
  
  auth.signInWithRedirect(provider)
    .catch(error => {
      console.error("Error redirección:", error);
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

function initAuthStateListener() {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("Usuario autenticado:", user.email);
      loadAppData();
    } else {
      console.log("Usuario no autenticado");
      // Mostrar un botón de login en lugar de redireccionar automáticamente
      if (!document.getElementById('loginBtn')) {
        const loginBtn = document.createElement('button');
        loginBtn.id = 'loginBtn';
        loginBtn.textContent = 'Iniciar sesión con Google';
        loginBtn.className = 'google-login-btn';
        loginBtn.onclick = loginWithGoogle;
        
        const container = document.querySelector('.container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(loginBtn);
        }
      }
    }
  });
}

// Agregar estilos para el botón de Google
const style = document.createElement('style');
style.textContent = `
  .google-login-btn {
    padding: 12px 24px;
    background-color: #4285F4;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20% auto;
  }
  .google-login-btn:hover {
    background-color: #3367D6;
  }
`;
document.head.appendChild(style);

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
    }, { merge: true });
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
// Modificar la función loadData para mantener los colores correctamente
function loadData() {
  const tableBody = document.getElementById('pizarra-table').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';
  
  database.forEach(item => {
    const newRow = tableBody.insertRow();
    let descClass = '';
    let ciudadClass = '';
    
    // Obtener ciudad para TODOS los items
    const ciudad = manifestAssignments[item.manifiesto] || item.ciudad || '';
    
    // Aplicar estilos basados en el estado guardado
    if(item.descripcion === "RETENER") {
      if(ciudad === "GYE") {
        descClass = 'retener-amarillo';
        ciudadClass = 'retener-amarillo';
      } else if(ciudad === "QUT") {
        descClass = 'retener-naranja';
        ciudadClass = 'retener-naranja';
      } else {
        descClass = 'retener';
      }
    } else if(item.descripcion === "LIBERAR") {
      descClass = 'liberar';
      ciudadClass = 'liberar';
    }
    
    newRow.innerHTML = `
      <td>${item.guia}</td>
      <td>${item.manifiesto}</td>
      <td class="${descClass}">${item.descripcion}</td>
      <td class="${ciudadClass}">${ciudad}</td>
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
async function assignFromRow(button) {
  const row = button.closest('tr');
  const guia = row.cells[0].textContent;
  const manifiesto = row.cells[1].textContent;
  
  if (manifestAssignments[manifiesto]) {
    const ciudad = manifestAssignments[manifiesto];
    
    // Actualizar en la base de datos
    const index = database.findIndex(item => item.guia === guia);
    if (index !== -1) {
      database[index].ciudad = ciudad;
      
      try {
        await saveToFirestore();
        
        // Aplicar estilos solo cuando se hace clic en Asignar
        const descCell = row.cells[2];
        const ciudadCell = row.cells[3];
        
        if (ciudad === "GYE") {
          descCell.className = 'retener-amarillo';
          ciudadCell.className = 'retener-amarillo';
        } else if (ciudad === "QUT") {
          descCell.className = 'retener-naranja';
          ciudadCell.className = 'retener-naranja';
        }
        
        // Actualizar el texto de la ciudad
        ciudadCell.textContent = ciudad;
      } catch (error) {
        console.error(error);
      }
    }
  } else {
    alert('Este manifiesto no tiene una ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
  }
  
  toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
}

async function assignManifest() {
  const manifiesto = document.getElementById('assign-manifiesto').value.trim();
  const ciudad = document.getElementById('assign-ciudad').value;
  
  if (!manifiesto || !ciudad) {
    alert('Complete todos los campos');
    return;
  }

  // Asignar ciudad al manifiesto
  manifestAssignments[manifiesto] = ciudad;
  
  // Actualizar ciudad en la base de datos (sin cambiar estilos aún)
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

async function addItem() {
  const guia = document.getElementById('add-guia').value;
  const manifiesto = document.getElementById('add-manifiesto').value;
  const descripcion = document.getElementById('add-descripcion').value;
  
  if (!guia || !manifiesto || !descripcion) {
    alert('Por favor complete los campos obligatorios');
    return;
  }

  // Ciudad solo se asigna si es RETENER y el manifiesto está asignado
  const ciudad = (descripcion === "RETENER" && manifestAssignments[manifiesto]) ? manifestAssignments[manifiesto] : '';
  
  database.push({
    guia: guia,
    manifiesto: manifiesto,
    descripcion: descripcion,
    ciudad: ciudad // Esto ahora puede estar vacío incluso para RETENER
  });
  
  try {
    await saveToFirestore();
    loadData();
    document.getElementById('add-guia').value = '';
    document.getElementById('add-manifiesto').value = '';
    document.getElementById('add-descripcion').value = '';
    closeAddModal();
  } catch (error) {
    console.error(error);
  }
}

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

      for (let i = 1; i < jsonData.length; i++) {
        const rowData = jsonData[i];
        if (!rowData || rowData.length < 3) continue;

        const guia = (rowData[0]?.toString() || '').trim();
        const manifiesto = (rowData[1]?.toString() || '').trim();
        const descripcion = (rowData[2]?.toString() || '').trim().toUpperCase();
        
        if (!guia || !manifiesto || !descripcion) continue;

        // Obtener ciudad del manifiesto si existe
        let ciudad = '';
        if (manifestAssignments[manifiesto]) {
          ciudad = manifestAssignments[manifiesto];
        }

        const existingIndex = database.findIndex(item => item.guia === guia);

        if (existingIndex === -1) {
          database.push({
            guia,
            manifiesto,
            descripcion,
            ciudad
          });
        } else {
          database[existingIndex] = {
            guia,
            manifiesto,
            descripcion,
            ciudad: ciudad || database[existingIndex].ciudad || ''
          };
        }
      }

      await saveToFirestore();
      loadData();
      alert(`Importadas ${jsonData.length - 1} guías correctamente`);
    } catch (error) {
      console.error("Error en importación:", error);
      alert("Error al importar. Verifica el formato del Excel.");
    } finally {
      hideLoading();
      fileInput.value = '';
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
  
  // Actualizar la fila en la interfaz
  currentEditingRow.cells[0].textContent = guia;
  currentEditingRow.cells[1].textContent = manifiesto;
  currentEditingRow.cells[2].textContent = descripcion;
  
  // Actualizar en la base de datos
  const index = database.findIndex(item => item.guia === currentEditingRow.cells[0].textContent);
  if(index !== -1) {
    const ciudad = (descripcion === "RETENER" && manifestAssignments[manifiesto]) ? manifestAssignments[manifiesto] : '';
    
    database[index] = {
      guia: guia,
      manifiesto: manifiesto,
      descripcion: descripcion,
      ciudad: ciudad
    };
    
    await saveToFirestore();
    loadData(); // Recargar los datos para asegurar consistencia
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
      row.cells[3].className = 'liberar';
      
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
  if(!e.target.closest('.action-trigger')) {
    document.querySelectorAll('.action-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  }
  
  const modals = ['addModal', 'assignModal', 'editModal'];
  modals.forEach(modalId => {
    if (e.target == document.getElementById(modalId)) {
      document.getElementById(modalId).style.display = 'none';
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  initAuthStateListener();
});