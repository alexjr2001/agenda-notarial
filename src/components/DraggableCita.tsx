"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type Props = {
    cita: any;
    children: React.ReactNode;
    onDoubleClick?: () => void;
};

export default function DraggableCita({
    cita,
    children,
    onDoubleClick,
}: Props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: cita.id,
        data: {
            cita,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        // Evita que el doble click burbujee al td y dispare acciones duplicadas.
        e.stopPropagation();
        if (onDoubleClick) {
            onDoubleClick();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="w-full h-full"
            onDoubleClick={handleDoubleClick}
        >
            {children}
        </div>
    );
}
