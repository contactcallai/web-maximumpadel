import { FileSpreadsheet, ChevronDown, FolderTree, ClipboardList, Loader2, RefreshCw, AlertCircle, CloudUpload, CheckCircle, XCircle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTournament } from '../hooks/useTournament';
import { useAuth } from '../context/AuthContext';
import ResponseTable from '../components/ResponseTable';
import {
    generateSchemaMap,
    normalizeResponse,
    denormalizeRegistrationToAnswers,
    QuestionMapping,
    IngestedData
} from '../utils/formIngestion';
import { apiService } from '../services/apiService';
import './Panel.css';

interface Tournament {
    id: string;
    name: string;
    google_form_id: string;
}

type Registration = IngestedData;

function sortCategories(a: string, b: string): number {
    const getRank = (cat: string) => {
        const c = cat.toLowerCase();
        let rank = 0;
        const numMatch = c.match(/(\d+)/);
        if (numMatch) rank += parseInt(numMatch[1], 10) * 10;
        else rank += 100;
        if (c.includes('masc')) rank += 1;
        else if (c.includes('fem')) rank += 2;
        else if (c.includes('mix')) rank += 3;
        else rank += 5;
        return rank;
    };
    return getRank(a) - getRank(b);
}

function mapDashboardSchemaToState(schemaArr: unknown[]): {
    fullMapping: Record<string, QuestionMapping>;
    formSchema: Record<string, { title: string; order_index?: number; type?: QuestionMapping['type']; options?: string[] }>;
} {
    const fullMapping: Record<string, QuestionMapping> = {};
    const formSchema: Record<string, { title: string; order_index?: number; type?: QuestionMapping['type']; options?: string[] }> = {};

    for (const item of schemaArr) {
        const q = item as Record<string, unknown>;
        const id = String(q.id ?? q.question_id ?? q.questionId ?? '');
        if (!id) continue;

        const rawType = String(q.type ?? 'TEXT').toUpperCase();
        const type: QuestionMapping['type'] =
            rawType === 'SELECT' || rawType === 'CHECKBOX' ? (rawType as QuestionMapping['type']) : 'TEXT';

        const titleStr = String(q.title ?? '');
        const titleUpper = titleStr.toUpperCase();
        let options = Array.isArray(q.options) ? (q.options as string[]) : undefined;

        if (options && (titleUpper.includes('CATEGOR') || titleUpper.includes('MODALIDAD'))) {
            options = [...options].sort(sortCategories);
        }

        fullMapping[id] = {
            questionId: id,
            title: titleStr,
            field: q.field as string | undefined,
            group: q.group as QuestionMapping['group'] | undefined,
            order_index: (q.order_index ?? q.orderIndex) as number | undefined,
            type,
            options
        };

        formSchema[id] = {
            title: fullMapping[id].title,
            order_index: fullMapping[id].order_index,
            type: fullMapping[id].type,
            options: fullMapping[id].options
        };
    }

    return { fullMapping, formSchema };
}

function buildGoogleFormsLikeRaw(responseId: string, answers: Record<string, string>) {
    return {
        responseId,
        answers: Object.fromEntries(
            Object.entries(answers).map(([qId, val]) => [
                qId,
                { textAnswers: { answers: [{ value: val }] } }
            ])
        )
    };
}

function dashboardApiRowToIngested(row: unknown, tournamentIdFallback: string): IngestedData {
    const r = row as Record<string, unknown>;
    const playersRaw = Array.isArray(r.players) ? r.players : [];
    const pad = (p: Record<string, unknown> | undefined) => ({
        name: String(p?.name ?? ''),
        lastName: String(p?.lastName ?? p?.last_name ?? ''),
        phone: String(p?.phone ?? ''),
        shirtSize: String(p?.shirtSize ?? p?.shirt_size ?? '')
    });
    const p0 = pad(playersRaw[0] as Record<string, unknown> | undefined);
    const p1 = pad(playersRaw[1] as Record<string, unknown> | undefined);

    const availability = Array.isArray(r.availability)
        ? (r.availability as Record<string, unknown>[]).map((a) => ({
            slot: String(a?.slot ?? ''),
            original_text: String(a?.original_text ?? a?.originalText ?? ''),
            order_index: Number(a?.order_index ?? a?.orderIndex ?? 0)
        }))
        : [];

    const leg = (r.legal as Record<string, unknown>) || {};
    return {
        tournament_id: String(r.tournament_id ?? tournamentIdFallback),
        google_response_id: String(r.google_response_id ?? r.googleResponseId ?? ''),
        category: String(r.category ?? ''),
        players: [p0, p1],
        availability,
        legal: {
            data: Boolean(leg.data),
            marketing: Boolean(leg.marketing),
            image: Boolean(leg.image)
        },
        notes: String(r.notes ?? '')
    };
}

