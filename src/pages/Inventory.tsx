import { useState, useEffect } from 'react';
import { Download, MoreVertical } from 'lucide-react';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { TOURNAMENTS, TOURNAMENTS_DATA } from '../data/mockData';
import './Inventory.css';

// SVG Icon representing a "hanger" as requested
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
    const [tournament, setTournament] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            const t = TOURNAMENTS_DATA.find(t => t.id === tournamentId) || TOURNAMENTS_DATA[0];
            setTournament(t);
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [tournamentId]);

    if (!tournament && isLoading) return <div className="loading-state">Cargando inventario...</div>;
    if (!tournament) return null;

    // Derive summary from teams (formerly assignments)
    const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const sizeCounts: Record<string, number> = {};
    availableSizes.forEach(s => sizeCounts[s] = 0);

    tournament.teams.forEach((team: any) => {
        if (team.size1) sizeCounts[team.size1]++;
        if (team.size2) sizeCounts[team.size2]++;
    });

    const maxCount = Math.max(...Object.values(sizeCounts));
    const mostRequested = availableSizes.find(s => sizeCounts[s] === maxCount && maxCount > 0);

    const calculatedSummary = availableSizes.map(size => ({
        size,
        count: sizeCounts[size],
        active: size === mostRequested
    }));

    // Helper to get category name
    const getCategoryName = (catId: string) => {
        return tournament.categories.find((c: any) => c.id === catId)?.name || 'Sin Categoría';
    };

    return (
        <div className="page-content">
            <TournamentSelector
                tournaments={TOURNAMENTS}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="GESTIÓN DE TORNEO"
                title="Inventario del Torneo"
                subtitle="Gestiona el stock de equipación, tallas y asignaciones para todos los participantes del evento."
            >
                <button className="btn-secondary">
                    PDF
                    <Download size={16} />
                </button>
            </TournamentSelector>

            {isLoading ? (
                <div className="loading-state">Actualizando inventario...</div>
            ) : (
                <>
                    <div className="inventory-section">
                        <h3 className="section-title">
                            <span className="title-marker"></span>
                            RESUMEN DE TALLAS
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
                            <button className="filter-btn">Filtrar por Talla</button>
                        </div>

                        <div className="assignments-list">
                            {tournament.teams.map((team: any) => (
                                <div key={team.id} className="assignment-row">
                                    <div className="ar-left">
                                        <span className="ar-pair">{team.name}</span>
                                        <span className="ar-cat">Categoría: {getCategoryName(team.categoryId)}</span>
                                    </div>
                                    <div className="ar-right">
                                        <div className="ar-size-badge">
                                            <HangerIcon />
                                            Talla {team.size1} y {team.size2}
                                        </div>
                                        <button className="more-btn-clean">
                                            <MoreVertical size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
