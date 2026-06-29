import requests
import json
from datetime import date

BASE_URL = "https://cms.bilbaokirolak.eus/api/ados"
VERIFY = True

# Fecha de hoy en el formato que espera la API: DD%2FMM%2FYYYY
today = date.today()
fecha_reserva = f"{today.day:02d}%2F{today.month:02d}%2F{today.year}"


def get_instalaciones():
    """Obtiene la lista de complejos/instalaciones."""
    url = f"{BASE_URL}/anon-get-listado-complejos-reserva"
    print(f"  GET {url}")
    response = requests.get(url, timeout=30, verify=VERIFY)
    response.raise_for_status()
    return response.json()


def get_deportes(codigo_complejo):
    """Obtiene las actividades de tipo reserva ('R') de un complejo."""
    url = f"{BASE_URL}/anon-get-listado-actividades-reserva?codigoComplejo={codigo_complejo}"
    print(f"  GET {url}")
    response = requests.get(url, timeout=30, verify=VERIFY)
    response.raise_for_status()
    data = response.json()

    # La respuesta puede ser una lista o un objeto
    if isinstance(data, list):
        actividades = data
    elif data:
        actividades = [data]
    else:
        actividades = []

    # Filtrar solo las de tipo reserva, igual que hace el JS
    return [a for a in actividades if a.get("tipoReserva") == "R"]


def get_campos(codigo_complejo, codigo_actividad):
    """Obtiene las pistas/campos de una actividad en un complejo."""
    url = (
        f"{BASE_URL}/anon-get-listado-instalaciones-reserva"
        f"?codigoComplejo={codigo_complejo}"
        f"&codigoActividad={codigo_actividad}"
        f"&fechaReserva={fecha_reserva}"
    )
    print(f"  GET {url}")
    response = requests.get(url, timeout=30, verify=VERIFY)
    response.raise_for_status()
    data = response.json()

    instalaciones = data.get("instalaciones", [])
    if isinstance(instalaciones, list):
        campos = instalaciones
    elif instalaciones:
        campos = [instalaciones]
    else:
        campos = []

    # Igual que el JS: el valor es los últimos 4 dígitos del codigoInstalacion
    resultado = []
    for c in campos:
        codigo_raw = str(c.get("codigoInstalacion", ""))
        valor = int(codigo_raw[-4:]) if len(codigo_raw) >= 4 else int(codigo_raw or 0)
        resultado.append({
            "value": valor,
            "label": c.get("nombreInstalacion", "")
        })
    return resultado


def build_data():
    data = []

    print("\n[1/3] Obteniendo instalaciones...")
    instalaciones = get_instalaciones()
    print(f"  → {len(instalaciones)} instalaciones encontradas")

    for inst in instalaciones:
        codigo_complejo = inst.get("codigoComplejo", "")
        nombre_complejo = inst.get("nombreComplejo", "")
        print(f"\n[2/3] Deportes de '{nombre_complejo}' ({codigo_complejo})...")

        try:
            deportes_raw = get_deportes(codigo_complejo)
        except Exception as e:
            print(f"  ⚠ Error: {e}")
            deportes_raw = []

        deportes = []
        for dep in deportes_raw:
            codigo_actividad = dep.get("codigoActividad", "")
            nombre_actividad = dep.get("nombreActividad", "")
            print(f"\n[3/3] Campos de deporte '{nombre_actividad}' ({codigo_actividad})...")

            try:
                campos = get_campos(codigo_complejo, codigo_actividad)
            except Exception as e:
                print(f"  ⚠ Error: {e}")
                campos = []

            print(f"  → {len(campos)} campo(s) encontrado(s)")
            
            if len(campos) > 0:
                deportes.append({
                    "value": int(codigo_actividad) if str(codigo_actividad).isdigit() else codigo_actividad,
                    "label": nombre_actividad,
                    "courts": campos
                })

        if len(deportes) > 0:
            data.append({
                "value": int(codigo_complejo) if str(codigo_complejo).isdigit() else codigo_complejo,
                "label": nombre_complejo,
                "sports": deportes
            })

    return data


if __name__ == "__main__":
    print("=== Generando datos de Bilbao Kirolak ===")
    result = build_data()

    output_path = "docs/static/data.json"
    import os
    os.makedirs("static", exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    total_deportes = sum(len(i["sports"]) for i in result)
    total_campos = sum(len(d["courts"]) for i in result for d in i["sports"])
    print(f"\n✅ Listo. Guardado en '{output_path}'")
    print(f"   {len(result)} instalaciones | {total_deportes} deportes | {total_campos} campos")