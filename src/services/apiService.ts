const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface TournamentDashboardPayload {
    schema: unknown[];
    responses: unknown[];
    // NUEVO: Añadimos la interfaz de metadata
    metadata?: {
        start_date?: string | null;
        end_date?: string | null;
        court_schedule?: Record<string, Record<string, number>> | null;
        status?: string | null;
    } | null;
    google_form_id?: string | null;
    form_id?: string | null;
}

export const apiService = {
    async getTournamentDashboard(
        tournamentId: string,
        signal?: AbortSignal
    ): Promise<TournamentDashboardPayload> {
        const response = await fetch(
            `${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/dashboard`,
            {
                method: 'GET',
                headers: {
                    'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
                },
                signal
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        const data = json.data ?? json;

        return {
            schema: Array.isArray(data.schema) ? data.schema : [],
            responses: Array.isArray(data.responses) ? data.responses : [],
            metadata: data.metadata ?? null,
            google_form_id: data.google_form_id ?? data.form_id ?? null,
            form_id: data.form_id ?? null
        };
    },

    async getSchemasTournaments(signal?: AbortSignal): Promise<Array<{ id: string; name: string }>> {
        const response = await fetch(`${BASE_URL}/schemas`, {
            method: 'GET',
            headers: {
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

        return rawList
            .map((item: Record<string, unknown>) => ({
                id: String(item.id ?? ''),
                name: String(item.name ?? item.title ?? 'Torneo')
            }))
            .filter((t: { id: string }) => Boolean(t.id));
    },

    async submitRegistration(data: any) {
        const response = await fetch(`${BASE_URL}/registrations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    },

    async deleteRegistration(responseId: string) {
        const response = await fetch(`${BASE_URL}/registrations/${encodeURIComponent(responseId)}`, {
            method: 'DELETE',
            headers: {
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        return await response.json().catch(() => ({}));
    },

    async submitRegistrationsBulk(normalizedData: unknown[]) {
        const response = await fetch(`${BASE_URL}/registrations/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify(normalizedData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({}));
        const inserted = Number(
            data.inserted ?? data.inserted_count ?? data.nuevos ?? data.new ?? 0
        );
        const skipped = Number(
            data.skipped ?? data.skipped_count ?? data.omitidos ?? data.duplicates ?? 0
        );

        return { inserted, skipped, raw: data };
    },

    async saveSchema(schemaData: any) {
        const response = await fetch(`${BASE_URL}/schemas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify(schemaData)
        });

        if (!response.ok) {
            console.error('Error saving schema:', response.statusText);
        }

        return await response.json().catch(() => ({}));
    },

    async generateTournament(tournamentId: string, payload: { start_date: string, end_date: string, court_schedule: Record<string, Record<string, number>> }) {
        const response = await fetch(`${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al iniciar la generación de cuadros');
        }

        return await response.json();
    },

    async getTournamentMatches(tournamentId: string, signal?: AbortSignal): Promise<{ status: string, data: any[], metadata?: any }> {
        const response = await fetch(`${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/matches`, {
            method: 'GET',
            headers: {
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        return {
            status: json.status || 'success',
            data: json.data || [],
            metadata: json.metadata || null
        };
    },

    async updateMatch(tournamentId: string, matchId: string | number, data: { scheduled_at?: string, court?: string, result?: string }) {
        const response = await fetch(`${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/matches/${matchId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al actualizar el partido en la BD');
        }

        return await response.json();
    },

    async generateBrackets(
        tournamentId: string,
        category: string,
        numFirsts: number,
        numSeconds: number,
        numThirds: number // <-- Añadir aquí
    ): Promise<any> {
        const response = await fetch(`${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/brackets/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify({
                category: category,
                num_firsts: numFirsts,
                num_seconds: numSeconds,
                num_thirds: numThirds // <-- Y aquí
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error al generar fase final`);
        }

        return await response.json();
    },

    async swapGroupTeams(tournamentId: string, category: string, sourceGroupId: number, sourceTeamId: string, targetGroupId: number, targetTeamId: string) {
        const response = await fetch(`${BASE_URL}/tournaments/${tournamentId}/groups/swap`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify({
                category: String(category),
                source_group_id: Number(sourceGroupId), // Forzamos Integer para evitar 422
                source_team_id: String(sourceTeamId),   // Forzamos String para los UUID
                target_group_id: Number(targetGroupId), // Forzamos Integer
                target_team_id: String(targetTeamId)    // Forzamos String
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Error al intercambiar equipos en los grupos");
        }
        return response.json();
    },

    async swapBracketSlots(
        tournamentId: string,
        sourceMatchId: string | number,
        sourcePos: 'home' | 'away',
        targetMatchId: string | number,
        targetPos: 'home' | 'away'
    ) {
        const response = await fetch(`${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}/brackets/swap`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': (import.meta as any).env?.BACKEND_API_KEY || ''
            },
            body: JSON.stringify({
                source_match_id: sourceMatchId,
                source_pos: sourcePos,
                target_match_id: targetMatchId,
                target_pos: targetPos
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al intercambiar los cruces en la BD');
        }

        return await response.json();
    },
};
