"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        setLoading(true);

        if (!email || !password) {
            alert("Completa email y contraseña");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                alert(error.message);
                return;
            }

            await supabase.auth.getSession();
        } catch (err: any) {
            alert("Error inesperado: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-80 space-y-4 border p-6 rounded">

                <h1 className="text-xl font-bold text-center">
                    Iniciar sesión
                </h1>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAuth();
                    }}
                    className="space-y-4"
                >
                    <input
                        className="w-full border p-2 rounded"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        className="w-full border p-2 rounded"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full border p-2 rounded bg-black text-white"
                    >
                        {loading ? "Cargando..." : "Entrar"}
                    </button>
                </form>

            </div>
        </div>
    );
}