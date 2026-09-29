import { create } from "zustand";
import type { Beneficiario } from "./pricing";

// Store acotado exclusivamente al cotizador (TECH-SPEC 2.1, decisión de
// Zustand). Nada del /panel o /admin usa este store.
interface CotizadorState {
  edad: number | null;
  rentaBruta: number | null;
  region: string;
  cargas: Beneficiario[];
  isapreFiltro: string[];
  setDatosBasicos: (datos: { edad: number; rentaBruta: number; region: string }) => void;
  agregarCarga: (edad: number) => void;
  quitarCarga: (index: number) => void;
  toggleIsapreFiltro: (isapre: string) => void;
  limpiarFiltros: () => void;
  beneficiarios: () => Beneficiario[];
}

export const useCotizadorStore = create<CotizadorState>((set, get) => ({
  edad: null,
  rentaBruta: null,
  region: "",
  cargas: [],
  isapreFiltro: [],
  setDatosBasicos: ({ edad, rentaBruta, region }) => set({ edad, rentaBruta, region }),
  agregarCarga: (edad) =>
    set((state) => ({ cargas: [...state.cargas, { edad, tipo: "carga" }] })),
  quitarCarga: (index) =>
    set((state) => ({ cargas: state.cargas.filter((_, i) => i !== index) })),
  toggleIsapreFiltro: (isapre) =>
    set((state) => ({
      isapreFiltro: state.isapreFiltro.includes(isapre)
        ? state.isapreFiltro.filter((i) => i !== isapre)
        : [...state.isapreFiltro, isapre],
    })),
  limpiarFiltros: () => set({ isapreFiltro: [] }),
  beneficiarios: () => {
    const { edad, cargas } = get();
    if (edad === null) return [];
    return [{ edad, tipo: "cotizante" }, ...cargas];
  },
}));
