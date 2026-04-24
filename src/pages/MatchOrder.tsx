import { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { apiService } from '../services/apiService';
import './MatchOrder.css';

// Diccionario para traducir el índice del día
const DAYS_ES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

// Función para determinar el bloque (MAÑANA o TARDE)
const getMatchGroupTitle = (dStr: string | null) => {
    if (!dStr) return 'SIN ASIGNAR';
    try {
        const d = new Date(dStr);
        const dayName = DAYS_ES[d.getDay()];
        const dayNum = d.getDate();
        const hour = d.getHours();

        // El formulario marca inicio de TARDE a las 15:00 o 16:00
        const block = hour < 15 ? 'MAÑANA' : 'TARDE';
        return `${dayName} ${dayNum} ${block}`;
    } catch (e) {
        return 'FECHA INVÁLIDA';
    }
};

// --- NUEVA LÓGICA DE COLORES POR CATEGORÍA ---
const CATEGORY_COLORS = [
    '#3b82f6', // Azul (Blue)
    '#10b981', // Esmeralda (Emerald)
    '#8b5cf6', // Violeta (Violet)
    '#f59e0b', // Ámbar (Amber)
    '#f43f5e', // Rosa (Rose)
    '#06b6d4', // Cian (Cyan)
    '#ec4899', // Rosa claro (Pink)
    '#f97316', // Naranja (Orange)
    '#14b8a6', // Verde azulado (Teal)
    '#6366f1'  // Índigo (Indigo)
];

const getCategoryColor = (categoryName: string) => {
    if (!categoryName) return '#94a3b8'; // Gris por defecto si no hay categoría
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Usamos el valor absoluto del hash para evitar índices negativos
    const index = Math.abs(hash) % CATEGORY_COLORS.length;
    return CATEGORY_COLORS[index];
};

export default function MatchOrder() {
    const { tournamentId, setTournamentId } = useTournament();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!fetchError) return;
        const timer = window.setTimeout(() => setFetchError(null), 5000);
        return () => window.clearTimeout(timer);
    }, [fetchError]);

    // 1. Cargar lista de torneos disponibles
    useEffect(() => {
        const ac = new AbortController();
        let cancelled = false;

        const loadTournaments = async () => {
            setIsTournamentsLoading(true);
            try {
                const list = await apiService.getSchemasTournaments(ac.signal);
                if (cancelled) return;

                setTournaments(list);
                if (list.length > 0) {
                    const savedId = localStorage.getItem('selectedTournamentId');
                    const exists = list.some((t: any) => t.id === savedId);
                    // Si el ID guardado no existe en los torneos reales, forzamos el primero
                    if (!exists || !savedId) {
                        setTournamentId(list[0].id);
                    }
                }
            } catch (err: any) {
                if (!cancelled) setFetchError('No se pudo cargar la lista de torneos.');
            } finally {
                if (!cancelled) setIsTournamentsLoading(false);
            }
        };

        void loadTournaments();
        return () => { cancelled = true; ac.abort(); };
    }, [setTournamentId]);

    // 2. Cargar partidos del torneo seleccionado
    useEffect(() => {
        if (!tournamentId) {
            setMatches([]);
            return;
        }

        const ac = new AbortController();
        let cancelled = false;

        const fetchMatches = async () => {
            setIsLoading(true);
            setIsGenerating(false);
            setFetchError(null);
            try {
                const response = await apiService.getTournamentMatches(tournamentId, ac.signal);
                if (cancelled) return;

                // INTERCEPTAMOS EL ESTADO PROCESSING
                if (response.status === 'processing') {
                    setIsGenerating(true);
                    setMatches([]);
                    return;
                }

                const data = response.data;

                // Formateo de los datos provenientes de la BD para el componente visual
                const formattedMatches = data
                    .filter((m: any) => m.scheduled_at) // <-- FILTRO: Solo partidos con fecha
                    .map((m: any) => {
                        // Formateo visual de la pista
                        let courtDisplay = "Pista TBD";
                        if (m.court && m.court !== "TBD") {
                            if (/^\d+$/.test(m.court)) courtDisplay = `Pista ${m.court}`;
                            else if (!m.court.toLowerCase().includes('pista')) courtDisplay = `Pista ${m.court}`;
                            else courtDisplay = m.court;
                        }

                        // Formateo de la etiqueta de categoría/ronda
                        const catLabel = m.is_bracket
                            ? `${m.category} - ${m.bracket_round}`
                            : `${m.category} - Grupo ${m.group_number}`;

                        return {
                            id: m.id,
                            cat: catLabel,
                            t1: m.team1,
                            t2: m.team2,
                            date: m.scheduled_at,
                            loc: courtDisplay,
                            color: getCategoryColor(m.category)
                        };
                    });

                setMatches(formattedMatches);
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                if (!cancelled) setFetchError('Error al cargar el orden de juego.');
                setMatches([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void fetchMatches();
        return () => { cancelled = true; ac.abort(); };
    }, [tournamentId]);

    // 3. Formateo de fecha nativo
    const formatMatchDate = (dStr: string | null) => {
        if (!dStr) return { date: '❌ Sin horario', time: 'No asignado' };
        try {
            const date = new Date(dStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return { date: `${day}/${month}`, time: `${hours}:${minutes}` };
        } catch (e) {
            return { date: 'Error', time: '' };
        }
    };

    return (
        <div className="page-content match-order-page">
            <TournamentSelector
                tournaments={tournaments}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="LOGÍSTICA Y TIEMPOS"
                title="Orden de Juego"
                subtitle="Consulta la programación de pistas, horarios y el estado actual de los enfrentamientos en tiempo real."
            >
            </TournamentSelector>

            {fetchError && (
                <div
                    role="alert"
                    className="matchorder-error-toast"
                    style={{
                        position: 'fixed',
                        bottom: 24, // Aquí no hay syncToast que pisar
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

            <div className="matches-list">
                {isTournamentsLoading || isLoading ? (
                    <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '3rem', color: '#64748b' }}>
                        <Loader2 className="animate-spin" size={32} />
                        <span>Cargando calendario de partidos...</span>
                    </div>
                ) : isGenerating ? (
                    /* ESTADO DE GENERACIÓN ACTIVA */
                    <div className="generating-state" style={{ textAlign: 'center', marginTop: '3rem', color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <RefreshCw className="animate-spin" size={48} style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Generando Cuadros...</h3>
                        <p style={{ color: '#64748b', marginTop: '8px' }}>El motor está calculando los mejores horarios. Vuelve a recargar en unos segundos.</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="loading-state" style={{ marginTop: '3rem', color: '#64748b' }}>
                        No hay partidos programados. Genera los cuadros primero.
                    </div>
                ) : (
                    // 1. ORDENAMOS ESTRICTAMENTE POR FECHA (Ignorando la fase del torneo)
                    (() => {
                        const sortedMatches = [...matches].sort((a, b) => {
                            if (!a.date) return 1; // Manda los no asignados al final
                            if (!b.date) return -1;
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });

                        // 2. AGRUPAMOS POR BLOQUE
                        const groupedData: { title: string, matches: any[] }[] = [];
                        sortedMatches.forEach(match => {
                            const title = getMatchGroupTitle(match.date);
                            let group = groupedData.find(g => g.title === title);
                            if (!group) {
                                group = { title, matches: [] };
                                groupedData.push(group);
                            }
                            group.matches.push(match);
                        });

                        // 3. RENDERIZAMOS LOS GRUPOS
                        return (
                            <div className="grouped-matches-container">
                                {groupedData.map((group) => (
                                    <div key={group.title} className="match-block" style={{ marginBottom: '32px' }}>

                                        {/* TÍTULO DEL BLOQUE */}
                                        <h3 style={{
                                            fontSize: '0.95rem',
                                            fontWeight: 800,
                                            color: '#475569',
                                            paddingBottom: '8px',
                                            marginBottom: '16px',
                                            borderBottom: '2px solid #e2e8f0',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {group.title}
                                        </h3>

                                        {/* TARJETAS DEL BLOQUE */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {group.matches.map(match => {
                                                const { date: displayDate, time: displayTime } = formatMatchDate(match.date);
                                                const isUnassigned = !match.date;

                                                return (
                                                    <div key={match.id} className="match-card" style={{ opacity: isUnassigned ? 0.7 : 1 }}>
                                                        <div className="mc-left-bar" style={{ backgroundColor: isUnassigned ? '#ef4444' : match.color }}></div>
                                                        <div className="mc-content">
                                                            <div className="mc-main">
                                                                <span className="mc-category">{match.cat}</span>
                                                                <div className="mc-teams">
                                                                    <span className="mc-team">{match.t1}</span>
                                                                    <span className="mc-vs">VS</span>
                                                                    <span className="mc-team">{match.t2}</span>
                                                                </div>
                                                                <div className="mc-location" style={{ color: isUnassigned ? '#ef4444' : undefined }}>
                                                                    <MapPin size={14} className="mc-loc-icon" />
                                                                    <span>{isUnassigned ? 'No asignado' : match.loc}</span>
                                                                </div>
                                                            </div>
                                                            <div className="mc-datetime">
                                                                <span className="mc-date" style={{ color: isUnassigned ? '#ef4444' : undefined }}>{displayDate}</span>
                                                                <span className="mc-time">{displayTime}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
}