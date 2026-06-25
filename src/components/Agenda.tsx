"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAgenda } from '@/hooks/useAgenda';
import { supabase } from "@/lib/supabase";
import { colorMap } from "@/lib/colors";

import {
    Empleado,
    esAlmuerzo,
    generarHorarios,
    getWeekNumber,
    isLocked,
} from "@/lib/utils";

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
        abrirCelda,
        guardarCita,
        eliminarCita,
        editarAlmuerzo,
        guardarAlmuerzo,
        releaseLock,
    } = agenda;

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const handleCloseDialog = async () => {
        setEditingLunch(false);
        setOpen(false);
        await releaseLock?.();
    };

    useEffect(() => {
        const fetchEmpleados = async () => {
            const { data, error } = await supabase
                .from("empleados")
                .select("*");

            if (!error) setEmpleados(data);
        };

        fetchEmpleados();
    }, []);

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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-4">

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
                <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
                    <table className="w-full border-collapse">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left text-xs font-medium text-gray-500">
                                    Hora
                                </th>

                                {empleados.map((emp) => (
                                    <th
                                        key={emp.id}
                                        className="p-3 text-left text-xs font-medium text-gray-500"
                                    >
                                        {emp.nombre}
                                    </th>
                                ))}
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
                                        const cita = citas.find(
                                            (c) =>
                                                c.empleado_id === emp.id &&
                                                c.hora_inicio.substring(0, 5) === hora
                                        );
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
                                        const lockedClass = isLockedByOther
                                            ? "bg-red-100 border-red-400 text-red-800"
                                            : "";
                                        const label = isLockedByOther
                                            ? "Está editando"
                                            : isPlaceholder && isMine
                                                ? "Creando..."
                                                : null;

                                        return (
                                            <td
                                                key={`${hora}-${emp.id}`}
                                                className={`h-16 align-top p-1 ${isLockedByOther
                                                    ? "cursor-not-allowed"
                                                    : almuerzo && !isAdmin
                                                        ? "cursor-default"
                                                        : "cursor-pointer"
                                                    }`}
                                                onClick={() => {
                                                    if (isLockedByOther) return;

                                                    if (almuerzo) {
                                                        if (!isAdmin) return;
                                                        editarAlmuerzo(emp.id, emp.nombre);
                                                    }
                                                    else abrirCelda(emp.id, emp.nombre, hora);
                                                }}
                                            >
                                                {/* ALMUERZO */}
                                                {almuerzo ? (
                                                    <div className="h-full font-bold flex items-center justify-center text-xs text-black-500 bg-yellow-100 rounded-lg border border-yellow-400">
                                                        ALMUERZO
                                                    </div>
                                                ) : cita ? (
                                                    <div className={`h-full rounded-lg p-2 text-xs shadow-sm border ${citaColor.bg} ${citaColor.border} ${lockedClass}`}>
                                                        {label ? (
                                                            <div className="flex h-full items-center justify-center font-bold text-center">
                                                                {label}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-bold text-black/80 truncate">
                                                                    {cita.tramite}
                                                                </div>
                                                                <div className="font-medium text-black/60 truncate">
                                                                    {cita.cliente}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* VACÍO */
                                                    <div className="h-full rounded-lg hover:bg-gray-50 transition" />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}