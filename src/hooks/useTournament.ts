import { useState, useCallback } from 'react';

const STORAGE_KEY = 'selectedTournamentId';

export function useTournament() {
    // Al inicializar, simplemente cogemos el valor de localStorage o string vacío
    const [tournamentId, setTournamentId] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY) || "";
    });

    const updateTournamentId = useCallback((id: string) => {
        setTournamentId(id);
        if (id) {
            localStorage.setItem(STORAGE_KEY, id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    return {
        tournamentId,
        setTournamentId: updateTournamentId
    };
}