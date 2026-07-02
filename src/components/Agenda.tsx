"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAgenda } from '@/hooks/useAgenda';
import { supabase } from "@/lib/supabase";
import { colorMap } from "@/lib/colors";
import DraggableCita from "@/components/DraggableCita";
import AgendaCell from "@/components/AgendaCell";

import {
    Empleado,
    esAlmuerzo,
    generarHorarios,
    getCitaSpan,
    getWeekNumber,
    isLocked,
    isTimeInCita,
} from "@/lib/utils";

import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

export default function Agenda() {
    const { user } = useAuth();
    if (!user) return null;

    const agenda = useAgenda(user);
    const {
        fecha,
        setFecha,
        citas,
        lunchOverrides,
        cliente,
        setCliente,
        tramite,
        setTramite,
        observaciones,
        setObservaciones,
        open,
        setOpen,
        citaSeleccionada,
        editingLunch,
        setEditingLunch,
        lunchStart,
        setLunchStart,
        lunchEnd,
        setLunchEnd,
        duracionMinutos,
        setDuracionMinutos,
        abrirCelda,
        guardarCita,
        eliminarCita,
        editarAlmuerzo,
        guardarAlmuerzo,
        releaseLock,
        vacaciones,
        toggleVacaciones,
        setEmpleados: setEmpleadosInAgenda,
        cargaWarning,
    } = agenda;

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Requiere arrastrar al menos 8px para activar el drag
            },
        })
    );

    const handleCloseDialog = async () => {
        agenda.setCargaWarning?.(null);
        setEditingLunch(false);
        setOpen(false);
        await releaseLock?.();
    };

    useEffect(() => {
        const fetchEmpleados = async () => {
            const { data, error } = await supabase
                .from("empleados")
                .select("*");

            if (!error) {
                setEmpleados(data);
                setEmpleadosInAgenda(data);
            }
        };

        fetchEmpleados();
    }, [setEmpleadosInAgenda]);

    useEffect(() => {
        const fetchAdmin = async () => {
            const { data } = await supabase
                .from("admins")
                .select("id")
                .eq("id", user.id)
                .single();

            setIsAdmin(!!data);
        };
        fetchAdmin();
    }, [user.id]);

    const horarios = generarHorarios();
    const week = getWeekNumber(new Date(fecha));
    const [activeId, setActiveId] = useState<any>(null);

    const moverCita = agenda.moverCita;

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const citaId = active.id as number;
        const [empleadoDestino, horaDestino] = (over.id as string).split("-");
        const empleadoDestId = parseInt(empleadoDestino);

        const empleadoDestNombre = empleados.find(
            (e) => e.id === empleadoDestId
        )?.nombre || "";

        if (empleadoDestNombre) {
            await moverCita(citaId, empleadoDestId, empleadoDestNombre, horaDestino);
        }
    };

    const activeCita = activeId
        ? citas.find((c) => c.id === activeId)
        : null;

    return (
        <div className="min-h-screen bg-gray-50 p-2">
            <div className="w-full mx-auto space-y-2">

                {/* HEADER */}
                <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="border rounded-lg px-3 py-1 text-sm"
                    />

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            {user.email}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                {/* TABLA */}
                <DndContext
                    onDragEnd={handleDragEnd}
                    onDragStart={(event) => setActiveId(event.active.id)}
                    sensors={sensors}
                >
                    <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
                        <table className="w-full border-collapse">

                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left text-xs font-medium text-gray-500">
                                        Hora
                                    </th>

                                    {empleados.map((emp) => {
                                        const vacacion = vacaciones.find(
                                            (vac) => vac.empleado_id === emp.id
                                        );

                                        return (
                                            <th
                                                key={emp.id}
                                                className="p-3 text-left text-xs font-medium text-gray-500"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{emp.nombre}</span>
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleVacaciones(emp.id, emp.nombre)}
                                                            className={`text-[10px] rounded-full px-2 py-0.5 font-semibold whitespace-nowrap ${vacacion ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                                                        >
                                                            {vacacion ? "❌" : "✅"}
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {horarios.map((hora) => (
                                    <tr key={hora} className="border-t border-gray-100">

                                        {/* HORA */}
                                        <td className="p-2 text-xs text-gray-500 w-28">
                                            {hora}
                                        </td>

                                        {/* CELDAS */}
                                        {empleados.map((emp) => {
                                            const vacacion = vacaciones.find(
                                                (vac) => vac.empleado_id === emp.id
                                            );
                                            const blockedMessage = vacacion ? "No presente" : "";
                                            const blockedTitle = vacacion
                                                ? vacacion.observacion || "Vacaciones/Permiso por recuperar"
                                                : "";
                                            const cita = citas.find(
                                                (c) =>
                                                    c.empleado_id === emp.id &&
                                                    isTimeInCita(hora, c)
                                            );
                                            const isCitaInicio = cita ? cita.hora_inicio.substring(0, 5) === hora : false;
                                            const span = cita && isCitaInicio ? getCitaSpan(cita.hora_inicio, cita.hora_fin) : 1;
                                            const override = lunchOverrides.find(
                                                (l) => l.empleado_id === emp.id && l.fecha === fecha
                                            ) ?? null;
                                            const almuerzo = esAlmuerzo(emp.nombre, hora, week, override);
                                            const citaColor = colorMap[emp.color] ?? {
                                                bg: "bg-blue-500",
                                                border: "border-black/10",
                                            };
                                            const isLockedByOther = cita ? isLocked(cita, user.email) : false;
                                            const isPlaceholder = cita ? cita.cliente === "" && (!cita.tramite || cita.tramite === "") : false;
                                            const isMine = cita ? cita.locked_by === user.email : false;
                                            const label = isLockedByOther
                                                ? "Está editando"
                                                : isPlaceholder && isMine
                                                    ? "Creando..."
                                                    : null;

                                            return (
                                                <AgendaCell
                                                    key={`${hora}-${emp.id}`}
                                                    cita={cita}
                                                    isCitaInicio={isCitaInicio}
                                                    span={span}
                                                    isLockedByOther={isLockedByOther}
                                                    isPlaceholder={isPlaceholder}
                                                    isMine={isMine}
                                                    almuerzo={almuerzo}
                                                    isAdmin={isAdmin}
                                                    citaColor={citaColor}
                                                    label={label}
                                                    empleadoId={emp.id}
                                                    empleadoNombre={emp.nombre}
                                                    hora={hora}
                                                    blockedMessage={blockedMessage}
                                                    blockedTitle={blockedTitle}
                                                    onCellClick={() => {
                                                        if (blockedMessage) return;
                                                        if (isLockedByOther) return;

                                                        if (almuerzo) {
                                                            if (!isAdmin) return;
                                                            editarAlmuerzo(emp.id, emp.nombre);
                                                        }
                                                        else abrirCelda(emp.id, emp.nombre, hora);
                                                    }}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <DragOverlay>
                        {activeCita ? (
                            <div className="rounded-lg p-2 text-xs shadow-xl border bg-blue-500 border-black/10">
                                <div className="font-bold text-black/80 truncate">
                                    {activeCita.tramite}
                                </div>
                                <div className="font-medium text-black/60 truncate">
                                    {activeCita.cliente}
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>

                {/* MODAL */}
                <Dialog open={open} onOpenChange={(value) => {
                    if (!value) {
                        handleCloseDialog();
                    }
                }}>
                    <DialogContent
                        className="bg-white rounded-xl shadow-xl border border-gray-100 p-6"
                        onClose={handleCloseDialog}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                {editingLunch
                                    ? "Editar horas de almuerzo"
                                    : citaSeleccionada
                                        ? "Editar cita"
                                        : "Nueva cita"}
                            </DialogTitle>
                        </DialogHeader>
                        {editingLunch ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Hora inicio
                                        </label>
                                        <input
                                            type="time"
                                            value={lunchStart}
                                            onChange={(e) => setLunchStart(e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Hora fin
                                        </label>
                                        <input
                                            type="time"
                                            value={lunchEnd}
                                            onChange={(e) => setLunchEnd(e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={guardarAlmuerzo}
                                        className="px-3 py-2 text-sm rounded-lg bg-black text-white"
                                    >
                                        Guardar almuerzo
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEditingLunch(false);
                                            setOpen(false);
                                        }}
                                        className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    value={cliente}
                                    onChange={(e) => setCliente(e.target.value)}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Cliente"
                                />

                                <input
                                    value={tramite}
                                    onChange={(e) => setTramite(e.target.value)}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Trámite"
                                />

                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Observaciones"
                                />

                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDuracionMinutos(30)}
                                            className={`px-3 py-2 text-sm rounded-lg ${duracionMinutos === 30 ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
                                        >
                                            30 min
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDuracionMinutos(60)}
                                            className={`px-3 py-2 text-sm rounded-lg ${duracionMinutos === 60 ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
                                        >
                                            1 h
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={guardarCita}
                                            className="px-3 py-2 text-sm rounded-lg bg-black text-white"
                                        >
                                            Guardar
                                        </button>

                                        {citaSeleccionada && (
                                            <button
                                                onClick={eliminarCita}
                                                className="px-3 py-2 text-sm rounded-lg bg-red-100 text-red-700"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
                <div className="text-center text-xs text-gray-400 mt-6">
                    © Copyright - Created by FDW software
                </div>
            </div>
        </div>
    );
}
