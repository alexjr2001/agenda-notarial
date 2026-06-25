"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Cita,
    LunchOverride,
    SelectedCell,
    getHoraFin,
    hoyISO,
    sumarDiasISO,
    isLockExpired,
} from "@/lib/utils";

export const useAgenda = (user: any) => {
    const [fecha, setFecha] = useState(hoyISO());
    const [citas, setCitas] = useState<Cita[]>([]);
    const [lunchOverrides, setLunchOverrides] = useState<LunchOverride[]>([]);
    const [cliente, setCliente] = useState("");
    const [tramite, setTramite] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [open, setOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
    const [editingLunch, setEditingLunch] = useState(false);
    const [lunchStart, setLunchStart] = useState("");
    const [lunchEnd, setLunchEnd] = useState("");

    const citaSeleccionada = useMemo(() => {
        if (!selectedCell) return null;

        return (
            citas.find(
                (c) =>
                    c.empleado_id === selectedCell.empleadoId &&
                    c.hora_inicio.substring(0, 5) === selectedCell.hora
            ) ?? null
        );
    }, [citas, selectedCell]);

    const fetchCitas = useCallback(async () => {
        const { data, error } = await supabase
            .from("citas")
            .select("*")
            .eq("fecha", fecha)
            .order("hora_inicio")
            .is("deleted_at", null);

        if (error) {
            alert(error.message);
            return;
        }

        const citasData = (data ?? []) as Cita[];

        // 🔒 detectar expiradas
        const expiradas = citasData.filter((cita) =>
            isLockExpired(cita.locked_at)
        );

        // 🧹 limpiar en DB en paralelo (más rápido)
        if (expiradas.length > 0) {
            await Promise.all(
                expiradas.map((cita) =>
                    supabase
                        .from("citas")
                        .update({
                            locked_by: null,
                            locked_at: null,
                        })
                        .eq("id", cita.id)
                )
            );
        }

        // ✅ limpiar también en frontend
        const citasLimpias = citasData.map((cita) =>
            isLockExpired(cita.locked_at)
                ? { ...cita, locked_by: null, locked_at: null }
                : cita
        );

        setCitas(citasLimpias);
    }, [fecha]);

    useEffect(() => {
        fetchCitas();
    }, [fetchCitas]);

    const fetchAlmuerzos = useCallback(async () => {
        const { data, error } = await supabase
            .from("almuerzos")
            .select("*")
            .eq("fecha", fecha);

        if (error) {
            console.error(error);
            return;
        }

        setLunchOverrides((data ?? []) as LunchOverride[]);
    }, [fecha]);

    useEffect(() => {
        fetchAlmuerzos();
    }, [fetchAlmuerzos]);

    // Suscripciones en tiempo real para refrescar cuando otros usuarios hagan cambios
    useEffect(() => {
        const citasChannel = supabase
            .channel("citas-ch")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "citas" },
                () => fetchCitas()
            )
            .subscribe();

        const almChannel = supabase
            .channel("almuerzos-ch")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "almuerzos" },
                () => fetchAlmuerzos()
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(citasChannel);
            } catch (e) {
                // ignore
            }

            try {
                supabase.removeChannel(almChannel);
            } catch (e) {
                // ignore
            }
        };
    }, [fetchCitas, fetchAlmuerzos]);

    const abrirCelda = async (
        empleadoId: number,
        empleadoNombre: string,
        hora: string
    ) => {
        // 🔥 SIEMPRE leer DB fresca
        const { data } = await supabase
            .from("citas")
            .select("*")
            .eq("fecha", fecha);

        const citasActualizadas = (data ?? []) as Cita[];

        const cita = citasActualizadas.find(
            (c) =>
                c.empleado_id === empleadoId &&
                c.hora_inicio.substring(0, 5) === hora
        );

        // Si existe una cita, revisar el bloqueo actual antes de abrir
        if (cita) {
            if (cita.locked_by && cita.locked_by !== user.email && !isLockExpired(cita.locked_at)) {
                alert("Esta cita está siendo editada por otra persona.");
                return;
            }

            const { data: updated, error: updateError } = await supabase
                .from("citas")
                .update({
                    locked_by: user.email,
                    locked_at: new Date().toISOString(),
                })
                .eq("id", cita.id)
                .select()
                .single();

            if (updateError || !updated) {
                alert("No se pudo bloquear la cita");
                return;
            }

            setCliente(cita.cliente);
            setTramite(cita.tramite);
            setObservaciones(cita.observaciones || "");
        } else {
            setCliente("");
            setTramite("");
            setObservaciones("");

            // Crear placeholder bloqueado para reservar la celda mientras el usuario crea
            const { data: created, error: createError } = await supabase
                .from("citas")
                .insert({
                    fecha,
                    hora_inicio: `${hora}:00`,
                    hora_fin: getHoraFin(hora),
                    empleado_id: empleadoId,
                    cliente: "",
                    tramite: "",
                    observaciones: null,
                    created_by: user.email ?? "No se sabe",
                    locked_by: user.email,
                    locked_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (createError) {
                console.error(createError);
            } else {
                // refrescar citas para que otros vean el placeholder
                await fetchCitas();
            }
        }

        setSelectedCell({ empleadoId, empleadoNombre, hora });
        setOpen(true);
    };

    const releaseLock = useCallback(async () => {
        if (!selectedCell) return;

        // leer el estado actual de la cita desde la DB para evitar usar datos locales obsoletos
        const { data: currentCita, error: currentError } = await supabase
            .from("citas")
            .select("*")
            .eq("fecha", fecha)
            .eq("empleado_id", selectedCell.empleadoId)
            .eq("hora_inicio", `${selectedCell.hora}:00`)
            .single();

        if (currentError || !currentCita) return;
        if (currentCita.locked_by !== user.email) return;

        try {
            const isPlaceholder = currentCita.cliente === "" && (!currentCita.tramite || currentCita.tramite === null);

            if (isPlaceholder) {
                await supabase
                    .from("citas")
                    .delete()
                    .eq("id", currentCita.id);
            } else {
                await supabase
                    .from("citas")
                    .update({ locked_by: null, locked_at: null })
                    .eq("id", currentCita.id);
            }

            await fetchCitas();
        } catch (e) {
            console.error(e);
        }
    }, [selectedCell, citas, fetchCitas, user.email]);

    const guardarCita = async () => {
        if (!selectedCell) return;

        const existente = citas.find(
            (c) =>
                c.empleado_id === selectedCell.empleadoId &&
                c.hora_inicio.substring(0, 5) === selectedCell.hora
        );

        if (!cliente.trim() || !tramite.trim()) {
            alert("Cliente y trámite son obligatorios");
            return;
        }

        const horaInicio = selectedCell.hora;
        const horaFin = getHoraFin(horaInicio);

        if (existente) {

            // 1. guardar log antes del update
            await supabase.from("citas_logs").insert({
                cita_id: existente.id, // 👈 asegura string uuid
                old_data: {
                    cliente: existente.cliente,
                    tramite: existente.tramite,
                    observaciones: existente.observaciones,
                },
                new_data: {
                    cliente,
                    tramite,
                    observaciones,
                },
                user_email: user.email,
            });

            // 2. actualizar cita
            const { error } = await supabase
                .from("citas")
                .update({
                    cliente,
                    tramite,
                    observaciones,
                    updated_at: new Date().toISOString(),
                    updated_by: user.email,
                })
                .eq("id", existente.id);

            if (error) {
                alert(error.message);
                return;
            }
            // liberar lock después de guardar
            await supabase
                .from("citas")
                .update({ locked_by: null, locked_at: null })
                .eq("id", existente.id);
        } else {
            const { error } = await supabase.from("citas").insert({
                fecha,
                hora_inicio: `${horaInicio}:00`,
                hora_fin: horaFin,
                empleado_id: selectedCell.empleadoId,
                cliente,
                tramite,
                observaciones,
                created_by: user.email ?? "No se sabe",
            });

            if (error) {
                alert(error.message);
                return;
            }
            // en caso se hubiese creado un placeholder bloqueado, liberar lock (si existe)
            await supabase
                .from("citas")
                .update({ locked_by: null, locked_at: null })
                .eq("fecha", fecha)
                .eq("hora_inicio", `${horaInicio}:00`)
                .eq("empleado_id", selectedCell.empleadoId);
        }

        await fetchCitas();
        alert("Guardado");

        setCliente("");
        setTramite("");
        setObservaciones("");
        setOpen(false);
    };

    const eliminarCita = async () => {
        if (!selectedCell) return;

        const cita = citas.find(
            (c) =>
                c.empleado_id === selectedCell.empleadoId &&
                c.hora_inicio.substring(0, 5) === selectedCell.hora
        );

        if (!cita) return;

        const confirmar = confirm("¿Eliminar esta cita?");
        if (!confirmar) return;

        const { error } = await supabase
            .from("citas")
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user?.email,
            })
            .eq("id", cita.id);

        if (error) {
            alert(error.message);
            return;
        }

        await fetchCitas();
        setOpen(false);
    };

    const editarAlmuerzo = async (
        empleadoId: number,
        empleadoNombre: string,
    ) => {
        setSelectedCell({ empleadoId, empleadoNombre, hora: "" });

        // buscar override existente para este empleado y fecha
        const existente = lunchOverrides.find(
            (l) => l.empleado_id === empleadoId && l.fecha === fecha
        );

        if (existente) {
            setLunchStart(existente.hora_inicio.substring(0,5));
            setLunchEnd(existente.hora_fin.substring(0,5));
        } else {
            setLunchStart("12:30");
            setLunchEnd("13:30");
        }

        setEditingLunch(true);
        setOpen(true);
    };

    const guardarAlmuerzo = async () => {
        if (!selectedCell) return;
        if (!lunchStart || !lunchEnd) {
            alert("Inicio y fin son obligatorios");
            return;
        }

        // Validar que inicio sea anterior a fin y no sean iguales
        const toMinutes = (t: string) => {
            const [hh, mm] = t.split(":").map(Number);
            return hh * 60 + mm;
        };

        if (lunchStart === lunchEnd) {
            alert("La hora de inicio y fin no pueden ser iguales");
            return false;
        }

        if (toMinutes(lunchEnd) <= toMinutes(lunchStart)) {
            alert("La hora de fin debe ser posterior a la hora de inicio");
            return false;
        }

        const { error } = await supabase
            .from("almuerzos")
            .upsert(
                {
                    empleado_id: selectedCell.empleadoId,
                    fecha,
                    hora_inicio: lunchStart,
                    hora_fin: lunchEnd,
                    editado_por: user.email ?? "No se sabe",
                },
                { onConflict: "empleado_id,fecha" }
            );

        if (error) {
            alert(error.message);
            return false;
        }

        await fetchAlmuerzos();
        setEditingLunch(false);
        setOpen(false);
        return true;
    };

    const irHoy = () => setFecha(hoyISO());
    const irAyer = () => setFecha((actual: string) => sumarDiasISO(actual, -1));
    const irMañana = () => setFecha((actual: string) => sumarDiasISO(actual, 1));

    return {
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
        selectedCell,
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
        irHoy,
        irAyer,
        irMañana,
        releaseLock,
    };
};