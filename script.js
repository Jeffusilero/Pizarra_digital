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
      
      // Mostrar botón de login
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
    let descClass = '';
    let ciudadClass = '';
    let ciudadText = '';
    
    if(item.descripcion === "RETENER") {
      // Por defecto rojo en descripción, blanco en ciudad
      descClass = 'retener';
      
      // Si tiene ciudad asignada, aplicar colores correspondientes
      if(item.ciudad) {
        ciudadText = item.ciudad;
        if(item.ciudad === "GYE") {
          descClass = 'retener-amarillo';
          ciudadClass = 'retener-amarillo';
        } else if(item.ciudad === "QUT") {
          descClass = 'retener-naranja';
          ciudadClass = 'retener-naranja';
        }
      }
    } else if(item.descripcion === "LIBERAR") {
      // Para LIBERAR, ambos campos verdes y ciudad vacía
      descClass = 'liberar';
      ciudadClass = 'liberar';
      ciudadText = '';
    }
    
    newRow.innerHTML = `
      <td>${item.guia}</td>
      <td>${item.manifiesto}</td>
      <td class="${descClass}">${item.descripcion}</td>
      <td class="${ciudadClass}">${ciudadText}</td>
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
        loadData(); // Recargar para mostrar cambios
      } catch (error) {
        console.error(error);
      }
    }
  } else {
    alert('Este manifiesto no tiene una ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
  }
  
  toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
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
      loadData(); // Recargar para mostrar cambios
    } catch (error) {
      alert('Error al liberar el item');
      console.error(error);
    }
  }
  
  toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
}

// Resto de funciones permanecen igual...
// (openAddModal, closeAddModal, openAssignModal, closeAssignModal, 
//  closeEditModal, assignManifest, addItem, handleFileImport, 
//  deleteItem, showLoading, hideLoading, updateCounter, 
//  toggleActionMenu, filterTable)

document.addEventListener('DOMContentLoaded', () => {
  initAuthStateListener();
});