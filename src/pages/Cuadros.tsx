import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, UploadCloud, ChevronDown, Trophy, Calendar, MapPin } from 'lucide-react';
import ResultModal from '../components/ResultModal';
import ScheduleModal from '../components/ScheduleModal';
import CourtModal from '../components/CourtModal';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { TOURNAMENTS, TOURNAMENTS_DATA } from '../data/mockData';
import './Cuadros.css';

export default function Cuadros() {
    const location = useLocation();
    const { tournamentId, setTournamentId } = useTournament();
    const [tournament, setTournament] = useState<any>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string>("");
    const [activeModal, setActiveModal] = useState<'none' | 'schedule' | 'result' | 'court'>('none');
    const [selectedMatch, setSelectedMatch] = useState<{ matchId: string, t1Id: string, t2Id: string, team1: string, team2: string, result: string, date: string, court: string, categoryId: string, groupId?: number } | null>(null);

    useEffect(() => {
        const t = TOURNAMENTS_DATA.find(t => t.id === tournamentId) || TOURNAMENTS_DATA[0];
        setTournament(t);
        const firstCatId = Object.keys(t.cuadros)[0];
        setActiveCategoryId(firstCatId);
    }, [tournamentId]);

    useEffect(() => {
        const navId = location.state?.tournamentId;
        if (navId && navId !== tournamentId) {
            setTournamentId(navId);
        }
    }, [location.state, tournamentId, setTournamentId]);

    if (!tournament || !activeCategoryId) return <div className="page-content">Cargando cuadros...</div>;

    const activeCuadros = tournament.cuadros[activeCategoryId];
    const resolveTeamName = (id: string) => tournament.teams.find((t: any) => t.id === id)?.name || id;
    const resolveCategoryName = (id: string) => tournament.categories.find((c: any) => c.id === id)?.name || "Categoría";

    const formatDateTime = (isoStr: string) => {
        if (!isoStr || !isoStr.includes('T')) return isoStr || "TBD";
        try {
            const date = new Date(isoStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}/${month} - ${hours}:${minutes}`;
        } catch (e) {
            return isoStr;
        }
    };

    const handleMatchClick = (mode: 'schedule' | 'result' | 'court', t1Id: string, t2Id: string, matchId: string, result: string, date: string, court: string, groupId?: number) => {
        setSelectedMatch({
            matchId,
            t1Id,
            t2Id,
            team1: resolveTeamName(t1Id),
            team2: resolveTeamName(t2Id),
            result: result || "",
            date: date || "",
            court: court || "",
            categoryId: activeCategoryId,
            groupId
        });
        setActiveModal(mode);
    };

    const handleSaveSchedule = (newSchedule: string) => {
        if (!selectedMatch) return;
        
        const newTournament = { 
            ...tournament,
            cuadros: { ...tournament.cuadros }
        };
        const categoryCuadros = { ...newTournament.cuadros[selectedMatch.categoryId] };
        newTournament.cuadros[selectedMatch.categoryId] = categoryCuadros;

        if (selectedMatch.groupId !== undefined) {
             const groups = [...categoryCuadros.groups];
             categoryCuadros.groups = groups;
             const group = { ...groups[selectedMatch.groupId] };
             groups[selectedMatch.groupId] = group;
             
             const matches = [...group.matches];
             group.matches = matches;
             
             let match = matches.find((m: any) => m.id === selectedMatch.matchId);
             if (match) {
                 const updatedMatch = { ...match, date: newSchedule };
                 const idx = matches.indexOf(match);
                 matches[idx] = updatedMatch;
             } else {
                 matches.push({
                     id: selectedMatch.matchId,
                     homeId: selectedMatch.t1Id,
                     awayId: selectedMatch.t2Id,
                     date: newSchedule,
                     result: "",
                     court: "Pista TBD"
                 });
             }
        } else {
             const brackets = { ...categoryCuadros.brackets };
             categoryCuadros.brackets = brackets;

             const semiMatch = brackets.semis.find((m: any) => m.id === selectedMatch.matchId);
             if (semiMatch) {
                 const semis = [...brackets.semis];
                 brackets.semis = semis;
                 const idx = semis.indexOf(semiMatch);
                 semis[idx] = { ...semiMatch, date: newSchedule };
             } else {
                 const finalMatch = brackets.final.find((m: any) => m.id === selectedMatch.matchId);
                 if (finalMatch) {
                     const final = [...brackets.final];
                     brackets.final = final;
                     const idx = final.indexOf(finalMatch);
                     final[idx] = { ...finalMatch, date: newSchedule };
                 }
             }
        }
        setTournament(newTournament);
        setActiveModal('none');
    };

    const handleSaveResult = (newResult: string) => {
        if (!selectedMatch) return;
        
        const newTournament = { 
            ...tournament,
            cuadros: { ...tournament.cuadros }
        };
        const categoryCuadros = { ...newTournament.cuadros[selectedMatch.categoryId] };
        newTournament.cuadros[selectedMatch.categoryId] = categoryCuadros;

        if (selectedMatch.groupId !== undefined) {
             const groups = [...categoryCuadros.groups];
             categoryCuadros.groups = groups;
             const group = { ...groups[selectedMatch.groupId] };
             groups[selectedMatch.groupId] = group;
             
             const matches = [...group.matches];
             group.matches = matches;

             let match = matches.find((m: any) => m.id === selectedMatch.matchId);
             if (match) {
                 const updatedMatch = { ...match, result: newResult };
                 const idx = matches.indexOf(match);
                 matches[idx] = updatedMatch;
             } else {
                 matches.push({
                     id: selectedMatch.matchId,
                     homeId: selectedMatch.t1Id,
                     awayId: selectedMatch.t2Id,
                     date: "",
                     result: newResult,
                     court: "Pista TBD"
                 });
             }
        } else {
             const brackets = { ...categoryCuadros.brackets };
             categoryCuadros.brackets = brackets;

             const semiMatch = brackets.semis.find((m: any) => m.id === selectedMatch.matchId);
             if (semiMatch) {
                 const semis = [...brackets.semis];
                 brackets.semis = semis;
                 const idx = semis.indexOf(semiMatch);
                 semis[idx] = { ...semiMatch, result: newResult };
             } else {
                 const finalMatch = brackets.final.find((m: any) => m.id === selectedMatch.matchId);
                 if (finalMatch) {
                     const final = [...brackets.final];
                     brackets.final = final;
                     const idx = final.indexOf(finalMatch);
                     final[idx] = { ...finalMatch, result: newResult };
                 }
             }
        }
        setTournament(newTournament);
        setActiveModal('none');
    };

    const handleSaveCourt = (newCourt: string) => {
        if (!selectedMatch) return;
        
        const newTournament = { 
            ...tournament,
            cuadros: { ...tournament.cuadros }
        };
        const categoryCuadros = { ...newTournament.cuadros[selectedMatch.categoryId] };
        newTournament.cuadros[selectedMatch.categoryId] = categoryCuadros;

        if (selectedMatch.groupId !== undefined) {
             const groups = [...categoryCuadros.groups];
             categoryCuadros.groups = groups;
             const group = { ...groups[selectedMatch.groupId] };
             groups[selectedMatch.groupId] = group;
             
             const matches = [...group.matches];
             group.matches = matches;

             let match = matches.find((m: any) => m.id === selectedMatch.matchId);
             if (match) {
                 const updatedMatch = { ...match, court: newCourt };
                 const idx = matches.indexOf(match);
                 matches[idx] = updatedMatch;
             } else {
                 matches.push({
                     id: selectedMatch.matchId,
                     homeId: selectedMatch.t1Id,
                     awayId: selectedMatch.t2Id,
                     date: "",
                     result: "",
                     court: newCourt
                 });
             }
        } else {
             const brackets = { ...categoryCuadros.brackets };
             categoryCuadros.brackets = brackets;

             const semiMatch = brackets.semis.find((m: any) => m.id === selectedMatch.matchId);
             if (semiMatch) {
                 brackets.semis = brackets.semis.map((m: any) => m.id === selectedMatch.matchId ? { ...m, court: newCourt } : m);
             } else {
                 const finalMatch = brackets.final.find((m: any) => m.id === selectedMatch.matchId);
                 if (finalMatch) {
                     brackets.final = brackets.final.map((m: any) => m.id === selectedMatch.matchId ? { ...m, court: newCourt } : m);
                 }
             }
        }
        setTournament(newTournament);
        setActiveModal('none');
    };

    const renderGroupTable = (group: any, groupIndex: number) => {
        return (
            <div key={group.name} className="group-table-container">
                <table className="group-table">
                    <thead>
                        <tr>
                            <th className="group-name-cell">{group.name}</th>
                            {group.teamIds.map((tid: string, idx: number) => (
                                <th key={tid}>
                                    <div className="th-label">PAREJA {idx + 1}</div>
                                    <div className="th-name">{resolveTeamName(tid)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {group.teamIds.map((t1Id: string, rowIdx: number) => (
                            <tr key={t1Id}>
                                <th className="row-header">
                                    <div className="th-label">PAREJA {rowIdx + 1}</div>
                                    <div className="th-name">{resolveTeamName(t1Id)}</div>
                                </th>
                                {group.teamIds.map((t2Id: string) => {
                                    if (t1Id === t2Id) {
                                        return <td key={`${t1Id}-${t2Id}`} className="diagonal-cell"><div className="dot"></div></td>;
                                    }
                                    
                                    // Find match in flat array
                                    const matchInfo = group.matches.find((m: any) => 
                                        (m.homeId === t1Id && m.awayId === t2Id) || 
                                        (m.homeId === t2Id && m.awayId === t1Id)
                                    );
                                    
                                    return (
                                        <td key={`${t1Id}-${t2Id}`} className="match-cell">
                                             <div className="match-info">
                                                 {matchInfo ? (
                                                     matchInfo.result ? (
                                                         <span className="match-result">{matchInfo.result}</span>
                                                     ) : (
                                                         <>
                                                             <span className="match-date">{formatDateTime(matchInfo.date)}</span>
                                                             <span className="match-court">{matchInfo.court}</span>
                                                         </>
                                                     )
                                                 ) : (
                                                     <span className="match-placeholder">Programar</span>
                                                 )}
                                                 
                                                 <div className="match-actions">
                                                     <button 
                                                         className="action-icon schedule" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('schedule', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, matchInfo?.result || "", matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
                                                         title="Cambiar fecha/hora"
                                                     >
                                                         <Calendar size={14} />
                                                     </button>
                                                     <button 
                                                         className="action-icon schedule" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('court', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, matchInfo?.result || "", matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
                                                         title="Asignar pista"
                                                         style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                                                     >
                                                         <MapPin size={14} />
                                                     </button>
                                                     <button 
                                                         className="action-icon result" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('result', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, matchInfo?.result || "", matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
                                                         title="Registrar resultado"
                                                     >
                                                         <Trophy size={14} />
                                                     </button>
                                                 </div>
                                             </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="page-content cuadros-page">
            <TournamentSelector
                tournaments={TOURNAMENTS}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="GESTIÓN DE TORNEO"
                title="Gestión de Cuadros"
                subtitle="Visualiza y organiza la progresión de los grupos para la fase de clasificación del torneo regional."
            >
                <button className="btn-secondary">
                    PDF
                    <Download size={16} />
                </button>
                <button className="btn-primary">
                    Publicar
                    <UploadCloud size={16} />
                </button>
            </TournamentSelector>

            <div className="cuadros-content">
                <div className="category-selection-tabs">
                    {Object.keys(tournament.cuadros).map(cid => (
                        <button 
                            key={cid} 
                            className={`cat-tab ${activeCategoryId === cid ? 'active' : ''}`}
                            onClick={() => setActiveCategoryId(cid)}
                        >
                            {resolveCategoryName(cid)}
                        </button>
                    ))}
                </div>

                <div className="category-header">
                    <div className="category-marker"></div>
                    <h2>{resolveCategoryName(activeCategoryId)}</h2>
                </div>

                <div className="groups-container">
                    {activeCuadros.groups.map((group: any, index: number) => renderGroupTable(group, index))}
                </div>

                {activeCuadros.brackets && (
                    <div className="brackets-section">
                        <h3 className="section-title">FASE FINAL</h3>
                        
                        <div className="bracket-container">
                            {/* Semifinals */}
                            <div className="bracket-column">
                                {activeCuadros.brackets.semis.map((match: any, idx: number) => (
                                    <div key={match.id} className="bracket-match-wrapper">
                                        <div className="bracket-card">
                                            <div className="bracket-card-content">
                                                <div className="bracket-team-row">{resolveTeamName(match.homeId)}</div>
                                                <div className="bracket-team-row">{resolveTeamName(match.awayId)}</div>
                                            </div>
                                            <div className="bracket-card-status">
                                                {match.result ? (
                                                    <span className="match-result">{match.result}</span>
                                                ) : (
                                                    <span className="bracket-date">{formatDateTime(match.date)}</span>
                                                )}

                                                <div className="match-actions">
                                                     <button 
                                                         className="action-icon schedule" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('schedule', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }}
                                                         title="Cambiar fecha/hora"
                                                     >
                                                         <Calendar size={14} />
                                                     </button>
                                                     <button 
                                                         className="action-icon schedule" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('court', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }}
                                                         title="Asignar pista"
                                                         style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                                                     >
                                                         <MapPin size={14} />
                                                     </button>
                                                     <button 
                                                         className="action-icon result" 
                                                         onClick={(e) => { e.stopPropagation(); handleMatchClick('result', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }}
                                                         title="Registrar resultado"
                                                     >
                                                         <Trophy size={14} />
                                                     </button>
                                                 </div>
                                            </div>
                                        </div>
                                        <div className={`connector connector-semi connector-semi-${idx + 1}`}></div>
                                    </div>
                                ))}
                            </div>

                            {/* Final */}
                            <div className="bracket-column final-column">
                                {activeCuadros.brackets.final.length > 0 && (
                                    <div className="bracket-match-wrapper">
                                        <div className="bracket-card">
                                            <div className="bracket-card-content">
                                                <div className="bracket-team-row">{resolveTeamName(activeCuadros.brackets.final[0].homeId)}</div>
                                                <div className="bracket-team-row">{resolveTeamName(activeCuadros.brackets.final[0].awayId)}</div>
                                            </div>
                                            <div className="bracket-card-status">
                                                {activeCuadros.brackets.final[0].result ? (
                                                    <span className="match-result">{activeCuadros.brackets.final[0].result}</span>
                                                ) : (
                                                    <span className="bracket-date">{formatDateTime(activeCuadros.brackets.final[0].date)}</span>
                                                )}

                                                <div className="match-actions">
                                                    <button 
                                                        className="action-icon schedule" 
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('schedule', activeCuadros.brackets.final[0].homeId, activeCuadros.brackets.final[0].awayId, activeCuadros.brackets.final[0].id, activeCuadros.brackets.final[0].result, activeCuadros.brackets.final[0].date, activeCuadros.brackets.final[0].court); }}
                                                        title="Cambiar fecha/hora"
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <button 
                                                        className="action-icon schedule" 
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('court', activeCuadros.brackets.final[0].homeId, activeCuadros.brackets.final[0].awayId, activeCuadros.brackets.final[0].id, activeCuadros.brackets.final[0].result, activeCuadros.brackets.final[0].date, activeCuadros.brackets.final[0].court); }}
                                                        title="Asignar pista"
                                                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                                                    >
                                                        <MapPin size={14} />
                                                    </button>
                                                    <button 
                                                        className="action-icon result" 
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('result', activeCuadros.brackets.final[0].homeId, activeCuadros.brackets.final[0].awayId, activeCuadros.brackets.final[0].id, activeCuadros.brackets.final[0].result, activeCuadros.brackets.final[0].date, activeCuadros.brackets.final[0].court); }}
                                                        title="Registrar resultado"
                                                    >
                                                        <Trophy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ScheduleModal
                isOpen={activeModal === 'schedule'}
                onClose={() => setActiveModal('none')}
                onSave={handleSaveSchedule}
                initialSchedule={selectedMatch?.date}
                team1={selectedMatch?.team1 || ""}
                team2={selectedMatch?.team2 || ""}
            />

            <ResultModal 
                isOpen={activeModal === 'result'} 
                onClose={() => setActiveModal('none')} 
                onSave={handleSaveResult}
                initialResult={selectedMatch?.result}
                team1={selectedMatch?.team1 || ""}
                team2={selectedMatch?.team2 || ""}
            />

            <CourtModal 
                isOpen={activeModal === 'court'}
                onClose={() => setActiveModal('none')}
                onSave={handleSaveCourt}
                initialCourt={selectedMatch?.court}
                team1={selectedMatch?.team1 || ""}
                team2={selectedMatch?.team2 || ""}
            />
        </div>
    );
}
