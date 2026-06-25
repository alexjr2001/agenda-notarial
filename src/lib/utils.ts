export type LunchOverride = {
  id: number;
  empleado_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  editado_por: string;
  editado_en: string;
};

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Empleado = {
  id: number;
  nombre: string;
  color: string;
};

export type Cita = {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  empleado_id: number;
  cliente: string;
  tramite: string;
  observaciones: string | null;
  locked_by: string | null;
  locked_at: string | null;
};

export type SelectedCell = {
  empleadoId: number;
  empleadoNombre: string;
  hora: string;
} | null;

export const grupoA = ["Paolo", "Karina", "Romina"];
export const grupoB = ["Valeska", "Jaime", "Valeria", "Karen"];

export const hoyISO = () => new Date().toISOString().split("T")[0];

export const sumarDiasISO = (isoDate: string, dias: number) => {
  const fecha = new Date(`${isoDate}T00:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().split("T")[0];
};

export const formatearFechaBonita = (isoDate: string) => {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${isoDate}T00:00:00`));
};

export const getWeekNumber = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export type LunchWindow = {
  inicio: string;
  fin: string;
};

export const getDefaultLunchWindow = (empleado: string, week: number): LunchWindow => {
  const impar = week % 2 === 1;
  const esGrupoA = grupoA.includes(empleado);
  const inicio = impar
    ? esGrupoA
      ? "12:30"
      : "13:30"
    : esGrupoA
      ? "13:30"
      : "12:30";
  const fin = inicio === "12:30" ? "13:30" : "14:30";
  return { inicio, fin };
};

export const getLunchWindow = (empleado: string, week: number, override: { hora_inicio: string; hora_fin: string } | null): LunchWindow => {
  if (override) {
    return {
      inicio: override.hora_inicio.substring(0,5),
      fin: override.hora_fin.substring(0,5),
    };
  }

  return getDefaultLunchWindow(empleado, week);
};

export const isTimeInWindow = (time: string, window: LunchWindow) => {
  const value = toMinutes(time);
  const inicio = toMinutes(window.inicio);
  const fin = toMinutes(window.fin);
  return value >= inicio && value < fin;
};

export const esAlmuerzo = (empleado: string, hora: string, week: number, override: { hora_inicio: string; hora_fin: string } | null = null) => {
  const window = getLunchWindow(empleado, week, override);
  return isTimeInWindow(hora, window);
};

export const generarHorarios = () => {
  const horarios: string[] = [];

  let hora = 8;
  let minuto = 30;

  while (hora < 18) {
    horarios.push(
      `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
    );

    minuto += 30;

    if (minuto === 60) {
      minuto = 0;
      hora++;
    }
  }

  return horarios;
};

export const getHoraFin = (horaInicio: string) => {
  const [h, m] = horaInicio.split(":").map(Number);

  return `${String(m === 30 ? h + 1 : h).padStart(2, "0")}:${String(
    m === 30 ? 0 : 30
  ).padStart(2, "0")}:00`;
};

export const isLocked = (cita: any, currentUserId: string) => {
  if (!cita.locked_by) return false;
  if (cita.locked_by === currentUserId) return false;

  const lockedAt = new Date(cita.locked_at);
  const now = new Date();

  const diffMin = (now.getTime() - lockedAt.getTime()) / 60000;

  // 🔥 si pasó más de 5 min → se considera libre
  return diffMin < 5;
};

export const isLockExpired = (lockedAt: string | null) => {
  if (!lockedAt) return false;

  const diffMin =
    (new Date().getTime() - new Date(lockedAt).getTime()) / 60000;

  return diffMin > 5;
};