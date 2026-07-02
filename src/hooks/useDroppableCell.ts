"use client";

import { useDroppable } from "@dnd-kit/core";

export const useDroppableCell = (empleadoId: number, empleadoNombre: string, hora: string) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `${empleadoId}-${hora}`,
        data: {
            empleadoId,
            empleadoNombre,
            hora,
        },
    });

    return { isOver, setNodeRef };
};
