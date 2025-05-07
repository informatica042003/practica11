document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const userForm = document.getElementById('userForm');
    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const telefonoInput = document.getElementById('telefono');
    const userIdInput = document.getElementById('userId');
    const btnBuscar = document.getElementById('btnBuscar');
    const busquedaInput = document.getElementById('busqueda');
    const tablaBody = document.getElementById('tablaBody');

    // Estado de la aplicación
    let db;
    let editMode = false;
    let currentUserId = null;

    // Inicializar la base de datos
    const initDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('UsuariosDB', 1);

            request.onerror = (event) => {
                console.error('Error al abrir DB:', event.target.error);
                reject('Error al abrir la base de datos');
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Base de datos inicializada');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const store = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
                store.createIndex('email', 'email', { unique: true });
                console.log('Estructura de DB creada');
            };
        });
    };

    // Cargar usuarios en la tabla
    const loadUsers = (filter = '') => {
        const transaction = db.transaction(['usuarios'], 'readonly');
        const store = transaction.objectStore('usuarios');
        const request = store.getAll();

        request.onsuccess = () => {
            tablaBody.innerHTML = '';
            const users = request.result.filter(user => 
                user.nombre.toLowerCase().includes(filter.toLowerCase()) ||
                user.email.toLowerCase().includes(filter.toLowerCase()) ||
                (user.telefono && user.telefono.includes(filter))
            );

            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.nombre}</td>
                    <td>${user.email}</td>
                    <td>${user.telefono || ''}</td>
                    <td>
                        <button class="btn-editar" data-id="${user.id}">Editar</button>
                        <button class="btn-eliminar" data-id="${user.id}">Eliminar</button>
                    </td>
                `;
                tablaBody.appendChild(row);
            });

            // Asignar eventos a los botones nuevos
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', (e) => editUser(e.target.dataset.id));
            });

            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', (e) => deleteUser(e.target.dataset.id));
            });
        };

        request.onerror = () => {
            showMessage('Error al cargar usuarios', 'error');
        };
    };

    // Guardar usuario (crear o actualizar)
    const saveUser = async (e) => {
        e.preventDefault();

        // Validación básica
        if (!nombreInput.value.trim() || !emailInput.value.trim()) {
            showMessage('Nombre y email son requeridos', 'error');
            return;
        }

        const user = {
            nombre: nombreInput.value.trim(),
            email: emailInput.value.trim(),
            telefono: telefonoInput.value.trim()
        };

        const transaction = db.transaction(['usuarios'], 'readwrite');
        const store = transaction.objectStore('usuarios');

        try {
            if (editMode) {
                user.id = parseInt(currentUserId);
                await new Promise((resolve, reject) => {
                    const request = store.put(user);
                    request.onsuccess = resolve;
                    request.onerror = () => reject(request.error);
                });
                showMessage('Usuario actualizado correctamente');
            } else {
                await new Promise((resolve, reject) => {
                    const request = store.add(user);
                    request.onsuccess = resolve;
                    request.onerror = () => reject(request.error);
                });
                showMessage('Usuario creado correctamente');
            }

            resetForm();
            loadUsers();
        } catch (error) {
            console.error('Error al guardar:', error);
            if (error.name === 'ConstraintError') {
                showMessage('El email ya está registrado', 'error');
            } else {
                showMessage('Error al guardar usuario', 'error');
            }
        }
    };

    // Editar usuario
    const editUser = (id) => {
        const transaction = db.transaction(['usuarios'], 'readonly');
        const store = transaction.objectStore('usuarios');
        const request = store.get(parseInt(id));

        request.onsuccess = () => {
            const user = request.result;
            if (user) {
                nombreInput.value = user.nombre;
                emailInput.value = user.email;
                telefonoInput.value = user.telefono || '';
                currentUserId = user.id;
                editMode = true;
                document.getElementById('btnGuardar').textContent = 'Actualizar';
                nombreInput.focus();
            }
        };

        request.onerror = () => {
            showMessage('Error al cargar usuario', 'error');
        };
    };

    // Eliminar usuario
    const deleteUser = (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        const transaction = db.transaction(['usuarios'], 'readwrite');
        const store = transaction.objectStore('usuarios');
        const request = store.delete(parseInt(id));

        request.onsuccess = () => {
            showMessage('Usuario eliminado');
            loadUsers();
        };

        request.onerror = () => {
            showMessage('Error al eliminar usuario', 'error');
        };
    };

    // Resetear formulario
    const resetForm = () => {
        userForm.reset();
        currentUserId = null;
        editMode = false;
        document.getElementById('btnGuardar').textContent = 'Guardar';
    };

    // Mostrar mensajes
    const showMessage = (text, type = 'success') => {
        const messageBox = document.createElement('div');
        messageBox.className = `message ${type}`;
        messageBox.textContent = text;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.classList.add('fade-out');
            setTimeout(() => messageBox.remove(), 500);
        }, 3000);
    };

    // Inicializar la aplicación
    const initApp = async () => {
        try {
            await initDB();
            loadUsers();
            
            // Asignar eventos
            userForm.addEventListener('submit', saveUser);
            document.getElementById('btnCancelar').addEventListener('click', resetForm);
            btnBuscar.addEventListener('click', () => loadUsers(busquedaInput.value));
            busquedaInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') loadUsers(busquedaInput.value);
            });
            
            console.log('Aplicación inicializada correctamente');
        } catch (error) {
            console.error('Error al iniciar aplicación:', error);
            showMessage('Error al iniciar la aplicación', 'error');
        }
    };

    // Iniciar todo
    initApp();
});