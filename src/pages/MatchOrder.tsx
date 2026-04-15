import { useState, useEffect } from 'react';
import { MapPin, Download } from 'lucide-react';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { TOURNAMENTS, TOURNAMENTS_DATA } from '../data/mockData';
import './MatchOrder.css';

export default function MatchOrder() {
    const { tournamentId, setTournamentId } = useTournament();
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Function to extract and sort matches from tournament data
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            const tournament = TOURNAMENTS_DATA.find(t => t.id === tournamentId);
            if (!tournament) {
                setMatches([]);
                setIsLoading(false);
                return;
            }

            const allMatches: any[] = [];
            
            const getTeamName = (id: string) => tournament.teams.find(t => t.id === id)?.name || id;
            const getCategoryName = (id: string) => tournament.categories.find(c => c.id === id)?.name || "Categoría";

            // Extract from each category's cuadros
            Object.entries(tournament.cuadros).forEach(([catId, categoryData]: [string, any]) => {
                const catName = getCategoryName(catId);

                // Groups
                categoryData.groups.forEach((group: any) => {
                    group.matches.forEach((m: any) => {
                        allMatches.push({
                            id: m.id,
                            cat: `${catName} - ${group.name}`,
                            t1: getTeamName(m.homeId),
                            t2: getTeamName(m.awayId),
                            date: m.date,
                            loc: m.court || 'Pista TBD',
                            color: group.name.includes('A') ? '#3b82f6' : '#10b981'
                        });
                    });
                });

                // Brackets (semis)
                categoryData.brackets.semis.forEach((m: any) => {
                    allMatches.push({
                        id: m.id,
                        cat: `${catName} - SEMIFINAL`,
                        t1: getTeamName(m.homeId),
                        t2: getTeamName(m.awayId),
                        date: m.date,
                        loc: 'Pista Central',
                        color: '#f59e0b'
                    });
                });

                // Brackets (final)
                categoryData.brackets.final.forEach((m: any) => {
                    allMatches.push({
                        id: m.id,
                        cat: `${catName} - FINAL`,
                        t1: getTeamName(m.homeId),
                        t2: getTeamName(m.awayId),
                        date: m.date,
                        loc: 'Pista Central',
                        color: '#ef4444'
                    });
                });
            });

            // Sorting logic (Ascending)
            const sortedMatches = allMatches.sort((a, b) => {
                const parseDate = (dStr: string) => {
                    if (!dStr) return 0;
                    try {
                        if (dStr.includes('T')) return new Date(dStr).getTime();
                        // Fallback for old format
                        const [datePart, timePart] = dStr.split(' - ');
                        const [day, month] = datePart.split('/').map(Number);
                        const [hour, min] = timePart.split(':').map(Number);
                        return new Date(2024, month - 1, day, hour, min).getTime();
                    } catch (e) {
                        return 0;
                    }
                };
                return parseDate(a.date) - parseDate(b.date);
            });

            setMatches(sortedMatches);
            setIsLoading(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [tournamentId]);

    const formatMatchDate = (dStr: string) => {
        if (!dStr || !dStr.includes('T')) return { date: dStr || 'TBD', time: '' };
        try {
            const date = new Date(dStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return { date: `${day}/${month}`, time: `${hours}:${minutes}` };
        } catch (e) {
            return { date: dStr, time: '' };
        }
    };

    return (
        <div className="page-content match-order-page">
            <TournamentSelector
                tournaments={TOURNAMENTS}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="LOGÍSTICA Y TIEMPOS"
                title="Orden de Juego"
                subtitle="Consulta la programación de pistas, horarios y el estado actual de los enfrentamientos en tiempo real."
            >
                <button className="btn-secondary">
                    PDF
                    <Download size={16} />
                </button>
            </TournamentSelector>

            <div className="matches-list">
                {isLoading ? (
                    <div className="loading-state">Cargando partidos...</div>
                ) : matches.length === 0 ? (
                    <div className="loading-state">No hay partidos programados.</div>
                ) : (
                    matches.map(match => {
                        const { date: displayDate, time: displayTime } = formatMatchDate(match.date);
                        return (
                            <div key={match.id} className="match-card">
                                <div className="mc-left-bar" style={{ backgroundColor: match.color }}></div>
                                <div className="mc-content">
                                    <div className="mc-main">
                                        <span className="mc-category">{match.cat}</span>
                                        <div className="mc-teams">
                                            <span className="mc-team">{match.t1}</span>
                                            <span className="mc-vs">VS</span>
                                            <span className="mc-team">{match.t2}</span>
                                        </div>
                                        <div className="mc-location">
                                            <MapPin size={14} className="mc-loc-icon" />
                                            <span>{match.loc}</span>
                                        </div>
                                    </div>
                                    <div className="mc-datetime">
                                        <span className="mc-date">{displayDate}</span>
                                        <span className="mc-time">{displayTime}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
