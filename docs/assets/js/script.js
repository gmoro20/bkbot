// Define la función reset
function resetForm() {
    document.getElementById('formWrapper').reset();
};

// Define la función send
function send() {
    console.log("Aceptado")

    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const courtSelect = document.getElementById('court');

    const formData = {
        "installation": installationSelect.value,
        "installation_name": installationSelect.options[installationSelect.selectedIndex]?.text || "",
        "sport": sportSelect.value,
        "sport_name": sportSelect.options[sportSelect.selectedIndex]?.text || "",
        "court": courtSelect.value,
        "court_name": courtSelect.options[courtSelect.selectedIndex]?.text || "",
        "date": document.getElementById("date").value,
        "hour": document.getElementById("hour").value,
        "user": document.getElementById("user").value,
        "password": document.getElementById("password").value,
        "pay_method": "bizum",
        "phone_number": document.getElementById('phoneNumber').value
    }

    completed = true
    for (var key in formData) {
        if (formData.hasOwnProperty(key) && formData[key] === "") {
            console.log("El campo '" + key + "' está vacío.");
            completed = false;
        }
    }
    if (!completed) {
        alert("Por favor, completa todos los campos.");
    }

    // Validación del teléfono
    const phoneDigits = formData["phone_number"].replace(/\s/g, '');
    if (completed && (!/^\d{9}$/.test(phoneDigits) || !/^[6-9]/.test(phoneDigits))) {
        alert("El número de teléfono no es válido");
        completed = false;
    }

    const datetime = new Date(`${formData["date"]}T${formData["hour"]}`);
    if (datetime.setDate(datetime.getDate() - 2) < new Date() && completed) {
        if (datetime.setDate(datetime.getDate() + 2) < new Date()) {
            alert('Ya se ha pasado la hora de esta reserva.')
        } else {
            alert('Esta reserva ya se puede hacer desde la pagina si sigue libre.')
        }
        completed = false
    }

    if (completed) {
        const dDAT = {
            "datetime": `${formData["date"]}T${formData["hour"]}`,
            "installation": parseInt(formData["installation"]),
            "installation_name": formData["installation_name"],
            "sport": parseInt(formData["sport"]),
            "sport_name": formData["sport_name"],
            "court": parseInt(formData["court"]),
            "court_name": formData["court_name"],
            "user": formData["user"],
            "password": formData["password"],
            "pay_method": formData["pay_method"],
            "phone_number": parseInt(formData["phone_number"])
        };
        console.log(dDAT)
        Telegram.WebApp.sendData(JSON.stringify(dDAT));
    };
};

function updateCourts() {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const courtSelect = document.getElementById('court');
    const courtWrapper = document.getElementById('courtWrapper');

    const codigoComplejo = installationSelect.value;
    const codigoActividad = sportSelect.value;

    // Si no hay instalación o deporte seleccionado, limpiar y ocultar
    if (!codigoComplejo || codigoComplejo.trim() === "" ||
        !codigoActividad || codigoActividad.trim() === "") {
        courtSelect.innerHTML = '';
        courtWrapper.style.display = 'none';
        return;
    }

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const fechaReserva = `${day}%2F${month}%2F${today.getFullYear()}`;

    fetch(`https://cms.bilbaokirolak.eus/api/ados/anon-get-listado-instalaciones-reserva?codigoComplejo=${codigoComplejo}&codigoActividad=${codigoActividad}&fechaReserva=${fechaReserva}`)
        .then(response => response.json())
        .then(data => {
            const courts = Array.isArray(data.instalaciones)
                ? data.instalaciones
                : (data.instalaciones ? [data.instalaciones] : []);

            courtSelect.innerHTML = '';

            if (courts.length === 0) {
                // Sin pistas disponibles
                courtWrapper.style.display = 'none';
                return;
            }

            courts.forEach(court => {
                const option = document.createElement('option');
                option.value = parseInt(court.codigoInstalacion.slice(-4));
                option.textContent = court.nombreInstalacion;
                courtSelect.appendChild(option);
            });

            // Solo mostrar el selector si hay más de una opción
            courtWrapper.style.display = courts.length > 1 ? 'block' : 'none';
        })
        .catch(error => {
            console.error('Error al cargar las pistas:', error);
            courtSelect.innerHTML = '';
            courtWrapper.style.display = 'none';
        });
};

function updateSports() {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const sportWrapper = document.getElementById('sportWrapper');

    const codigoComplejo = installationSelect.value;

    // Si no hay instalación seleccionada, limpiar todo
    if (!codigoComplejo || codigoComplejo.trim() === "") {
        sportSelect.innerHTML = '';
        if (sportWrapper) sportWrapper.style.display = 'none';
        updateCourts();
        return;
    }

    fetch(`https://cms.bilbaokirolak.eus/api/ados/anon-get-listado-actividades-reserva?codigoComplejo=${codigoComplejo}`)
        .then(response => response.json())
        .then(data => {
            sportSelect.innerHTML = '';

            // Filtrar solo actividades de tipo reserva
            const deportes = (Array.isArray(data) ? data : (data ? [data] : [])).filter(actividad => actividad.tipoReserva === "R");

            if (deportes.length === 0) {
                // Sin deportes para esta instalación
                if (sportWrapper) sportWrapper.style.display = 'none';
                updateCourts();
                return;
            }

            // Poblar el selector de deportes
            deportes.forEach(actividad => {
                const option = document.createElement('option');
                option.value = actividad.codigoActividad;
                option.textContent = actividad.nombreActividad;
                sportSelect.appendChild(option);
            });

            // Mostrar solo si hay más de uno
            if (sportWrapper) sportWrapper.style.display = deportes.length > 1 ? 'block' : 'none';

            // Seleccionar el primero por defecto y actualizar campos
            sportSelect.selectedIndex = 0;
            updateCourts();
        })
        .catch(error => {
            console.error('Error al cargar las actividades:', error);
            sportSelect.innerHTML = '';
            if (sportWrapper) sportWrapper.style.display = 'none';
            updateCourts();
        });
};

document.addEventListener('DOMContentLoaded', function () {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');

    // Cargar instalaciones desde la API
    fetch('https://cms.bilbaokirolak.eus/api/ados/anon-get-listado-complejos-reserva')
        .then(response => response.json())
        .then(data => {
            data.forEach(installation => {
                const option = document.createElement('option');
                option.value = installation.codigoComplejo;
                option.textContent = installation.nombreComplejo;
                installationSelect.appendChild(option);
            });

            // Inicializar deportes y campos con la primera instalación
            updateSports();
        })
        .catch(error => {
            console.error('Error al cargar las instalaciones:', error);
        });

    // Cambio de instalación → actualizar deportes (y campos en cascada)
    installationSelect.addEventListener('change', () => { updateSports(); });

    // Cambio de deporte → actualizar solo campos
    sportSelect.addEventListener('change', () => { updateCourts(); });
});

// Esconde teclado clicando cualquier parte
document.addEventListener('click', event => {
    const focusedElement = document.activeElement;
    if (focusedElement && focusedElement !== event.target && ['INPUT', 'TEXTAREA'].includes(focusedElement.tagName)) {
        focusedElement.blur();
    }
});

// Maneja navegación del Enter
document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        let inputs = Array.from(document.querySelectorAll("input[type='password'], input[type='text']"));
        let currentIndex = inputs.indexOf(document.activeElement);
        if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
        } else {
            document.activeElement.blur();
        }
    }
});