function mapDashboardRegistrationsToRows(
    registrations: unknown[],
    mapping: Record<string, QuestionMapping>,
    tournamentIdFallback: string
): any[] {
    return (registrations || []).map((row, idx) => {
        const r = row as Record<string, unknown>;

        if (Array.isArray(r.players)) {
            const ingested = dashboardApiRowToIngested(row, tournamentIdFallback);
            const responseId = String(
                r.google_response_id ?? r.googleResponseId ?? r.id ?? `row-${idx}`
            );
            const answers = denormalizeRegistrationToAnswers(ingested, mapping);
            const raw = buildGoogleFormsLikeRaw(responseId, answers);
            return { responseId, answers, raw };
        }

        const responseId = String(
            r.google_response_id ??
            r.googleResponseId ??
            r.response_id ??
            r.responseId ??
            r.id ??
            `row-${idx}`
        );

        const answers: Record<string, string> = {};
        const rawAnswers = r.answers;
        if (rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)) {
            for (const [k, v] of Object.entries(rawAnswers as Record<string, unknown>)) {
                answers[k] = v == null ? '' : String(v);
            }
        }

        const raw =
            r.raw && typeof r.raw === 'object' && (r.raw as any).responseId != null
                ? (r.raw as any)
                : buildGoogleFormsLikeRaw(responseId, answers);

        return { responseId, answers, raw };
    });
}

