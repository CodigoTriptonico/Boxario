export type ConfigMenuSectionId =
  | "organization"
  | "prices"
  | "distributors"
  | "appearance"
  | "timeclock";

export type ConfigMenuGroup = {
  id: string;
  title: string;
  description: string;
  sectionIds: ConfigMenuSectionId[];
};

/** Secciones visibles en el menú de Configuración. Distribuidores queda diferido. */
export const CONFIG_MENU_GROUPS: ConfigMenuGroup[] = [
  {
    id: "operation",
    title: "Operación",
    description: "Precios, depósito y rutas semanales.",
    sectionIds: ["prices"],
  },
  {
    id: "administration",
    title: "Administración",
    description: "Organización, asistencia y apariencia del sistema.",
    sectionIds: ["organization", "timeclock", "appearance"],
  },
];

export const CONFIG_MENU_SECTION_IDS: ConfigMenuSectionId[] = CONFIG_MENU_GROUPS.flatMap(
  (group) => group.sectionIds,
);
