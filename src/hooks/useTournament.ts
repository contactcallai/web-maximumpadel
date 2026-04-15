import { useState, useCallback } from 'react';
import { TOURNAMENTS } from '../data/mockData';

const STORAGE_KEY = 'selectedTournamentId';

export function useTournament() {
    const [tournamentId, setTournamentId] = useState<string>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Verify saved ID exists in our TOURNAMENTS list, otherwise fallback to first
        const exists = TOURNAMENTS.some(t => t.id === saved);
        return exists ? (saved as string) : TOURNAMENTS[0].id;
    });

    const updateTournamentId = useCallback((id: string) => {
        setTournamentId(id);
        localStorage.setItem(STORAGE_KEY, id);
    }, []);

    return {
        tournamentId,
        setTournamentId: updateTournamentId
    };
}
