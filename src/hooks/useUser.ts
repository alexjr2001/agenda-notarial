"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const useUser = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getSession();
            setUser(data.session?.user ?? null);
        };

        getUser();

        const { data: listener } =
            supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

        return () => listener.subscription.unsubscribe();
    }, []);

    return { user, loading };
};