import { FileSpreadsheet, ChevronDown, FolderTree, MoreVertical, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';
import { TOURNAMENTS } from '../data/mockData';
import './Panel.css';

export default function Panel() {
    const navigate = useNavigate();
    const { tournamentId, setTournamentId } = useTournament();

    const handleTournamentClick = (id: string) => {
        setTournamentId(id);
        navigate('/cuadros');
    };

    return (
        <div className="page-content">
            <div className="panel-hero-card">
                <h1 className="hero-title">Generación Automática de Cuadros</h1>
                <p className="hero-subtitle">
                    Transforma tus listas de deportistas en cuadros de torneo profesionales en segundos. Sincroniza tus Google Sheets para comenzar la orquestación.
                </p>

                <div className="hero-actions">
                    <div className="sheet-select-wrapper">
                        <FileSpreadsheet className="sheet-icon" size={18} />
                        <select 
                            className="sheet-select" 
                            value={tournamentId}
                            onChange={(e) => setTournamentId(e.target.value)}
                        >
                            <option value="">Seleccionar Hoja de Torneo</option>
                            {TOURNAMENTS.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="chevron-icon" size={18} />
                    </div>
                    <button 
                        className="generate-btn" 
                        disabled={!tournamentId}
                        onClick={() => handleTournamentClick(tournamentId)}
                    >
                        <FolderTree size={18} />
                        GENERAR CUADROS
                    </button>
                </div>
            </div>

            <div className="panel-section">
                <div className="section-header">
                    <h2>Historial de Torneos</h2>
                    <button className="view-all-btn">
                        VER TODO <ArrowRight size={16} />
                    </button>
                </div>

                <div className="tournament-list">
                    {TOURNAMENTS.map((t) => (
                        <div
                            key={t.id}
                            className="tournament-card"
                            onClick={() => handleTournamentClick(t.id)}
                        >
                            <div className="t-card-left">
                                <div className="t-icon-wrapper">
                                    <FolderTree size={20} className="t-icon" />
                                </div>
                                <div className="t-info">
                                    <h3>{t.name}</h3>
                                    <span>{t.teams} EQUIPOS</span>
                                </div>
                            </div>
                            <div className="t-card-right">
                                <div className="t-status">
                                    <span className="status-dot"></span>
                                    {t.status}
                                </div>
                                <button className="more-btn" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
