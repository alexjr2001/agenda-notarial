"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type Props = {
    cita: any;
    children: React.ReactNode;
    onClick?: () => void;
};

export default function DraggableCita({
    cita,
    children,
    onClick,
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

    const handleClick = (e: React.MouseEvent) => {
        // El activationConstraint en el DndContext previene que el drag se active
        // si el movimiento es < 8px, permitiendo que solo se ejecute el click
        if (onClick) {
            onClick();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="w-full h-full"
            onClick={handleClick}
        >
            {children}
        </div>
    );
}
