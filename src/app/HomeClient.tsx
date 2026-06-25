"use client";

import LoginPage from "@/components/LoginPage";
import Agenda from "@/components/Agenda";
import { useAuth } from "@/context/AuthProvider";

export default function HomeClient() {
    const { user, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;
    if (!user) return <LoginPage />;

    return <Agenda />;
}