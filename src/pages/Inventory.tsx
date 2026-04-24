import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { apiService } from '../services/apiService';
import './Inventory.css';

// SVG Icon representing a "hanger"
const HangerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hanger-icon">
        <path d="m8.36 10-.84 1.4A4 4 0 1 0 14 14.53V10"></path>
        <path d="M14 6.53a2.47 2.47 0 0 1-2.47-2.47V4"></path>
        <path d="M3 20h18"></path>
        <path d="m14 10-6.1-5.1A2 2 0 0 0 4.6 5.5l-1.42 1.4"></path>
    </svg>
);

export default function Inventory() {
    const { tournamentId, setTournamentId } = useTournament();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);

    const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
    const [isInventoryLoading, setIsInventoryLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!fetchError) return;
        const timer = window.setTimeout(() => setFetchError(null), 5000);
        return () => window.clearTimeout(timer);
    }, [fetchError]);

    // 1. Cargar la lista de torneos (Esquemas vinculados)
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
                if (err?.name === 'AbortError') return;
                if (!cancelled) setFetchError('No se pudo cargar la lista de torneos.');
            } finally {
                if (!cancelled) setIsTournamentsLoading(false);
            }
        };

        void loadTournaments();
        return () => { cancelled = true; ac.abort(); };
    }, [setTournamentId]);

    // 2. Cargar las inscripciones del torneo seleccionado
    useEffect(() => {
        if (!tournamentId) {
            setRegistrations([]);
            return;
        }

        const ac = new AbortController();
        let cancelled = false;

        const loadInventory = async () => {
            setIsInventoryLoading(true);
            setFetchError(null);
            try {
                // Llamada al servicio
                const dash = await apiService.getTournamentDashboard(tournamentId, ac.signal);
                if (cancelled) return;

                // CORRECCIÓN: Acceso directo a 'responses' según tu interfaz
                // Antes tenías: setRegistrations(dash.data?.responses || []);
                setRegistrations(dash.responses || []);

            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                if (!cancelled) setFetchError('Error al cargar los datos del inventario.');
                setRegistrations([]);
            } finally {
                if (!cancelled) setIsInventoryLoading(false);
            }
        };

        void loadInventory();
        return () => { cancelled = true; ac.abort(); };
    }, [tournamentId]);

    // 3. Lógica de cálculo de stock dinámico
    // Ajustado para coincidir con las opciones de tu base de datos: XS, S, M, L, XL, XXL
    const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const sizeCounts: Record<string, number> = {};
    availableSizes.forEach(s => sizeCounts[s] = 0);

    registrations.forEach((reg: any) => {
        if (Array.isArray(reg.players)) {
            reg.players.forEach((p: any) => {
                const size = p.shirtSize?.toUpperCase();
                // Verificamos que la talla exista en nuestro array para evitar contar errores de tipografía
                if (size && sizeCounts[size] !== undefined) {
                    sizeCounts[size]++;
                }
            });
        }
    });

    const maxCount = Math.max(...Object.values(sizeCounts), 0);
    const mostRequested = maxCount > 0 ? availableSizes.find(s => sizeCounts[s] === maxCount) : null;

    const calculatedSummary = availableSizes.map(size => ({
        size,
        count: sizeCounts[size],
        active: size === mostRequested
    }));

    return (
        <div className="page-content">
            <TournamentSelector
                tournaments={tournaments}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="GESTIÓN DE TORNEO"
                title="Inventario del Torneo"
                subtitle="Gestiona el stock de equipación, tallas y asignaciones para todos los participantes del evento."
            >
            </TournamentSelector>

            {fetchError && (
                <div
                    role="alert"
                    className="inventory-error-toast"
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

            {/* 1. ESTADO DE CARGA */}
            {isTournamentsLoading || isInventoryLoading ? (
                <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '3rem', color: '#64748b' }}>
                    <Loader2 className="animate-spin" size={32} />
                    <span>Calculando inventario desde la base de datos...</span>
                </div>
            ) :

                /* 2. ESTADO VACÍO (SIN DATOS) */
                registrations.length === 0 ? (
                    <div className="empty-state" style={{
                        marginTop: '2rem',
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        color: '#64748b',
                        background: 'var(--bg-white)',
                        border: '1px dashed var(--border)',
                        borderRadius: '12px',
                        fontWeight: 500
                    }}>
                        No hay inscripciones registradas para este torneo.
                    </div>
                ) :

                    /* 4. ESTADO DE ÉXITO CON DATOS (Pinta el inventario real) */
                    (
                        <>
                            <div className="inventory-section">
                                <h3 className="section-title">
                                    <span className="title-marker"></span>
                                    RESUMEN DE TALLAS ({registrations.length * 2} CAMISETAS TOTALES)
                                </h3>

                                <div className="size-summary-grid">
                                    {calculatedSummary.map(item => (
                                        <div key={item.size} className={`size-card ${item.active ? 'active' : ''}`}>
                                            <span className="sc-label">TALLA {item.size}</span>
                                            <span className="sc-count">{item.count}</span>
                                            <span className="sc-desc">{item.active ? 'MÁS SOLICITADA' : 'UNIDADES'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="inventory-section">
                                <div className="section-header-flex">
                                    <h3 className="section-title">
                                        <span className="title-marker"></span>
                                        ASIGNACIÓN POR PAREJA
                                    </h3>
                                </div>

                                <div className="assignments-list">
                                    {registrations.map((reg: any) => {
                                        const p1 = reg.players?.[0] || {};
                                        const p2 = reg.players?.[1] || {};

                                        const name1 = `${p1.name || ''} ${p1.lastName || ''}`.trim();
                                        const name2 = `${p2.name || ''} ${p2.lastName || ''}`.trim();
                                        const pairName = name2 ? `${name1} - ${name2}` : name1 || 'Sin Jugadores';

                                        return (
                                            <div key={reg.id} className="assignment-row">
                                                <div className="ar-left">
                                                    <span className="ar-pair">{pairName}</span>
                                                    <span className="ar-cat">Categoría: {reg.category || 'Sin asignar'}</span>
                                                </div>
                                                <div className="ar-right">
                                                    <div className="ar-size-badge">
                                                        <HangerIcon />
                                                        Talla {p1.shirtSize || '?'} y {p2.shirtSize || '?'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
        </div>
    );
}