            // Configuración de Firebase
            const firebaseConfig = {
            apiKey: "AIzaSyD7ZJ5qaJ4tsy-1RG1f01RsRS42R900NAA",
            authDomain: "pizarra-digital-29922.firebaseapp.com",
            projectId: "pizarra-digital-29922",
            storageBucket: "pizarra-digital-29922.appspot.com",
            messagingSenderId: "2056e8287574",
            appId: "1:2056e8287574:web:e56c9f071966d89777Abb7",
            measurementId: "G-6KWBOH070C"
            };

            // Inicialización de Firebase
            const app = firebase.initializeApp(firebaseConfig);
            const db = firebase.firestore();
            const auth = firebase.auth();

            // Configuración de persistencia de sesión
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(error => console.error("Error en persistencia:", error));

            // Variables globales
            let database = [];
            let manifestAssignments = {};
            let currentEditingRow = null;

            // ================== FUNCIONES DE AUTENTICACIÓN ================== //
            function showLoginModal() {
            document.getElementById('loginModal').style.display = 'block';
            }

            async function loginUser() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            showLoading();
            try {
                await auth.signInWithEmailAndPassword(email, password);
                document.getElementById('loginModal').style.display = 'none';
                loadAppData(); // Cargar datos después de autenticar
            } catch (error) {
                alert(`Error de autenticación: ${error.message}`);
            } finally {
                hideLoading();
            }
            }

            function logoutUser() {
            auth.signOut()
                .then(() => window.location.reload())
                .catch(error => alert(`Error al cerrar sesión: ${error.message}`));
            }

            // ================== FUNCIONES PRINCIPALES ================== //
            async function loadAppData() {
            showLoading();
            try {
                await loadFromFirestore();
                loadData();
            } catch (error) {
                console.error("Error cargando datos:", error);
                alert("Error al cargar datos. Recarga la página.");
            } finally {
                hideLoading();
            }
            }

            async function loadFromFirestore() {
            const doc = await db.collection("pizarra").doc("datos").get();
            
            if (!doc.exists) {
                await db.collection("pizarra").doc("datos").set({
                database: [],
                manifest: {}
                });
            }
            
            const data = doc.data() || {};
            database = data.database || [];
            manifestAssignments = data.manifest || {};
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

            // ================== FUNCIONES DE INTERFAZ ================== //
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

            // ================== EVENT LISTENERS ================== //
            document.addEventListener('DOMContentLoaded', () => {
            showLoading();
            
            auth.onAuthStateChanged(user => {
                if (user) {
                console.log("Usuario autenticado:", user.email);
                loadAppData();
                } else {
                console.log("No autenticado - Mostrando login");
                showLoginModal();
                }
            });
            });

            // ================== FUNCIONES AUXILIARES ================== //
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

        // Función para abrir modal de agregar
        function openAddModal() {
            document.getElementById('addModal').style.display = 'block';
        }
        
        // Función para cerrar modal de agregar
        function closeAddModal() {
            document.getElementById('addModal').style.display = 'none';
        }
        
        // Función para abrir modal de asignación
        function openAssignModal() {
            document.getElementById('assignModal').style.display = 'block';
        }
        
        // Función para cerrar modal de asignación
        function closeAssignModal() {
            document.getElementById('assignModal').style.display = 'none';
        }
        
        // Función para cerrar modal de edición
        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        // Función para cargar datos en la tabla
        function loadData() {
            const tableBody = document.getElementById('pizarra-table').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = '';
            
            database.forEach(item => {
                const newRow = tableBody.insertRow();
                let descClass = '';
                
                if(item.descripcion === "RETENER") {
                    if(item.ciudad === "GYE") {
                        descClass = 'retener-amarillo';
                    } else if(item.ciudad === "QUT") {
                        descClass = 'retener-naranja';
                    } else {
                        descClass = 'retener';
                    }
                } else if(item.descripcion === "LIBERAR") {
                    descClass = 'liberar';
                }
                
                // Contenedor de acciones
                const actionContainer = document.createElement('td');
                
                if(item.descripcion === "RETENER") {
                    actionContainer.innerHTML = `
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
                } else {
                    actionContainer.innerHTML = `
                        <div class="action-buttons">
                            <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
                        </div>
                    `;
                }
                
                newRow.innerHTML = `
                    <td>${item.guia}</td>
                    <td>${item.manifiesto}</td>
                    <td class="${descClass}">${item.descripcion}</td>
                    <td>${item.ciudad || ''}</td>
                `;
                
                newRow.appendChild(actionContainer);
            });
            
            updateCounter();
        }

        // Función para alternar menú de acción
        function toggleActionMenu(button) {
            const menu = button.nextElementSibling;
            const allMenus = document.querySelectorAll('.action-menu');
            
            // Cerrar todos los otros menús
            allMenus.forEach(m => {
                if(m !== menu) m.style.display = 'none';
            });
            
            // Alternar el menú actual
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
        
        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', function(e) {
            if(!e.target.closest('.action-trigger')) {
                document.querySelectorAll('.action-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });

        // Función para asignar manifiesto desde fila
        async function assignFromRow(button) {
            const row = button.closest('tr');
            const manifiesto = row.cells[1].textContent;
            
            if (manifestAssignments[manifiesto]) {
                const ciudad = manifestAssignments[manifiesto];
                
                // Actualizar TODAS las guías con este manifiesto
                database.forEach(item => {
                    if (item.manifiesto === manifiesto && item.descripcion === "RETENER") {
                        item.ciudad = ciudad;
                    }
                });
                
                // Guardar cambios
                await saveToGitHub();
                loadData();
            } else {
                alert('Este manifiesto no tiene una ciudad asignada. Use el botón "Asignar Manifiesto" primero.');
            }
            
            toggleActionMenu(button.closest('.action-trigger').querySelector('button'));
        }

        // Función para asignar un manifiesto (desde modal)
        async function assignManifest() {
            const manifiesto = document.getElementById('assign-manifiesto').value;
            const ciudad = document.getElementById('assign-ciudad').value;
            
            if (!manifiesto || !ciudad) {
                alert('Por favor complete todos los campos');
                return;
            }
            
            // 1. Guardar la asignación
            manifestAssignments[manifiesto] = ciudad;
            
            // 2. Actualizar TODAS las guías con este manifiesto
            database.forEach(item => {
                if (item.manifiesto === manifiesto && item.descripcion === "RETENER") {
                    item.ciudad = ciudad;
                }
            });
            
            // 3. Guardar cambios
            try {
                await saveToGitHub();
                loadData();
                
                document.getElementById('assign-manifiesto').value = '';
                document.getElementById('assign-ciudad').value = '';
                closeAssignModal();
            } catch (error) {
                alert('Error al guardar los cambios');
                console.error(error);
            }
        }

        // Función para agregar nueva guía
        async function addItem() {
            const guia = document.getElementById('add-guia').value;
            const manifiesto = document.getElementById('add-manifiesto').value;
            const descripcion = document.getElementById('add-descripcion').value;
            
            if (!guia || !manifiesto || !descripcion) {
                alert('Por favor complete los campos obligatorios');
                return;
            }
            
            // Verificar si la guía ya existe
            if (database.some(item => item.guia === guia)) {
                alert('Esta guía ya existe en el sistema');
                return;
            }
            
            // Asignar ciudad automáticamente si el manifiesto tiene una
            let ciudad = '';
            if (descripcion === "RETENER" && manifestAssignments[manifiesto]) {
                ciudad = manifestAssignments[manifiesto];
            }
            
            // Agregar nueva guía
            database.push({
                guia: guia,
                manifiesto: manifiesto,
                descripcion: descripcion,
                ciudad: ciudad
            });
            
            // Guardar cambios
            try {
                await saveToGitHub();
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

        // Función para eliminar item
        async function deleteItem(button) {
            if (!confirm('¿Está seguro que desea eliminar este item?')) return;
            
            const row = button.closest('tr');
            const guia = row.cells[0].textContent;
            
            // Eliminar de la base de datos
            database = database.filter(item => item.guia !== guia);
            
            // Guardar en GitHub
            try {
                await saveToGitHub();
                row.remove();
                updateCounter();
            } catch (error) {
                alert('Error al eliminar el item');
                console.error(error);
            }
        }

        // Función para editar item
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

        // Función para guardar cambios
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
                // Mantener la ciudad si ya estaba asignada
                const ciudad = currentEditingRow.cells[3].textContent;
                if(ciudad === "GYE") {
                    currentEditingRow.cells[2].className = 'retener-amarillo';
                } else if(ciudad === "QUT") {
                    currentEditingRow.cells[2].className = 'retener-naranja';
                } else {
                    currentEditingRow.cells[2].className = 'retener';
                }
                
                // Actualizar botones de acción para RETENER
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
                
                // Actualizar botones de acción - solo Eliminar para LIBERAR
                const actionCell = currentEditingRow.cells[4];
                actionCell.innerHTML = `
                    <div class="action-buttons">
                        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
                    </div>
                `;
            } else {
                currentEditingRow.cells[2].className = '';
                currentEditingRow.cells[3].textContent = '';
                
                // Para otros estados: Mostrar solo Eliminar
                const actionCell = currentEditingRow.cells[4];
                actionCell.innerHTML = `
                    <div class="action-buttons">
                        <button class="btn-action btn-gray" onclick="deleteItem(this)">Eliminar</button>
                    </div>
                `;
            }
            
            // Actualizar en la base de datos
            const index = database.findIndex(item => item.guia === currentEditingRow.cells[0].textContent);
            if(index !== -1) {
                database[index] = {
                    guia: guia,
                    manifiesto: manifiesto,
                    descripcion: descripcion,
                    ciudad: currentEditingRow.cells[3].textContent || ''
                };
                await saveToGitHub();
            }
            
            closeEditModal();
        }

        // Función para liberar desde fila
        async function liberarFromRow(button) {
            const row = button.closest('tr');
            const guia = row.cells[0].textContent;
            
            // Actualizar en la base de datos
            const index = database.findIndex(item => item.guia === guia);
            if(index !== -1) {
                database[index].descripcion = "LIBERAR";
                database[index].ciudad = '';
                
                try {
                    await saveToGitHub();
                    
                    row.cells[2].textContent = "LIBERAR";
                    row.cells[2].className = 'liberar';
                    row.cells[3].textContent = '';
                    
                    // Actualizar botones de acción
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

        // Función para importar desde Excel
        async function handleFileImport(fileInput) {
            const file = fileInput.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obtener la primera hoja
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Procesar los datos (omitir la primera fila de encabezados)
                for (let i = 1; i < jsonData.length; i++) {
                    const rowData = jsonData[i];
                    if (rowData.length < 3) continue;
                    
                    const guia = rowData[0]?.toString() || '';
                    const manifiesto = rowData[1]?.toString() || '';
                    const descripcion = rowData[2]?.toString() || '';
                    const ciudad = rowData[3]?.toString() || '';
                    
                    // Verificar si la guía ya existe
                    const existingIndex = database.findIndex(item => item.guia === guia);
                    
                    if (existingIndex === -1) {
                        // Si no existe, agregar nueva
                        database.push({
                            guia: guia,
                            manifiesto: manifiesto,
                            descripcion: descripcion,
                            ciudad: ciudad
                        });
                        
                        // Si hay ciudad especificada, asignar al manifiesto
                        if (ciudad && (ciudad === "GYE" || ciudad === "QUT")) {
                            manifestAssignments[manifiesto] = ciudad;
                        }
                    } else {
                        // Si existe, actualizar
                        database[existingIndex] = {
                            guia: guia,
                            manifiesto: manifiesto,
                            descripcion: descripcion,
                            ciudad: ciudad
                        };
                    }
                }
                
                // Guardar en GitHub
                try {
                    await saveToGitHub();
                    loadData();
                } catch (error) {
                    alert('Error al guardar los datos importados');
                    console.error(error);
                }
            };
            reader.readAsArrayBuffer(file);
        }
        
        // Función para actualizar el contador
        function updateCounter() {
            const count = database.length;
            const counterElement = document.getElementById('itemCounter');
            counterElement.textContent = count === 1 ? '1 item' : `${count} items`;
        }

        // Función para filtrar la tabla
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
        
        // Cerrar modales al hacer clic fuera
        window.onclick = function(event) {
            const addModal = document.getElementById('addModal');
            const assignModal = document.getElementById('assignModal');
            const editModal = document.getElementById('editModal');
            
            if (event.target == addModal) {
                closeAddModal();
            }
            if (event.target == assignModal) {
                closeAssignModal();
            }
            if (event.target == editModal) {
                closeEditModal();
            }
        }
