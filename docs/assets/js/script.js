// Inicializa la aplicación web de Telegram
const tg = window.Telegram.WebApp;
tg.ready();

// Datos cargados desde el JSON estático
let kirolakData = [];

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
        "installation_name": installationSelect.options[installationSelect.selectedIndex]?.text,
        "sport": sportSelect.value,
        "sport_name": sportSelect.options[sportSelect.selectedIndex]?.text,
        "court": courtSelect.value,
        "court_name": courtSelect.options[courtSelect.selectedIndex]?.text,
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
	const threeMinutesBefore = new Date(twoDaysBefore.getTime() - 4 * 60 * 1000);

	if (datetime < now) {
		alert('Ya se ha pasado la hora de esta reserva.');
		return;
	}

	if (twoDaysBefore < now) {
		alert('Esta reserva ya se puede hacer desde la página si sigue libre.');
		return;
	}

	if (threeMinutesBefore < now) {
		alert('Ya es demasiado tarde para reservar por bot. Tendras que reservar a mano por la app.');
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
    tg.sendData(JSON.stringify(dDAT));
    tg.close();
};

// ----------- Funciones que ahora leen del JSON local -----------

function updateCourts() {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const courtSelect = document.getElementById('court');
    const courtWrapper = document.getElementById('courtWrapper');

    const codigoComplejo = parseInt(installationSelect.value);
    const codigoActividad = parseInt(sportSelect.value);

    courtSelect.innerHTML = '';

    if (!installationSelect.value || !sportSelect.value) {
        courtWrapper.style.display = 'none';
        return;
    }

    // Busca la instalación y el deporte en los datos ya cargados
    const instalacion = kirolakData.find(i => i.value === codigoComplejo);
    if (!instalacion) {
        courtWrapper.style.display = 'none';
        return;
    }

    const deporte = instalacion.sports.find(s => s.value === codigoActividad);
    if (!deporte) {
        courtWrapper.style.display = 'none';
        return;
    }

    const courts = deporte.courts || [];

    if (courts.length === 0) {
        courtWrapper.style.display = 'none';
        return;
    }

    courts.forEach(court => {
        const option = document.createElement('option');
        option.value = court.value;
        option.textContent = court.label;
        courtSelect.appendChild(option);
    });

    courtWrapper.style.display = courts.length > 1 ? 'block' : 'none';
}

function updateSports() {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');
    const sportWrapper = document.getElementById('sportWrapper');

    const codigoComplejo = parseInt(installationSelect.value);

    sportSelect.innerHTML = '';

    if (!installationSelect.value) {
        if (sportWrapper) sportWrapper.style.display = 'none';
        updateCourts();
        return;
    }

    // Busca la instalación en los datos ya cargados
    const instalacion = kirolakData.find(i => i.value === codigoComplejo);
    if (!instalacion || !instalacion.sports || instalacion.sports.length === 0) {
        if (sportWrapper) sportWrapper.style.display = 'none';
        updateCourts();
        return;
    }

    instalacion.sports.forEach(deporte => {
        const option = document.createElement('option');
        option.value = deporte.value;
        option.textContent = deporte.label;
        sportSelect.appendChild(option);
    });

    if (sportWrapper) sportWrapper.style.display = instalacion.sports.length > 1 ? 'block' : 'none';

    sportSelect.selectedIndex = 0;
    updateCourts();
}

// ----------- Carga inicial del JSON -----------

document.addEventListener('DOMContentLoaded', function () {
    const installationSelect = document.getElementById('installation');
    const sportSelect = document.getElementById('sport');

    fetch('static/data.json')
        .then(response => response.json())
        .then(data => {
            kirolakData = data;

            data.forEach(installation => {
                const option = document.createElement('option');
                option.value = installation.value;
                option.textContent = installation.label;
                installationSelect.appendChild(option);
            });

            updateSports();
        })
        .catch(error => {
            console.error('Error al cargar los datos:', error);
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
