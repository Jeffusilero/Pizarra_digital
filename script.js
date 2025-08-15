let database = [];
let manifestAssignments = {};

// Configuración de Firebase (sin cambios)
const firebaseConfig = {
  apiKey: "AIzaSyD7ZJ5qaJ4tsy-lRCifOiRsRS42R9OQKNA",
  authDomain: "pizarra-digital-29922.firebaseapp.com",
  projectId: "pizarra-digital-29922",
  storageBucket: "pizarra-digital-29922.appspot.com",
  messagingSenderId: "205605287574",
  appId: "1:205605287574:web:e56c8f071906d89f7774b7",
  measurementId: "G-6KWBGN070G"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Funciones de autenticación (sin cambios)
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(error => {
    console.error("Error al iniciar sesión:", error);
  });
}

function logoutUser() {
  auth.signOut();
}

function initAuthStateListener() {
  auth.onAuthStateChanged(user => {
    if (user) {
      document.getElementById('mainContainer').style.display = 'block';
      loadAppData();
    } else {
      document.getElementById('mainContainer').style.display = 'none';
    }
  });
}

// Funciones principales
async function loadAppData() {
  showLoading();
  try {
    const data = await loadFromFirestore();
    database = data.database || [];
    manifestAssignments = data.manifest || {};
    loadData();
  } finally {
    hideLoading();
  }
}

async function loadFromFirestore() {
  const user = auth.currentUser;
  if (!user) return { database: [], manifest: {} };
  
  const doc = await db.collection("pizarra").doc("datos").get();
  return doc.exists ? doc.data() : { database: [], manifest: {} };
}

async function saveToFirestore() {
  showLoading();
  try {
    await db.collection("pizarra").doc("datos").set({
      database: database,
      manifest: manifestAssignments
    }, { merge: true });
  } finally {
    hideLoading();
  }
}

// Funciones de interfaz
function loadData() {
  const tableBody = document.getElementById('pizarra-table').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';
  
  database.forEach(item => {
    const newRow = tableBody.insertRow();
    
    newRow.insertCell(0).textContent = item.guia;
    newRow.insertCell(1).textContent = item.manifiesto;
    
    const descCell = newRow.insertCell(2);
    descCell.textContent = item.descripcion;
    
    const ciudadCell = newRow.insertCell(3);
    
    if(item.descripcion === "RETENER") {
      descCell.className = 'retener';
      
      const ciudad = item.ciudad || manifestAssignments[item.manifiesto];
      
      if(ciudad) {
        ciudadCell.textContent = ciudad;
        ciudadCell.className = 'ciudad-blanca';
        
        if(ciudad === "GYE") {
          descCell.classList.add('retener-amarillo');
          ciudadCell.classList.add('ciudad-amarilla');
        } else if(ciudad === "QUT") {
          descCell.classList.add('retener-naranja');
          ciudadCell.classList.add('ciudad-naranja');
        }
      }
    } else {
      ciudadCell.textContent = item.ciudad || '';
    }
    
    const actionCell = newRow.insertCell(4);
    if (item.descripcion === "RETENER") {
      actionCell.innerHTML = `
        <div class="action-buttons">
          <button class="btn-action btn-blue" onclick="assignFromRow('${item.guia}')">Asignar</button>
          <button class="btn-action btn-green" onclick="liberarFromRow('${item.guia}')">Liberar</button>
        </div>
      `;
    }
  });
}

async function assignFromRow(guia) {
  const item = database.find(item => item.guia === guia);
  if (!item) return;
  
  if (manifestAssignments[item.manifiesto]) {
    item.ciudad = manifestAssignments[item.manifiesto];
    await saveToFirestore();
    loadData();
  } else {
    alert('Este manifiesto no tiene ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
  }
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
  
  await saveToFirestore();
  loadData();
  closeAssignModal();
}

async function addItem() {
  const guia = document.getElementById('add-guia').value;
  const manifiesto = document.getElementById('add-manifiesto').value;
  const descripcion = document.getElementById('add-descripcion').value;
  
  if (!guia || !manifiesto || !descripcion) return;

  database.push({
    guia: guia,
    manifiesto: manifiesto,
    descripcion: descripcion,
    ciudad: (descripcion === "RETENER" && manifestAssignments[manifiesto]) ? manifestAssignments[manifiesto] : ''
  });
  
  await saveToFirestore();
  loadData();
  closeAddModal();
}

async function liberarFromRow(guia) {
  const index = database.findIndex(item => item.guia === guia);
  if(index !== -1) {
    database[index].descripcion = "LIBERAR";
    await saveToFirestore();
    loadData();
  }
}

// Funciones auxiliares
function showLoading() {
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initAuthStateListener();
});