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
  deleted_at: string | null;
};

export type Vacacion = {
  id: number;
  empleado_id: number;
  fecha: string;
  tipo: string;
  observacion: string | null;
  creado_por: string | null;
  created_at: string;
};

export type SelectedCell = {
  empleadoId: number;
  empleadoNombre: string;
  hora: string;
} | null;

//export const grupoA = ["Valeska", "Jaime", "Valeria", "Karen"];
//export const grupoB = ["Paolo", "Karina", "Romina"];

export const grupoA = ["Paolo", "Valeria", "Karen", "Omayra"];
export const grupoB = ["Valeska", "Jaime", "Karina", "Romina"];

export const hoyISO = () => new Date().toISOString().split("T")[0];

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatDateToISO = (date: Date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const subtractDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const FERIADOS_FIJOS: Record<string, string> = {
  "01-01": "Año Nuevo",
  "05-01": "Día del Trabajo",
  "06-07": "Batalla de Arica y Día de la Bandera",
  "06-29": "San Pedro y San Pablo",
  "07-23": "Día de la Fuerza Aérea",
  "07-28": "Fiestas Patrias",
  "07-29": "Fiestas Patrias",
  "08-06": "Batalla de Junín",
  "08-30": "Santa Rosa de Lima",
  "10-08": "Combate de Angamos",
  "11-01": "Todos los Santos",
  "12-08": "Inmaculada Concepción",
  "12-09": "Batalla de Ayacucho",
  "12-25": "Navidad",
};

const getEasterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
};

export const getFeriado = (isoDate: string) => {
  if (!isoDate || isoDate.length < 10) {
    return null;
  }

  const fixedHoliday = FERIADOS_FIJOS[isoDate.slice(5, 10)];
  if (fixedHoliday) {
    return fixedHoliday;
  }

  const year = Number(isoDate.slice(0, 4));
  if (Number.isNaN(year)) {
    return null;
  }

  const easterSunday = getEasterSunday(year);
  const juevesSanto = formatDateToISO(subtractDays(easterSunday, 3));
  const viernesSanto = formatDateToISO(subtractDays(easterSunday, 2));

  if (isoDate === juevesSanto) {
    return "Jueves Santo";
  }

  if (isoDate === viernesSanto) {
    return "Viernes Santo";
  }

  return null;
};

export const esFeriado = (isoDate: string) => getFeriado(isoDate) !== null;

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
  return Math.floor((diff + 4 * 24 * 60 * 60 * 1000) / (7 * 24 * 60 * 60 * 1000));
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getDurationMinutes = (horaInicio: string, horaFin: string) => {
  const start = toMinutes(horaInicio);
  const end = toMinutes(horaFin);
  return Math.max(30, end - start);
};

export const getCitaSpan = (horaInicio: string, horaFin: string) => {
  return Math.max(1, getDurationMinutes(horaInicio, horaFin) / 30);
};

export const isTimeInCita = (time: string, cita: { hora_inicio: string; hora_fin: string }) => {
  const slot = toMinutes(time);
  const start = toMinutes(cita.hora_inicio);
  const end = toMinutes(cita.hora_fin);
  return slot >= start && slot < end;
};

export const isTimeRangeOverlap = (
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string
) => {
  const startA = toMinutes(inicioA);
  const endA = toMinutes(finA);
  const startB = toMinutes(inicioB);
  const endB = toMinutes(finB);

  return startA < endB && endA > startB;
};

export type LunchWindow = {
  inicio: string;
  fin: string;
};

export const getDefaultLunchWindow = (empleado: string, week: number): LunchWindow => {
  
  if (empleado === "Notario") {
    return {
      inicio: "13:00",
      fin: "14:30",
    };
  }

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
      inicio: override.hora_inicio.substring(0, 5),
      fin: override.hora_fin.substring(0, 5),
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

export const generarHorarios = (horaFin = "18:00") => {
  const horarios: string[] = [];
  const limiteMinutos = toMinutes(horaFin);

  let hora = 8;
  let minuto = 30;

  while (hora * 60 + minuto <= limiteMinutos) {
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

export const getHoraFin = (horaInicio: string, duracionMinutos = 30) => {
  const [h, m] = horaInicio.split(":").map(Number);
  const totalMinutes = h * 60 + m + duracionMinutos;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
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
