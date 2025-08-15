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
  
  auth.signInWithPopup(provider)
    .then(() => {
      hideLoading();
      window.location.reload();
    })
    .catch(error => {
      hideLoading();
      console.error("Error al iniciar sesión:", error);
      alert("Error al iniciar sesión. Por favor intenta nuevamente.");
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
      document.getElementById('mainContainer').style.display = 'block';
      loadAppData();
    } else {
      console.log("Usuario no autenticado");
      document.getElementById('mainContainer').style.display = 'none';
      
      if (!document.getElementById('loginBtnContainer')) {
        const loginContainer = document.createElement('div');
        loginContainer.id = 'loginBtnContainer';
        loginContainer.style.textAlign = 'center';
        loginContainer.style.marginTop = '20%';
        
        const loginBtn = document.createElement('button');
        loginBtn.textContent = 'Iniciar sesión con Google';
        loginBtn.className = 'google-login-btn';
        loginBtn.onclick = loginWithGoogle;
        
        loginContainer.appendChild(loginBtn);
        document.body.appendChild(loginContainer);
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
function loadData() {
  const tableBody = document.getElementById('pizarra-table').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';
  
  database.forEach(item => {
    const newRow = tableBody.insertRow();
    
    // Celdas básicas
    newRow.insertCell(0).textContent = item.guia;
    newRow.insertCell(1).textContent = item.manifiesto;
    
    // Celda RETENER
    const descCell = newRow.insertCell(2);
    descCell.textContent = item.descripcion;
    if(item.descripcion === "RETENER") {
      descCell.className = 'retener';
    }
    
    // Celda CIUDAD - SIEMPRE visible si existe
    const ciudadCell = newRow.insertCell(3);
    if(item.ciudad && (item.ciudad === 'GYE' || item.ciudad === 'QUT')) {
      ciudadCell.textContent = item.ciudad;
      ciudadCell.className = 'retener-amarillo';
    }
    
    // Si ya está asignado, aplicar colores
    if(item.ciudad && item.descripcion === "RETENER") {
      if(item.ciudad === "GYE") {
        descCell.classList.add('retener-amarillo');
        ciudadCell.classList.add('retener-amarillo');
      } else if(item.ciudad === "QUT") {
        descCell.classList.add('retener-naranja');
        ciudadCell.classList.add('retener-naranja');
      }
    }
    
    // Celda ACCIONES
    const actionCell = newRow.insertCell(4);
    actionCell.innerHTML = generateActionButtons(item.descripcion, item.guia);
  });
  updateCounter();
}

function generateActionButtons(descripcion, guia) {
  if (descripcion === "RETENER") {
    return `
      <div class="action-buttons">
        <div class="action-trigger">
          <button class="btn-action btn-blue" onclick="toggleActionMenu(this)">Acción</button>
          <div class="action-menu">
            <button class="btn-action btn-light-blue" onclick="assignFromRow(this, '${guia}')">Asignar</button>
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
async function assignFromRow(button, guia) {
  const row = button.closest('tr');
  const manifiesto = row.cells[1].textContent;
  
  if (manifestAssignments[manifiesto]) {
    const ciudad = manifestAssignments[manifiesto];
    const index = database.findIndex(item => item.guia === guia);
    
    if (index !== -1) {
      database[index].ciudad = ciudad;
      
      try {
        await saveToFirestore();
        
        // Obtener celdas
        const descCell = row.cells[2];
        const ciudadCell = row.cells[3];
        
        // Asegurar que la ciudad sea visible
        ciudadCell.textContent = ciudad;
        ciudadCell.className = 'ciudad-blanca';
        
        // Aplicar colores según ciudad
        if(ciudad === 'GYE') {
          descCell.className = 'retener retener-amarillo';
          ciudadCell.classList.add('retener-amarillo');
        } else if(ciudad === 'QUT') {
          descCell.className = 'retener retener-naranja';
          ciudadCell.classList.add('retener-naranja');
        }
        
      } catch (error) {
        console.error(error);
      }
    }
  } else {
    alert('Este manifiesto no tiene ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
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

  manifestAssignments[manifiesto] = ciudad;
  
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

  database.push({
    guia: guia,
    manifiesto: manifiesto,
    descripcion: descripcion,
    ciudad: ''
  });
  
  try {
    await saveToFirestore();
    loadData();
    document.getElementById('add-guia').value = '';
    document.getElementById('add-manifiesto').value = '';
    document.getElementById('add-descripcion').value = '';
    closeAddModal();
  } catch (error) {
    console.error("Error al agregar:", error);
    alert("Error al agregar el item. Intente nuevamente.");
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

        const ciudad = descripcion === "RETENER" ? '' : (database.find(item => item.guia === guia)?.ciudad || '');

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

async function liberarFromRow(button) {
  const row = button.closest('tr');
  const guia = row.cells[0].textContent;
  
  const index = database.findIndex(item => item.guia === guia);
  if(index !== -1) {
    const ciudadActual = database[index].ciudad;
    database[index] = {
      ...database[index],
      descripcion: "LIBERAR",
      ciudad: ciudadActual
    };
    
    try {
      await saveToFirestore();
      loadData();
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