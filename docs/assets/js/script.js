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
    const courtWrapper = document.getElementById('courtWrapper');

    // ¿Se muestra el selector de campo?
    const courtVisible = courtWrapper && courtWrapper.style.display !== 'none';

    const formData = {
        "installation": installationSelect.value,
        "installation_name": installationSelect.options[installationSelect.selectedIndex]?.text || "",
        "sport": sportSelect.value,
        "sport_name": sportSelect.options[sportSelect.selectedIndex]?.text || "",
        "court": courtVisible ? courtSelect.value : "0",
        "court_name": courtVisible ? (courtSelect.options[courtSelect.selectedIndex]?.text || "") : "",
        "date": document.getElementById("date").value,
        "hour": document.getElementById("hour").value,
        "user": document.getElementById("user").value,
        "password": document.getElementById("password").value,
        "pay_method": "bizum",
        "phone_number": document.getElementById('phoneNumber').value
    }

    // Campos obligatorios (court se excluye si no es visible)
    const requiredFields = ["installation", "sport", "date", "hour", "user", "password", "phone_number"];
    if (courtVisible) requiredFields.push("court");

    let completed = true;
    for (const key of requiredFields) {
        if (!formData[key] || formData[key].trim() === "") {
            console.log("El campo '" + key + "' está vacío.");
            completed = false;
        }
    }
    if (!completed) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    // Validación del teléfono
    const phoneDigits = formData["phone_number"].replace(/\s/g, '');
    if (!/^\d{9}$/.test(phoneDigits) || !/^[6-9]/.test(phoneDigits)) {
        alert("El número de teléfono no es válido");
        return;
    }

    // Validación de fecha
    const now = new Date();
    const datetime = new Date(`${formData["date"]}T${formData["hour"]}`);
    const twoDaysBefore = new Date(datetime);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);

    if (datetime < now) {
        alert('Ya se ha pasado la hora de esta reserva.');
        return;
    }
    if (twoDaysBefore < now) {
        alert('Esta reserva ya se puede hacer desde la página si sigue libre.');
        return;
    }

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
        "phone_number": parseInt(phoneDigits)
    };

    console.log(dDAT);
    Telegram.WebApp.sendData(JSON.stringify(dDAT));
};

function updateCourts() {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const courtSelect = document.getElementById('court');
    const courtWrapper = document.getElementById('courtWrapper');

    const codigoComplejo = installationSelect.value;
    const codigoActividad = sportSelect.value;

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
                courtWrapper.style.display = 'none';
                return;
            }

            courts.forEach(court => {
                const option = document.createElement('option');
                option.value = parseInt(court.codigoInstalacion.slice(-4));
                option.textContent = court.nombreInstalacion;
                courtSelect.appendChild(option);
            });

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

            const deportes = (Array.isArray(data) ? data : (data ? [data] : [])).filter(actividad => actividad.tipoReserva === "R");

            if (deportes.length === 0) {
                if (sportWrapper) sportWrapper.style.display = 'none';
                updateCourts();
                return;
            }

            deportes.forEach(actividad => {
                const option = document.createElement('option');
                option.value = actividad.codigoActividad;
                option.textContent = actividad.nombreActividad;
                sportSelect.appendChild(option);
            });

            if (sportWrapper) sportWrapper.style.display = deportes.length > 1 ? 'block' : 'none';

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

    fetch('https://cms.bilbaokirolak.eus/api/ados/anon-get-listado-complejos-reserva')
        .then(response => response.json())
        .then(data => {
            data.forEach(installation => {
                const option = document.createElement('option');
                option.value = installation.codigoComplejo;
                option.textContent = installation.nombreComplejo;
                installationSelect.appendChild(option);
            });

            updateSports();
        })
        .catch(error => {
            console.error('Error al cargar las instalaciones:', error);
        });

    installationSelect.addEventListener('change', () => { updateSports(); });
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