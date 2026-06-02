// Listado de clínicas/prestadores por región para el formulario de cotización.
// Cubre las 16 regiones. Donde no hay clínicas privadas relevantes, dejamos
// "Sin preferencia" para que el cliente pueda igual avanzar.

export const CLINICAS_POR_REGION: Record<string, string[]> = {
  "Arica y Parinacota": [
    "Clínica San José de Arica",
    "Hospital Juan Noé Crevani",
  ],
  Tarapacá: [
    "Clínica Tarapacá (Iquique)",
    "Clínica RedSalud Iquique",
  ],
  Antofagasta: [
    "Clínica Antofagasta",
    "Clínica La Portada",
    "Clínica El Loa (Calama)",
  ],
  Atacama: [
    "Clínica RCR (Copiapó)",
    "Hospital Regional de Copiapó",
  ],
  Coquimbo: [
    "Clínica Red Salud Elqui (La Serena)",
    "Clínica Universitaria de La Serena",
  ],
  Valparaíso: [
    "Clínica Ciudad del Mar",
    "Clínica Bupa Reñaca",
    "Hospital Clínico Viña del Mar",
    "Clínica RedSalud Valparaíso",
    "Clínica Los Carrera (Quillota)",
    "Clínica Reñaca",
  ],
  Metropolitana: [
    "Clínica Alemana de Santiago",
    "Clínica Las Condes",
    "Hospital Clínico UC Christus",
    "Clínica Santa María",
    "Clínica Indisa",
    "Clínica Dávila",
    "Clínica Dávila Vespucio",
    "Clínica Bupa Santiago",
    "Clínica Cordillera",
    "Clínica MEDS",
    "Clínica RedSalud Providencia",
    "Clínica RedSalud Santiago",
    "Clínica RedSalud Vitacura",
    "Clínica San Carlos de Apoquindo",
    "Clínica Universidad de Los Andes",
    "Hospital del Profesor",
    "Integramédica",
    "Clínica Indisa Maipú",
  ],
  "O'Higgins": [
    "Clínica Isamédica (Rancagua)",
    "Clínica RedSalud Rancagua",
  ],
  Maule: [
    "Clínica Lircay (Talca)",
    "Clínica RedSalud Mayor (Temuco/Talca)",
  ],
  Ñuble: ["Clínica Andes Salud Chillán"],
  Biobío: [
    "Clínica Andes Salud Concepción",
    "Clínica Sanatorio Alemán (Concepción)",
    "Clínica Biobío",
  ],
  Araucanía: [
    "Clínica Alemana de Temuco",
    "Clínica Mayor Temuco",
  ],
  "Los Ríos": ["Clínica Alemana de Valdivia"],
  "Los Lagos": [
    "Clínica Alemana de Osorno",
    "Clínica Puerto Varas",
    "Clínica Andes Salud Puerto Montt",
  ],
  Aysén: ["Hospital Regional de Coyhaique"],
  Magallanes: ["Clínica Magallanes (Punta Arenas)"],
};