export default function Panel() {
    const navigate = useNavigate();
    const { tournamentId, setTournamentId } = useTournament();
    const { accessToken, refreshGoogleToken } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const tournamentsRef = useRef(tournaments);
    tournamentsRef.current = tournaments;
    const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
    const [schemasLoaded, setSchemasLoaded] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<string | null>(tournamentId || null);
    const [formId, setFormId] = useState<string | null>(null);
    const [isPickerLoading, setIsPickerLoading] = useState(false);

    // Form data state
    const [formSchema, setFormSchema] = useState<Record<string, { title: string; order_index?: number }>>({});
    const [fullMapping, setFullMapping] = useState<Record<string, QuestionMapping>>({});
    const [formResponses, setFormResponses] = useState<any[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Sync state
    const [syncStatus, setSyncStatus] = useState<Record<string, 'pending' | 'syncing' | 'success' | 'error'>>({});
    const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
    const [syncToast, setSyncToast] = useState<string | null>(null);

    // Estados para la configuración del torneo
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [globalCourts, setGlobalCourts] = useState<number>(1);
    const [courtSchedule, setCourtSchedule] = useState<Record<string, Record<string, number>>>({});
    const [manualOverrides, setManualOverrides] = useState<Record<string, Record<string, boolean>>>({});
    const [activeDayTab, setActiveDayTab] = useState<string>('');
    const [isServerProcessing, setIsServerProcessing] = useState<boolean>(false);

    const availabilityDays = useMemo(() => {
        return Object.values(fullMapping)
            .filter(q => q.group === 'availability')
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map(q => ({
                ...q,
                title: (q.title || '').split(':')[0].trim(),
                options: (q.options || []).filter(opt => /^\d{1,2}:\d{2}$/.test(opt))
            }));
    }, [fullMapping]);

    // --- NUEVO: Cálculo dinámico de inscripciones por categoría ---
    const categoryStats = useMemo(() => {
        // 1. Buscamos el ID de la pregunta que representa la categoría
        const categoryQId = Object.keys(fullMapping).find(qId => {
            const title = (fullMapping[qId].title || '').toUpperCase();
            return title.includes('CATEGOR') || title.includes('MODALIDAD');
        });

        if (!categoryQId) return { counts: {}, invalidCategories: [] };

        // 2. Contamos las respuestas
        const counts: Record<string, number> = {};
        formResponses.forEach(row => {
            const cat = row.answers[categoryQId];
            if (cat && cat.trim() !== '') {
                counts[cat] = (counts[cat] || 0) + 1;
            }
        });

        // 3. Detectamos las inválidas (no son múltiplos de 3 o 4)
        const invalidCategories = Object.entries(counts)
            .filter(([_, count]) => count % 3 !== 0 && count % 4 !== 0)
            .map(([cat]) => cat);

        return { counts, invalidCategories };
    }, [fullMapping, formResponses]);

    useEffect(() => {
        if (availabilityDays.length > 0 && Object.keys(courtSchedule).length === 0) {
            const initialSchedule: Record<string, Record<string, number>> = {};
            const initialOverrides: Record<string, Record<string, boolean>> = {};
            availabilityDays.forEach(day => {
                initialSchedule[day.title] = {};
                initialOverrides[day.title] = {};
                (day.options || []).forEach(hour => {
                    initialSchedule[day.title][hour] = globalCourts;
                    initialOverrides[day.title][hour] = false;
                });
            });
            setCourtSchedule(initialSchedule);
            setManualOverrides(initialOverrides);
            setActiveDayTab(availabilityDays[0].title);
        }
    }, [availabilityDays, globalCourts, courtSchedule]);

    const handleGlobalCourtsChange = (newVal: number) => {
        setGlobalCourts(newVal);
        setCourtSchedule(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(day => {
                next[day] = { ...next[day] };
                Object.keys(next[day]).forEach(hour => {
                    if (!manualOverrides[day]?.[hour]) {
                        next[day][hour] = newVal;
                    }
                });
            });
            return next;
        });
    };

    const handleApplyToAll = () => {
        setManualOverrides({});
        setCourtSchedule(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(day => {
                next[day] = { ...next[day] };
                Object.keys(next[day]).forEach(hour => {
                    next[day][hour] = globalCourts;
                });
            });
            return next;
        });
    };

    const handleHourChange = (day: string, hour: string, val: number) => {
        setCourtSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [hour]: val
            }
        }));
        setManualOverrides(prev => ({
            ...prev,
            [day]: {
                ...(prev[day] || {}),
                [hour]: true
            }
        }));
    };

    const ensureValidToken = async (): Promise<string> => {
        if (!accessToken) throw new Error('No estás autenticado.');
        try {
            const check = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
            if (!check.ok) {
                return await refreshGoogleToken();
            }
            return accessToken;
        } catch (e) {
            console.error('Error comprobando la validez del token:', e);
            // Si hay un error de red o no podemos comprobarlo, probamos refrescando por si acaso
            return await refreshGoogleToken().catch(() => accessToken);
        }
    };

    const handleGenerateBrackets = async () => {
        if (dirtyRows.size > 0) {
            setFetchError('Error: Tienes filas editadas o sin guardar. Sincroniza los cambios en la tabla antes de generar los cuadros.');
            return;
        }
        
        if (!selectedTournament || !startDate || !endDate) {
            alert('Por favor, selecciona un torneo y define las fechas.');
            return;
        }

        // NUEVO: Validación estricta de coherencia cronológica
        if (new Date(startDate) > new Date(endDate)) {
            alert('Error: La fecha de finalización no puede ser anterior a la fecha de inicio.');
            return;
        }

        // Activamos el spinner del botón y bloqueamos otras acciones
        setIsSyncing(true);
        setFetchError(null);

        try {
            // Enviamos el payload exacto que el backend espera
            await apiService.generateTournament(selectedTournament, {
                start_date: startDate,
                end_date: endDate,
                court_schedule: courtSchedule
            });

            setSyncToast('Proceso de generación iniciado en el servidor...');

            // Esperamos 1.5 segundos para que el usuario lea la confirmación visual
            setTimeout(() => {
                navigate('/cuadros');
            }, 1500);

        } catch (err: any) {
            console.error('Error al generar:', err);
            setFetchError(err.message || 'Error de red al enviar la petición de generación.');
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (typeof gapi !== 'undefined') {
            gapi.load('picker', { callback: () => console.log('Picker library loaded') });
        }
    }, []);

    useEffect(() => {
        const ac = new AbortController();
        let cancelled = false;

        const loadTournamentsFromSchemas = async () => {
            setIsTournamentsLoading(true);
            setFetchError(null);
            try {
                const list = await apiService.getSchemasTournaments(ac.signal);
                if (cancelled) return;

                const mapped: Tournament[] = list.map((t) => ({
                    id: t.id,
                    name: t.name,
                    google_form_id: ''
                }));
                setTournaments(mapped);

                if (mapped.length > 0) {
                    // VERIFICAMOS SI EL ID GUARDADO ES VÁLIDO EN LA BD
                    const savedId = localStorage.getItem('selectedTournamentId');
                    const exists = mapped.some(t => t.id === savedId);

                    if (exists && savedId) {
                        // Si existe en la BD, lo mantenemos
                        setSelectedTournament(savedId);
                        setTournamentId(savedId);
                    } else {
                        // Si no existe (ej. se borró), forzamos al primero
                        setSelectedTournament(mapped[0].id);
                        setTournamentId(mapped[0].id);
                    }
                } else {
                    setSelectedTournament(null);
                    setTournamentId('');
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                if (!cancelled) {
                    console.error('Schemas list load error:', err);
                    setFetchError(err.message || 'No se pudo cargar la lista de torneos.');
                    setTournaments([]);
                    setSelectedTournament(null);
                    setTournamentId('');
                }
            } finally {
                if (!cancelled) {
                    setIsTournamentsLoading(false);
                    setSchemasLoaded(true);
                }
            }
        };

        void loadTournamentsFromSchemas();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [setTournamentId]);

    useEffect(() => {
        setSelectedTournament(tournamentId || null);
    }, [tournamentId]);

    useEffect(() => {
        if (!syncToast) return;
        const timer = window.setTimeout(() => setSyncToast(null), 5000);
        return () => window.clearTimeout(timer);
    }, [syncToast]);

    useEffect(() => {
        if (!fetchError) return;
        const timer = window.setTimeout(() => setFetchError(null), 5000);
        return () => window.clearTimeout(timer);
    }, [fetchError]);

    useEffect(() => {
        if (!schemasLoaded) {
            return;
        }

        if (!selectedTournament) {
            setFormSchema({});
            setFullMapping({});
            setFormResponses([]);
            setSyncStatus({});
            setDirtyRows(new Set());
            setFetchError(null);
            setFormId(null);
            return;
        }

        const ac = new AbortController();
        let cancelled = false;

        const loadDashboard = async () => {
            setIsDashboardLoading(true);
            setFetchError(null);
            try {
                const dash = await apiService.getTournamentDashboard(selectedTournament, ac.signal);
                if (cancelled) return;

                const { fullMapping: fm, formSchema: fs } = mapDashboardSchemaToState(dash.schema);
                const rows = mapDashboardRegistrationsToRows(dash.responses, fm, selectedTournament);

                const categoryQId = Object.keys(fm).find(qId => {
                    const title = (fm[qId].title || '').toUpperCase();
                    return title.includes('CATEGOR') || title.includes('MODALIDAD');
                });

                if (categoryQId) {
                    rows.sort((a, b) => sortCategories(a.answers[categoryQId] || '', b.answers[categoryQId] || ''));
                }

                setFullMapping(fm);
                setFormSchema(fs);
                setFormResponses(rows);

                const nextStatus: Record<string, 'pending' | 'syncing' | 'success' | 'error'> = {};
                rows.forEach((row) => {
                    nextStatus[row.responseId] = 'success';
                });
                setSyncStatus(nextStatus);
                setDirtyRows(new Set());

                // 1. Limpiamos los estados base por si cambiamos de un torneo a otro
                setStartDate('');
                setEndDate('');
                setGlobalCourts(1);
                setCourtSchedule({});
                setManualOverrides({});
                setActiveDayTab('');

                // 2. NUEVO: Si el backend nos devuelve metadatos guardados, los restauramos
                if (dash.metadata) {
                    setIsServerProcessing(dash.metadata.status === 'processing');
                    if (dash.metadata.start_date) setStartDate(dash.metadata.start_date);
                    if (dash.metadata.end_date) setEndDate(dash.metadata.end_date);

                    if (dash.metadata.court_schedule && Object.keys(dash.metadata.court_schedule).length > 0) {
                        const loadedSchedule = dash.metadata.court_schedule;

                        // LÓGICA INTELIGENTE: Encontramos "la moda" (el número más repetido) 
                        // para establecerlo como "Pistas Base" visualmente.
                        const freq: Record<number, number> = {};
                        Object.values(loadedSchedule).forEach(day => {
                            Object.values(day).forEach(c => {
                                freq[c] = (freq[c] || 0) + 1;
                            });
                        });

                        let mode = 1;
                        let maxFreq = 0;
                        Object.entries(freq).forEach(([valStr, count]) => {
                            const val = parseInt(valStr);
                            if (count > maxFreq) {
                                maxFreq = count;
                                mode = val;
                            }
                        });

                        // Recreamos los Overrides (excepciones visuales azules) comparando con la moda
                        const loadedOverrides: Record<string, Record<string, boolean>> = {};
                        Object.keys(loadedSchedule).forEach(day => {
                            loadedOverrides[day] = {};
                            Object.keys(loadedSchedule[day]).forEach(hour => {
                                loadedOverrides[day][hour] = loadedSchedule[day][hour] !== mode;
                            });
                        });

                        // Seteamos los estados
                        setGlobalCourts(mode);
                        setCourtSchedule(loadedSchedule);
                        setManualOverrides(loadedOverrides);

                        // Activamos la primera pestaña disponible
                        const firstDay = Object.keys(loadedSchedule)[0];
                        if (firstDay) setActiveDayTab(firstDay);
                    }
                }

                const linkedFormId =
                    dash.google_form_id ??
                    tournamentsRef.current.find((t) => t.id === selectedTournament)?.google_form_id ??
                    null;
                if (linkedFormId) {
                    setFormId(linkedFormId);
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                if (!cancelled) {
                    console.error('Dashboard load error:', err);
                    setFetchError(err.message || 'No se pudo cargar el panel del torneo.');
                }
            } finally {
                if (!cancelled) setIsDashboardLoading(false);
            }
        };

        void loadDashboard();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [selectedTournament, schemasLoaded]);

    const loadAndPersistFormSchema = async (
        docId: string,
        fallbackTitle?: string,
        options: { updateLocalState?: boolean } = {}
    ) => {
        const { updateLocalState = true } = options;
        const validToken = await ensureValidToken();

        const schemaRes = await fetch(`https://forms.googleapis.com/v1/forms/${docId}`, {
            headers: { 'Authorization': `Bearer ${validToken}` }
        });
        if (!schemaRes.ok) throw new Error('Error al obtener el esquema del formulario.');

        const schemaData = await schemaRes.json();
        const mapping = generateSchemaMap(schemaData);

        if (updateLocalState) {
            setFullMapping(mapping);

            const tableSchema: Record<string, { title: string; order_index?: number; type?: any; options?: string[] }> = {};
            Object.keys(mapping).forEach(qId => {
                tableSchema[qId] = {
                    title: mapping[qId].title,
                    order_index: mapping[qId].order_index,
                    type: mapping[qId].type,
                    options: mapping[qId].options
                };
            });
            setFormSchema(tableSchema);
        }

        await apiService.saveSchema({
            form_id: docId,
            title: fallbackTitle || schemaData.info?.title || 'Formulario sin título',
            questions: Object.values(mapping).map(m => ({
                id: m.questionId,
                title: m.title,
                type: m.type,
                group: m.group,
                field: m.field,
                options: m.options,
                order_index: m.order_index
            }))
        });

        return mapping;
    };

    const buildEditedRaw = (response: any) => ({
        ...response.raw,
        answers: Object.keys(response.answers).reduce((acc: any, qId) => {
            acc[qId] = { textAnswers: { answers: [{ value: response.answers[qId] }] } };
            return acc;
        }, {})
    });

    /** Persiste respuestas normalizadas vía API bulk sin modificar la tabla (la UI se actualiza al cambiar el torneo). */
    const bulkSyncGoogleFormToBackend = async (
        docId: string,
        mapping: Record<string, QuestionMapping>,
        tournamentIdForNorm: string
    ): Promise<{ inserted: number; skipped: number }> => {
        const validToken = await ensureValidToken();

        const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${docId}/responses`, {
            headers: { 'Authorization': `Bearer ${validToken}` }
        });
        if (!responsesRes.ok) throw new Error('Error al obtener las respuestas del formulario.');

        const responsesData = await responsesRes.json();
        const processedResponses = responsesData.responses?.map((resp: any) => {
            const answers: Record<string, string> = {};
            Object.keys(resp.answers || {}).forEach(qId => {
                const answerObj = resp.answers[qId];
                answers[qId] = answerObj.textAnswers?.answers?.map((a: any) => a.value).join(', ') || '';
            });
            return {
                responseId: resp.responseId,
                answers: answers,
                raw: resp
            };
        }) || [];

        const normalizedData: Registration[] = processedResponses.map((r: any) =>
            normalizeResponse(buildEditedRaw(r), mapping, tournamentIdForNorm)
        );

        let inserted = 0;
        let skipped = 0;
        if (normalizedData.length > 0) {
            const bulkResult = await apiService.submitRegistrationsBulk(normalizedData);
            inserted = bulkResult.inserted;
            skipped = bulkResult.skipped;
        }

        return { inserted, skipped };
    };

    const submitOneRegistration = async (
        response: any,
        mapping: Record<string, QuestionMapping>,
        tournamentIdForNorm: string
    ) => {
        const editedRaw = buildEditedRaw(response);
        const normalized = normalizeResponse(editedRaw, mapping, tournamentIdForNorm);

        if (!normalized.category || normalized.category.trim() === '') {
            throw new Error('Falta la categoría. La inscripción no es válida.');
        }
        if (!normalized.players || normalized.players.length < 2) {
            throw new Error('Faltan jugadores. Se requieren al menos 2 jugadores.');
        }
        if (!normalized.players[0].name?.trim() || !normalized.players[0].lastName?.trim()) {
            throw new Error('Falta el nombre o apellido del Jugador 1.');
        }
        if (!normalized.players[1].name?.trim() || !normalized.players[1].lastName?.trim()) {
            throw new Error('Falta el nombre o apellido del Jugador 2.');
        }

        await apiService.submitRegistration(normalized);
    };

    const handleValueChange = (respId: string, qId: string, newValue: string) => {
        setFormResponses(prev => prev.map(r => {
            if (r.responseId === respId) {
                return {
                    ...r,
                    answers: { ...r.answers, [qId]: newValue }
                };
            }
            return r;
        }));

        setDirtyRows(prev => {
            const next = new Set(prev);
            next.add(respId);
            return next;
        });

        // Reset sync status if edited
        if (syncStatus[respId] === 'success' || syncStatus[respId] === 'error') {
            setSyncStatus(prev => ({ ...prev, [respId]: 'pending' }));
        }
    };

    const handleSyncResponse = async (response: any) => {
        const respId = response.responseId;
        setIsSyncing(true);
        setSyncStatus(prev => ({ ...prev, [respId]: 'syncing' }));

        try {
            await submitOneRegistration(response, fullMapping, tournamentId || 'unassigned');
            setSyncStatus(prev => ({ ...prev, [respId]: 'success' }));

            setDirtyRows(prev => {
                const next = new Set(prev);
                next.delete(respId);
                return next;
            });
        } catch (err: any) {
            console.error('Sync Error:', err);
            setSyncStatus(prev => ({ ...prev, [respId]: 'error' }));
            setFetchError(err.message || 'Error al guardar la inscripción.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteResponse = async (responseId: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

        try {
            await apiService.deleteRegistration(responseId);
            setFormResponses(prev => prev.filter(r => r.responseId !== responseId));
            setDirtyRows(prev => {
                const next = new Set(prev);
                next.delete(responseId);
                return next;
            });
            setSyncStatus(prev => {
                const next = { ...prev };
                delete next[responseId];
                return next;
            });
            setSyncToast('Registro eliminado exitosamente');
        } catch (err: any) {
            console.error('Delete Error:', err);
            setFetchError(err.message || 'No se pudo eliminar el registro.');
        }
    };

    const handleOpenPicker = async () => {
        if (typeof google === 'undefined' || typeof gapi === 'undefined' || !accessToken) {
            alert('La librería de Google no ha cargado todavía o no estás autenticado.');
            return;
        }

        setIsPickerLoading(true);

        let validToken = accessToken;
        try {
            validToken = await ensureValidToken();
        } catch (e) {
            alert('No se pudo validar tu sesión de Google.');
            setIsPickerLoading(false);
            return;
        }

        const pickerCallback = async (data: any) => {
            if (data.action !== google.picker.Action.PICKED) {
                setIsPickerLoading(false);
                return;
            }

            setIsSyncing(true);
            setFetchError(null);

            try {
                const doc = data.docs[0];
                const docId = doc.id as string;
                const name = (doc.name as string) || 'Formulario sin título';

                setFormId(docId);

                const mapping = await loadAndPersistFormSchema(docId, name, { updateLocalState: false });
                const { inserted, skipped } = await bulkSyncGoogleFormToBackend(docId, mapping, docId);
                setSyncToast(`Sincronización completada: ${inserted} nuevos, ${skipped} omitidos`);

                setTournaments((prev) => {
                    const alreadyExists = prev.some((t) => t.id === docId);
                    if (alreadyExists) return prev;
                    return [...prev, { id: docId, name, google_form_id: docId }];
                });
                setSelectedTournament(docId);
                setTournamentId(docId);
            } catch (err: any) {
                console.error('Picker Sync Error:', err);
                setFetchError(err.message || 'No se pudo vincular y sincronizar el formulario.');
            } finally {
                setIsSyncing(false);
                setIsPickerLoading(false);
            }
        };

        const view = new google.picker.DocsView(google.picker.ViewId.FORMS);
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(validToken)
            .setDeveloperKey((import.meta as any).env?.GOOGLE_API_KEY || '')
            .setCallback(pickerCallback)
            .build();

        picker.setVisible(true);
    };

    const handleTournamentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextTournament = event.target.value || null;
        setSelectedTournament(nextTournament);
        setTournamentId(nextTournament || '');
    };

    const handleSyncResponses = async () => {
        // 1. Bloqueo de ejecución si no hay torneo seleccionado en el desplegable
        if (!selectedTournament || isSyncing) return;

        // 2. Validación estricta de autenticación
        if (!accessToken) {
            setFetchError('No hay sesión activa para sincronizar con Google. Autentícate de nuevo.');
            return;
        }

        setIsSyncing(true);
        setFetchError(null);

        try {
            // 3. Uso directo de selectedTournament como ID del formulario para Google APIs
            const mapping = await loadAndPersistFormSchema(selectedTournament, undefined, { updateLocalState: false });

            // 4. Ingesta masiva utilizando el ID del desplegable tanto para origen como para destino
            const { inserted, skipped } = await bulkSyncGoogleFormToBackend(selectedTournament, mapping, selectedTournament);

            setSyncToast(`Sincronización completada: ${inserted} nuevos, ${skipped} omitidos`);
        } catch (err: any) {
            console.error('Sync responses error:', err);
            setFetchError(err.message || 'Error de red o permisos al intentar sincronizar las respuestas.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAddManualRow = () => {
        if (!selectedTournament) return;

        const tempId = `temp-${Date.now()}`;
        const emptyAnswers: Record<string, string> = {};

        const sortedQuestionIds = Object.keys(formSchema).sort((a, b) => {
            const orderA = formSchema[a].order_index ?? 0;
            const orderB = formSchema[b].order_index ?? 0;
            return orderA - orderB;
        });

        const lastThreeIds = sortedQuestionIds.slice(-3);

        Object.keys(formSchema).forEach((qId) => {
            let initialValue = "";

            // Si el ID está entre los 3 últimos, marcamos el valor de la opción por defecto
            if (lastThreeIds.includes(qId)) {
                const questionData = fullMapping[qId];
                // Intentamos sacar el valor real de las opciones (ej: "Autorizo el uso de datos")
                // Si no tiene opciones, ponemos "Sí" por defecto
                initialValue = questionData?.options?.[0] || "Sí";
            }

            emptyAnswers[qId] = initialValue;
        });

        const newRow = {
            responseId: tempId,
            answers: emptyAnswers,
            raw: { responseId: tempId, answers: {} }
        };

        setFormResponses(prev => [...prev, newRow]);

        setDirtyRows(prev => {
            const next = new Set(prev);
            next.add(tempId);
            return next;
        });

        setSyncStatus(prev => ({ ...prev, [tempId]: 'pending' }));

        // Ejecutar scroll suave interno asíncrono para dar tiempo al pintado de react
        setTimeout(() => {
            const addedRowElement = document.querySelector(`tr[data-response-id="${tempId}"]`);
            if (addedRowElement) {
                addedRowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };

    return (
        <div className="page-content">
            {syncToast && (
                <div
                    role="status"
                    className="panel-sync-toast"
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 2000,
                        maxWidth: 420,
                        padding: '14px 18px',
                        borderRadius: 10,
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid rgba(74, 222, 128, 0.45)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                        fontSize: '0.9rem',
                        lineHeight: 1.45,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10
                    }}
                >
                    <CheckCircle size={20} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{syncToast}</span>
                </div>
            )}

            {fetchError && (
                <div
                    role="alert"
                    className="panel-error-toast"
                    style={{
                        position: 'fixed',
                        bottom: syncToast ? 90 : 24,
                        right: 24,
                        zIndex: 2000,
                        maxWidth: 420,
                        padding: '14px 18px',
                        borderRadius: 10,
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                        fontSize: '0.9rem',
                        lineHeight: 1.45,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10
                    }}
                >
                    <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{fetchError}</span>
                </div>
            )}
            <div className="panel-hero-card">
                <h1 className="hero-title">Generación Automática de Cuadros</h1>
                <p className="hero-subtitle">
                    Transforma tus listas de deportistas en cuadros de torneo profesionales en segundos. Selecciona tu Formulario de Google para importar las respuestas de los jugadores.
                </p>

                <div className="hero-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '24px', flexWrap: 'wrap' }}>

                    {/* BLOQUE PRINCIPAL: Gestión del Torneo Activo (Solo el Select) */}
                    <div className="sheet-select-wrapper" style={{ margin: 0 }}>
                        <FileSpreadsheet className="sheet-icon" size={18} />
                        <select
                            className="sheet-select"
                            value={selectedTournament || ''}
                            onChange={handleTournamentChange}
                            disabled={isSyncing || isDashboardLoading || isTournamentsLoading}
                        >
                            <option value="">Seleccionar torneo</option>
                            {tournaments.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="chevron-icon" size={18} />
                    </div>

                    {/* BOTÓN SECUNDARIO: Acción Global (Importar) */}
                    <button
                        className="picker-wrapper picker-btn"
                        onClick={handleOpenPicker}
                        disabled={isPickerLoading || isSyncing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)', // Borde sólido pero sutil
                            background: 'rgba(255, 255, 255, 0.05)', // Relleno translúcido para darle cuerpo
                            cursor: (isPickerLoading || isSyncing) ? 'not-allowed' : 'pointer',
                            color: (isPickerLoading || isSyncing) ? '#64748b' : '#cbd5e1', // Texto legible pero no blanco puro
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            marginLeft: 'auto',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (isPickerLoading || isSyncing) return;
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            if (isPickerLoading || isSyncing) return;
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = '#cbd5e1';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                    >
                        {isPickerLoading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardList className="sheet-icon" size={18} />}
                        + Importar Nuevo Torneo
                    </button>
                </div>
            </div>



            {Object.keys(formSchema).length > 0 && (
                <div className="responses-section" style={{ marginTop: '2.5rem' }}>
                    <div
                        className="section-header"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            padding: '0 4px'
                        }}
                    >
                        <div className="responses-header-container">
                            <div className="responses-actions-group">
                                <h2 className="responses-title">
                                    Inscripciones al Torneo
                                </h2>
                                <div className="responses-buttons">
                                    {/* Botón de sincronización */}
                                    <button
                                        className="sync-btn-inline"
                                        disabled={!selectedTournament || isSyncing}
                                        onClick={handleSyncResponses}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: isSyncing ? 'rgba(148, 163, 184, 0.1)' : 'transparent',
                                            border: '1px solid rgba(148, 163, 184, 0.3)',
                                            color: '#64748b',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            cursor: selectedTournament && !isSyncing ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                        {isSyncing ? 'Sincronizando...' : 'Sincronizar de Google Forms'}
                                    </button>

                                    {/* Botón de añadir fila manualmente */}
                                    <button
                                        className="add-row-btn"
                                        disabled={!selectedTournament || isSyncing}
                                        onClick={handleAddManualRow}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            color: '#3b82f6',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            cursor: selectedTournament && !isSyncing ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Plus size={14} />
                                        Añadir Fila
                                    </button>
                                </div>
                            </div>

                            <span className="responses-count">
                                {formResponses.length} resultados encontrados
                            </span>
                        </div>
                    </div>
                    <ResponseTable
                        schema={formSchema}
                        responses={formResponses}
                        onValueChange={handleValueChange}
                        dirtyRows={dirtyRows}
                        renderActions={(resp) => {
                            const status = syncStatus[resp.responseId];
                            return (
                                <div className="row-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="action-btn-delete"
                                        onClick={() => handleDeleteResponse(resp.responseId)}
                                        title="Eliminar registro"
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn-sync"
                                        onClick={() => handleSyncResponse(resp)}
                                        disabled={status === 'syncing' || status === 'success'}
                                        style={{
                                            background: status === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                                            border: `1px solid ${status === 'success' ? '#4ade80' : '#60a5fa'}`,
                                            color: status === 'success' ? '#4ade80' : '#60a5fa',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            cursor: status === 'success' ? 'default' : 'pointer'
                                        }}
                                    >
                                        {status === 'syncing' ? <Loader2 className="animate-spin" size={16} /> :
                                            status === 'success' ? <CheckCircle size={16} /> :
                                                status === 'error' ? <XCircle size={16} /> : <CloudUpload size={16} />}
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>
            )}

            {/* SECCIÓN DE CONFIGURACIÓN Y GENERACIÓN */}
            {Object.keys(formSchema).length > 0 && (
                <div className="config-section">
                    <div className="config-header">
                        <h2>
                            <FolderTree size={20} />
                            Configuración de Cuadros
                        </h2>
                        <p>Define los parámetros logísticos antes de realizar la generación automática.</p>
                    </div>

                    <div className="config-controls">
                        {/* Rango de Fechas */}
                        <div className="config-group" style={{
                            padding: '16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <label className="config-label">Periodo del Torneo</label>
                            <div className="config-input-row">
                                <input
                                    type="date"
                                    className="config-input"
                                    value={startDate}
                                    max={endDate} // <-- NUEVO: Restringe el límite superior
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="config-separator">al</span>
                                <input
                                    type="date"
                                    className="config-input"
                                    value={endDate}
                                    min={startDate} // <-- YA EXISTÍA: Restringe el límite inferior
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Disponibilidad de Pistas */}
                        <div className="config-group" style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <label className="config-label">Cantidad de Pistas Disponibles</label>

                            {/* Fila 1 */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pistas Base:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        className="config-input"
                                        value={globalCourts}
                                        onChange={(e) => handleGlobalCourtsChange(parseInt(e.target.value) || 1)}
                                        style={{ width: '80px' }}
                                    />
                                </div>
                                <button
                                    onClick={handleApplyToAll}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        color: '#3b82f6',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Aplicar a todo
                                </button>
                            </div>

                            {/* Fila 2: Pestañas */}
                            {availabilityDays.length > 0 && (
                                <>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {availabilityDays.map(day => (
                                            <button
                                                key={day.title}
                                                onClick={() => setActiveDayTab(day.title)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: activeDayTab === day.title ? '#3b82f6' : '#f1f5f9',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: activeDayTab === day.title ? '#ffffff' : '#64748b',
                                                    fontWeight: activeDayTab === day.title ? 600 : 500,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {day.title}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Fila 3: Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px' }}>
                                        {(availabilityDays.find(d => d.title === activeDayTab)?.options || []).map(hour => {
                                            const isException = courtSchedule[activeDayTab]?.[hour] !== globalCourts;
                                            return (
                                                <div key={hour} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>{hour}</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={courtSchedule[activeDayTab]?.[hour] ?? globalCourts}
                                                        onChange={(e) => handleHourChange(activeDayTab, hour, parseInt(e.target.value) || 0)}
                                                        style={{
                                                            padding: '10px',
                                                            borderRadius: '8px',
                                                            border: isException ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                                            background: isException ? '#eff6ff' : '#ffffff',
                                                            width: '100%',
                                                            outline: 'none',
                                                            transition: 'all 0.2s',
                                                            color: isException ? '#1e40af' : '#1e293b',
                                                            fontWeight: isException ? 600 : 400,
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                            {availabilityDays.length === 0 && (
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '8px' }}>No se encontraron horarios en el esquema para configurar por hora.</p>
                            )}
                        </div>

                        {/* NUEVO: Resumen de Validación Matemática */}
                        {Object.keys(categoryStats.counts).length > 0 && (
                            <div className="config-group" style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '16px',
                                backgroundColor: categoryStats.invalidCategories.length > 0 ? '#fef2f2' : '#f8fafc',
                                borderRadius: '8px',
                                border: `1px solid ${categoryStats.invalidCategories.length > 0 ? '#fca5a5' : '#e2e8f0'}`
                            }}>
                                <label className="config-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: categoryStats.invalidCategories.length > 0 ? '#ef4444' : 'var(--text-dark)' }}>
                                    {categoryStats.invalidCategories.length > 0 && <AlertTriangle size={16} />}
                                    Resumen de Inscripciones (Múltiplos de 3 o 4)
                                </label>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                                    {Object.entries(categoryStats.counts).sort((a, b) => sortCategories(a[0], b[0])).map(([cat, count]) => {
                                        const isValid = count % 3 === 0 || count % 4 === 0;
                                        return (
                                            <div key={cat} style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                backgroundColor: isValid ? '#dcfce7' : '#fee2e2',
                                                color: isValid ? '#166534' : '#991b1b',
                                                border: `1px solid ${isValid ? '#bbf7d0' : '#fecaca'}`,
                                                transition: 'all 0.2s'
                                            }}>
                                                <span>{cat}:</span>
                                                <span>{count} parejas</span>
                                                {!isValid && <span title="Inválido: Añade o elimina parejas">⚠️</span>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {categoryStats.invalidCategories.length > 0 && (
                                    <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircle size={14} />
                                        Existen categorías matemáticamente inviables. Modifica las inscripciones en la tabla superior antes de continuar.
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            className="action-generate-btn"
                            onClick={handleGenerateBrackets}
                            disabled={isSyncing || isServerProcessing || !startDate || !endDate || categoryStats.invalidCategories.length > 0}
                            style={{
                                marginTop: '8px',
                                opacity: (categoryStats.invalidCategories.length > 0 || isServerProcessing) ? 0.5 : 1,
                                cursor: isServerProcessing ? 'wait' : 'pointer'
                            }}
                        >
                            {isSyncing || isServerProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    GENERANDO...
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet size={18} />
                                    GENERAR CUADROS
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
