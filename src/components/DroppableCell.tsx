"use client";

import { useDroppable } from "@dnd-kit/core";
import React from "react";

type Props = {
    empleadoId: number;
    empleadoNombre: string;
    hora: string;
    children: React.ReactNode;
};

export default function DroppableCell({
    empleadoId,
    empleadoNombre,
    hora,
    children,
}: Props) {
    const { isOver, setNodeRef } = useDroppable({
        id: `${empleadoId}-${hora}`,
        data: {
            empleadoId,
            empleadoNombre,
            hora,
        },
    });

    return (
        <div ref={setNodeRef} className={isOver ? "bg-green-100" : ""}>
            {children}
        </div>
    );
}
