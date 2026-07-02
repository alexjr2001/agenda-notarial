"use client";

import { useDroppable } from "@dnd-kit/core";
import DraggableCita from "@/components/DraggableCita";
import { Cita } from "@/lib/utils";
import { colorMap } from "@/lib/colors";

type Props = {
    cita: Cita | undefined;
    isCitaInicio: boolean;
    span: number;
    isLockedByOther: boolean;
    isPlaceholder: boolean;
    isMine: boolean;
    almuerzo: boolean;
    isAdmin: boolean;
    citaColor: any;
    label: string | null;
    blockedMessage?: string;
    blockedTitle?: string;
    empleadoId: number;
    empleadoNombre: string;
    hora: string;
    onCellClick: () => void;
};

export default function AgendaCell({
    cita,
    isCitaInicio,
    span,
    isLockedByOther,
    isPlaceholder,
    isMine,
    almuerzo,
    isAdmin,
    citaColor,
    label,
    blockedMessage,
    blockedTitle,
    empleadoId,
    empleadoNombre,
    hora,
    onCellClick,
}: Props) {
    const { isOver, setNodeRef } = useDroppable({
        id: `${empleadoId}-${hora}`,
        data: { empleadoId, empleadoNombre, hora },
    });

    const lockedClass = isLockedByOther
        ? "bg-red-100 border-red-400 text-red-800"
        : "";

    if (cita && !isCitaInicio) {
        return null;
    }

    return (
        <td
            ref={setNodeRef}
            rowSpan={cita && isCitaInicio ? span : 1}
            className={`h-10 align-top p-0.2 ${isOver ? "bg-green-100" : ""} ${
                blockedMessage
                    ? "cursor-not-allowed"
                    : isLockedByOther
                        ? "cursor-not-allowed"
                        : almuerzo && !isAdmin
                            ? "cursor-default"
                            : cita && isCitaInicio
                                ? "cursor-grab active:cursor-grabbing"
                                : "cursor-pointer"
            }`}
            onClick={() => {
                if (blockedMessage) return;
                // Click en almuerzo o celda vacía
                if (!cita || !isCitaInicio) {
                    onCellClick();
                }
            }}
        >
            {blockedMessage ? (
                <div
                    title={blockedTitle}
                    className="h-full font-bold flex items-center justify-center text-[10px] uppercase tracking-wide text-black-500 bg-gray-100 rounded-lg border border-gray-300 text-center px-1"
                >
                    {blockedMessage}
                </div>
            ) : almuerzo ? (
                <div className="h-full font-bold flex items-center justify-center text-xs text-black-500 bg-yellow-100 rounded-lg border border-yellow-400">
                    ALMUERZO
                </div>
            ) : cita && isCitaInicio ? (
                <DraggableCita cita={cita} onClick={onCellClick}>
                    <div
                        className={`h-full rounded-lg p-2 text-xs shadow-sm border ${citaColor.bg} ${citaColor.border} ${lockedClass}`}
                    >
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
                </DraggableCita>
            ) : (
                <div className="h-full rounded-lg hover:bg-gray-50 transition" />
            )}
        </td>
    );
}
