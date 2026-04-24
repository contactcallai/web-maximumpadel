import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Trophy, Calendar, MapPin, Loader2, AlertCircle, GripVertical, RefreshCw } from 'lucide-react';
import ResultModal from '../components/ResultModal';
import ScheduleModal from '../components/ScheduleModal';
import CourtModal from '../components/CourtModal';
import TournamentSelector from '../components/TournamentSelector';
import { useTournament } from '../hooks/useTournament';
import { apiService } from '../services/apiService';
import './Cuadros.css';

const invertResultString = (resultStr: string) => {
    if (!resultStr) return "";
    return resultStr.split('/').map(set => {
        const scores = set.split('-');
        if (scores.length === 2) {
            // Invierte el orden y limpia espacios
            return `${scores[1].trim()}-${scores[0].trim()}`;
        }
        // Retorno de seguridad para textos no numéricos (ej. "W.O." o "Lesión")
        return set.trim();
    }).join(' / ');
};

const sortCategories = (a: string, b: string) => {
    const getWeight = (cat: string) => {
        const lowerCat = cat.toLowerCase();
        let weight = 0;

        // 1. Prioridad PRINCIPAL: Nivel numérico (1ª, 2ª, 3ª...)
        const numMatch = cat.match(/\d+/);
        if (numMatch) {
            // Multiplicamos por 1000 para asegurar que la categoría numérica domine la posición
            weight += parseInt(numMatch[0], 10) * 1000;
        } else {
            // Si la categoría no tiene número, se relega al final de la lista
            weight += 99000;
        }

        // 2. Prioridad SECUNDARIA: Rama / Género
        if (lowerCat.includes('masculina')) weight += 1;
        else if (lowerCat.includes('femenina')) weight += 2;
        else if (lowerCat.includes('mixta')) weight += 3;
        else weight += 4; // Sin género especificado

        return weight;
    };

    return getWeight(a) - getWeight(b);
};

export default function Cuadros() {
    const location = useLocation();
    const { tournamentId, setTournamentId } = useTournament();

    // Estados de API
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [tournament, setTournament] = useState<any>(null);
    const [isTournamentsLoading, setIsTournamentsLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!fetchError) return;
        const timer = window.setTimeout(() => setFetchError(null), 5000);
        return () => window.clearTimeout(timer);
    }, [fetchError]);

    // Estados de UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<string>("");
    const [activeModal, setActiveModal] = useState<'none' | 'schedule' | 'result' | 'court'>('none');
    const [selectedMatch, setSelectedMatch] = useState<{ matchId: string, t1Id: string, t2Id: string, team1: string, team2: string, result: string, date: string, court: string, categoryId: string, groupId?: number } | null>(null);
    const [draggedTeam, setDraggedTeam] = useState<{ groupIndex: number, teamIdx: number } | null>(null);
    const [dragOverTeam, setDragOverTeam] = useState<{ groupIndex: number, teamIdx: number } | null>(null);
    const [teamNames, setTeamNames] = useState<Record<string, string>>({});
    const [maxCourts, setMaxCourts] = useState<number>(0);

    // Configuración del bracket
    const [bracketConfig, setBracketConfig] = useState<{ firsts: number, seconds: number, thirds: number }>({
        firsts: 0,
        seconds: 0,
        thirds: 0
    });
    const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);

    const [draggedBracket, setDraggedBracket] = useState<{ roundKey: string, matchId: string, position: 'home' | 'away', teamId: string } | null>(null);
    const [dragOverBracket, setDragOverBracket] = useState<{ roundKey: string, matchId: string, position: 'home' | 'away' } | null>(null);

    // 1. Cargar la lista de torneos para el selector
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

    // Permitir navegación con state
    useEffect(() => {
        const navId = location.state?.tournamentId;
        if (navId && navId !== tournamentId) {
            setTournamentId(navId);
        }
    }, [location.state, tournamentId, setTournamentId]);

    // 2. Cargar partidos de la API y reconstruir las cuadrículas
    const fetchMatchesData = async (signal?: AbortSignal) => {
        setIsLoading(true);
        setIsGenerating(false); // Reiniciamos por defecto
        setFetchError(null);
        try {
            const response = await apiService.getTournamentMatches(tournamentId, signal);

            // INTERCEPTAMOS EL ESTADO PROCESSING
            if (response.status === 'processing') {
                setIsGenerating(true);
                setTournament({ cuadros: {} });
                return;
            }

            let calculatedMax = 0;
            if (response.metadata?.court_schedule) {
                Object.values(response.metadata.court_schedule).forEach((day: any) => {
                    Object.values(day).forEach((courts: any) => {
                        if (Number(courts) > calculatedMax) calculatedMax = Number(courts);
                    });
                });
            }
            setMaxCourts(calculatedMax > 0 ? calculatedMax : 5);

            const data = response.data; // Extraemos la data real

            if (!data || data.length === 0) {
                setTournament({ cuadros: {} });
                return;
            }

            const cuadrosObj: Record<string, any> = {};
            const newTeamNames: Record<string, string> = {}; // Diccionario temporal

            data.forEach((m: any) => {
                const cat = m.category || 'Sin Categoría';

                // Resolvemos IDs para la lógica interna asegurando que SIEMPRE sean strings
                const t1Id = m.team1_id ? String(m.team1_id) : String(m.team1 || "TBD");
                const t2Id = m.team2_id ? String(m.team2_id) : String(m.team2 || "TBD");

                // Guardamos la relación UUID -> Nombre real para la UI
                if (m.team1_id) newTeamNames[String(m.team1_id)] = m.team1;
                if (m.team2_id) newTeamNames[String(m.team2_id)] = m.team2;

                if (!cuadrosObj[cat]) {
                    cuadrosObj[cat] = {
                        groups: [],
                        brackets: {}
                    };
                }

                if (m.is_bracket) {
                    const roundName = m.bracket_round || 'desconocida';
                    if (!cuadrosObj[cat].brackets[roundName]) {
                        cuadrosObj[cat].brackets[roundName] = [];
                    }

                    cuadrosObj[cat].brackets[roundName].push({
                        id: m.id,
                        homeId: t1Id, // AHORA ES EL UUID
                        awayId: t2Id, // AHORA ES EL UUID
                        placeholderHome: m.placeholder_home || "",
                        placeholderAway: m.placeholder_away || "",
                        date: m.scheduled_at || "",
                        result: m.result || "",
                        court: m.court || "TBD"
                    });
                } else {
                    // Procesamiento de Fase de Grupos
                    const groupNum = m.group_number || 1;
                    let group = cuadrosObj[cat].groups.find((g: any) => g.id === groupNum);
                    if (!group) {
                        group = { id: groupNum, name: `Grupo ${groupNum}`, teamIds: [], matches: [] };
                        cuadrosObj[cat].groups.push(group);
                    }

                    if (t1Id && !group.teamIds.includes(t1Id) && t1Id !== "TBD") group.teamIds.push(t1Id);
                    if (t2Id && !group.teamIds.includes(t2Id) && t2Id !== "TBD") group.teamIds.push(t2Id);

                    group.matches.push({
                        id: m.id,
                        homeId: t1Id, // AHORA ES EL UUID
                        awayId: t2Id, // AHORA ES EL UUID
                        date: m.scheduled_at || "",
                        result: m.result || "",
                        court: m.court || "Pista TBD"
                    });
                }
            });

            Object.values(cuadrosObj).forEach((catData: any) => {
                // Ordenar los grupos por su número (Grupo 1, Grupo 2...)
                catData.groups.sort((a: any, b: any) => a.id - b.id);

                // Garantizar orden alfabético estricto e inmutable de las parejas dentro de cada grupo
                catData.groups.forEach((g: any) => {
                    g.teamIds.sort((idA: string, idB: string) => {
                        const nameA = newTeamNames[idA] || idA;
                        const nameB = newTeamNames[idB] || idB;
                        return nameA.localeCompare(nameB);
                    });
                });
            });

            setTournament({ cuadros: cuadrosObj });
            setTeamNames(newTeamNames); // APLICAMOS EL DICCIONARIO

            if (!activeCategoryId && Object.keys(cuadrosObj).length > 0) {
                const sortedCats = Object.keys(cuadrosObj).sort(sortCategories);
                setActiveCategoryId(sortedCats[0]);
            }

        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            setFetchError('Error al cargar los cuadros.');
            setTournament(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!tournamentId) {
            setTournament(null);
            return;
        }
        const ac = new AbortController();
        fetchMatchesData(ac.signal);
        return () => ac.abort();
    }, [tournamentId]);

    // Como ahora los IDs son los nombres reales del backend, la resolución es directa
    // Ahora busca en el diccionario. Si no lo encuentra (ej: "BYE"), devuelve el mismo texto.
    const resolveTeamName = (id: string) => teamNames[id] || id;
    const resolveCategoryName = (id: string) => id;

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

    const formatCourtDisplay = (courtStr: string) => {
        if (!courtStr || courtStr === "TBD") return "Pista TBD";
        // Si el valor es estrictamente numérico, le añadimos el prefijo visual
        if (/^\d+$/.test(courtStr)) return `Pista ${courtStr}`;
        // Si es "Central" o "Exterior" y no lleva la palabra "Pista", se la añadimos
        if (!courtStr.toLowerCase().includes('pista')) return `Pista ${courtStr}`;
        return courtStr;
    };

    const handleMatchClick = (mode: 'schedule' | 'result' | 'court', t1Id: string, t2Id: string, matchId: string, result: string, date: string, court: string, groupId?: number) => {
        setSelectedMatch({
            matchId, t1Id, t2Id,
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

    const handleSaveSchedule = async (newSchedule: string) => {
        if (!selectedMatch) return;
        try {
            await apiService.updateMatch(tournamentId, selectedMatch.matchId, { scheduled_at: newSchedule });

            const newTournament = { ...tournament, cuadros: { ...tournament.cuadros } };
            const categoryCuadros = { ...newTournament.cuadros[selectedMatch.categoryId] };
            newTournament.cuadros[selectedMatch.categoryId] = categoryCuadros;

            if (selectedMatch.groupId !== undefined) {
                // Actualización de Fase de Grupos
                const groups = [...categoryCuadros.groups];
                categoryCuadros.groups = groups;
                const group = { ...groups[selectedMatch.groupId] };
                groups[selectedMatch.groupId] = group;
                const matches = [...group.matches];
                group.matches = matches;

                let match = matches.find((m: any) => m.id === selectedMatch.matchId);
                if (match) matches[matches.indexOf(match)] = { ...match, date: newSchedule };
            } else {
                // Actualización de Fase Final (Brackets)
                const brackets = { ...categoryCuadros.brackets };
                categoryCuadros.brackets = brackets;
                for (const round of Object.keys(brackets)) {
                    const roundMatches = [...brackets[round]];
                    const matchIndex = roundMatches.findIndex((m: any) => m.id === selectedMatch.matchId);
                    if (matchIndex !== -1) {
                        roundMatches[matchIndex] = { ...roundMatches[matchIndex], date: newSchedule };
                        brackets[round] = roundMatches;
                        break;
                    }
                }
            }

            setTournament(newTournament);
            setActiveModal('none');
        } catch (error) {
            console.error(error);
            setFetchError("Error al guardar la fecha en la base de datos.");
            setActiveModal('none');
        }
    };

    const handleSaveResult = async (newResult: string) => {
        if (!selectedMatch) return;

        // 1. Recuperar el partido original del estado para verificar la perspectiva
        let actualMatch;
        if (selectedMatch.groupId !== undefined) {
            const group = tournament.cuadros[selectedMatch.categoryId].groups[selectedMatch.groupId];
            actualMatch = group.matches.find((m: any) => m.id === selectedMatch.matchId);
        } else {
            // Si es bracket, la búsqueda es distinta (aunque en brackets no hay modo espejo)
            const brackets = tournament.cuadros[selectedMatch.categoryId].brackets;
            for (const round of Object.keys(brackets)) {
                const found = brackets[round].find((m: any) => m.id === selectedMatch.matchId);
                if (found) {
                    actualMatch = found;
                    break;
                }
            }
        }

        // 2. Control de Inversión: Si el t1Id del modal NO es el homeId de la BD, 
        // significa que el usuario editó el resultado desde la celda "espejo".
        // Debemos invertir los sets antes de enviarlos al backend.
        let resultToSave = newResult;
        if (actualMatch && actualMatch.homeId !== selectedMatch.t1Id && newResult !== "") {
            resultToSave = invertResultString(newResult);
        }

        try {
            // Guardamos el resultado en su perspectiva base
            await apiService.updateMatch(tournamentId, selectedMatch.matchId, { result: resultToSave });

            // Forzamos la recarga de datos para disparar la actualización de clasificación
            await fetchMatchesData();

            setActiveModal('none');
        } catch (error) {
            setFetchError("Error al actualizar y sincronizar el cuadro.");
        }
    };

    const handleSaveCourt = async (newCourt: string) => {
        if (!selectedMatch) return;
        try {
            await apiService.updateMatch(tournamentId, selectedMatch.matchId, { court: newCourt });

            const newTournament = { ...tournament, cuadros: { ...tournament.cuadros } };
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
                if (match) matches[matches.indexOf(match)] = { ...match, court: newCourt };
            } else {
                const brackets = { ...categoryCuadros.brackets };
                categoryCuadros.brackets = brackets;
                for (const round of Object.keys(brackets)) {
                    const roundMatches = [...brackets[round]];
                    const matchIndex = roundMatches.findIndex((m: any) => m.id === selectedMatch.matchId);
                    if (matchIndex !== -1) {
                        roundMatches[matchIndex] = { ...roundMatches[matchIndex], court: newCourt };
                        brackets[round] = roundMatches;
                        break;
                    }
                }
            }

            setTournament(newTournament);
            setActiveModal('none');
        } catch (error) {
            console.error(error);
            setFetchError("Error al guardar la pista en la base de datos.");
            setActiveModal('none');
        }
    };

    const executeDrop = async (sourceGroupIdx: number, sourceTeamIdx: number, targetGroupIndex: number, targetTeamIdx: number) => {
        if (sourceGroupIdx === targetGroupIndex && sourceTeamIdx === targetTeamIdx) return;

        const categoryCuadros = tournament.cuadros[activeCategoryId];
        const sourceGroup = categoryCuadros.groups[sourceGroupIdx];
        const targetGroup = categoryCuadros.groups[targetGroupIndex];

        const sourceTeamId = sourceGroup.teamIds[sourceTeamIdx];
        const targetTeamId = targetGroup.teamIds[targetTeamIdx];

        try {
            await apiService.swapGroupTeams(
                tournamentId,
                activeCategoryId,
                sourceGroup.id,
                sourceTeamId,
                targetGroup.id,
                targetTeamId
            );
            await fetchMatchesData();
        } catch (error: any) {
            console.error(error);
            setFetchError("Error al guardar el intercambio de grupos.");
            fetchMatchesData();
        }
    };

    const handleDragStart = (groupIndex: number, teamIdx: number) => setDraggedTeam({ groupIndex, teamIdx });

    const handleDragOver = (e: React.DragEvent, groupIndex: number, teamIdx: number) => {
        e.preventDefault();
        if (draggedTeam && (draggedTeam.groupIndex !== groupIndex || draggedTeam.teamIdx !== teamIdx)) setDragOverTeam({ groupIndex, teamIdx });
    };

    const handleDragLeave = () => setDragOverTeam(null);

    const handleDrop = async (e: React.DragEvent, targetGroupIndex: number, targetTeamIdx: number) => {
        e.preventDefault();
        if (!draggedTeam) return;
        const sourceGroupIdx = draggedTeam.groupIndex;
        const sourceTeamIdx = draggedTeam.teamIdx;
        setDraggedTeam(null);
        setDragOverTeam(null);
        await executeDrop(sourceGroupIdx, sourceTeamIdx, targetGroupIndex, targetTeamIdx);
    };

    const handleTouchStart = (e: React.TouchEvent, groupIndex: number, teamIdx: number) => {
        handleDragStart(groupIndex, teamIdx);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!draggedTeam) return;
        const touch = e.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elem) {
            const dragTarget = elem.closest('.row-header');
            if (dragTarget) {
                const groupIdx = dragTarget.getAttribute('data-group-idx');
                const teamIdx = dragTarget.getAttribute('data-team-idx');
                if (groupIdx != null && teamIdx != null) {
                    const gIdx = parseInt(groupIdx, 10);
                    const tIdx = parseInt(teamIdx, 10);
                    if (draggedTeam.groupIndex !== gIdx || draggedTeam.teamIdx !== tIdx) {
                        setDragOverTeam({ groupIndex: gIdx, teamIdx: tIdx });
                        return;
                    }
                }
            }
        }
        setDragOverTeam(null);
    };

    const handleTouchEnd = async (e: React.TouchEvent) => {
        if (!draggedTeam) return;
        const dragOver = dragOverTeam;
        const sourceGroupIdx = draggedTeam.groupIndex;
        const sourceTeamIdx = draggedTeam.teamIdx;
        setDraggedTeam(null);
        setDragOverTeam(null);
        if (dragOver) {
            await executeDrop(sourceGroupIdx, sourceTeamIdx, dragOver.groupIndex, dragOver.teamIdx);
        }
    };

    const renderGroupTable = (group: any, groupIndex: number) => {
        return (
            <div key={group.name} className="group-table-container">
                <table className="group-table">
                    <thead>
                        <tr>
                            <th className="group-name-cell">{group.name}</th>
                            {group.teamIds.map((tid: string) => (
                                <th key={tid}>
                                    <div className="th-name">{resolveTeamName(tid)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {group.teamIds.map((t1Id: string, rowIdx: number) => (
                            <tr key={t1Id}>
                                <th
                                    className={`row-header ${draggedTeam?.groupIndex === groupIndex && draggedTeam?.teamIdx === rowIdx ? 'dragging' : ''} ${dragOverTeam?.groupIndex === groupIndex && dragOverTeam?.teamIdx === rowIdx ? 'drag-over' : ''}`}
                                    data-group-idx={groupIndex}
                                    data-team-idx={rowIdx}
                                    onDragOver={(e) => handleDragOver(e, groupIndex, rowIdx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, groupIndex, rowIdx)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div
                                            className="drag-handle"
                                            draggable="true"
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = 'move';
                                                handleDragStart(groupIndex, rowIdx);
                                            }}
                                            onTouchStart={(e) => handleTouchStart(e, groupIndex, rowIdx)}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                        >
                                            <GripVertical size={16} />
                                        </div>
                                        <div>
                                            <div className="th-name">{resolveTeamName(t1Id)}</div>
                                        </div>
                                    </div>
                                </th>
                                {group.teamIds.map((t2Id: string) => {
                                    if (t1Id === t2Id) {
                                        return <td key={`${t1Id}-${t2Id}`} className="diagonal-cell"><div className="dot"></div></td>;
                                    }

                                    const matchInfo = group.matches.find((m: any) =>
                                        (m.homeId === t1Id && m.awayId === t2Id) ||
                                        (m.homeId === t2Id && m.awayId === t1Id)
                                    );

                                    // Lógica de cálculo del efecto espejo
                                    let displayResult = matchInfo?.result || "";
                                    if (matchInfo && matchInfo.result && matchInfo.homeId !== t1Id) {
                                        // Si el equipo de la fila actual no es el Local en la BD, invertimos el marcador
                                        displayResult = invertResultString(matchInfo.result);
                                    }

                                    const isRealMatch = matchInfo && !String(matchInfo.id).startsWith('m-');

                                    return (
                                        <td key={`${t1Id}-${t2Id}`} className="match-cell">
                                            <div className="match-info">
                                                {matchInfo ? (
                                                    matchInfo.result ? (
                                                        <span className="match-result">{displayResult}</span>
                                                    ) : (
                                                        <>
                                                            <span className="match-date">{formatDateTime(matchInfo.date)}</span>
                                                            <span className="match-court">{formatCourtDisplay(matchInfo.court)}</span>
                                                        </>
                                                    )
                                                ) : (
                                                    <span className="match-placeholder">Programar</span>
                                                )}

                                                <div className="match-actions">
                                                    <button
                                                        className="action-icon schedule"
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('schedule', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, displayResult, matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
                                                        title="Cambiar fecha/hora"
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <button
                                                        className="action-icon schedule"
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('court', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, displayResult, matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
                                                        title="Asignar pista"
                                                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                                                    >
                                                        <MapPin size={14} />
                                                    </button>
                                                    <button
                                                        className="action-icon result"
                                                        onClick={(e) => { e.stopPropagation(); handleMatchClick('result', t1Id, t2Id, matchInfo?.id || `m-${t1Id}-${t2Id}`, displayResult, matchInfo?.date || "", matchInfo?.court || "", groupIndex); }}
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

    const activeCuadros = tournament?.cuadros[activeCategoryId] || { groups: [], brackets: null };
    const maxGroups = activeCuadros.groups?.length || 0;

    useEffect(() => {
        if (!activeCuadros) return;

        const brackets = activeCuadros.brackets;

        // Si hay un cuadro final ya generado para esta categoría, extraemos la configuración
        if (brackets && Object.keys(brackets).length > 0) {
            let firsts = 0, seconds = 0, thirds = 0;

            // Usamos un Set para no contar duplicados (por arrastrar y soltar)
            const uniquePlaceholders = new Set<string>();

            Object.values(brackets).flat().forEach((m: any) => {
                if (m.placeholderHome) uniquePlaceholders.add(m.placeholderHome);
                if (m.placeholderAway) uniquePlaceholders.add(m.placeholderAway);
            });

            // Contamos cuántas apariciones únicas hay de cada tipo
            uniquePlaceholders.forEach(ph => {
                if (ph.includes("1º")) firsts++;
                if (ph.includes("2º")) seconds++;
                if (ph.includes("3º")) thirds++;
            });

            setBracketConfig({ firsts, seconds, thirds });
        } else {
            // Si NO hay cuadro generado, ponemos los valores por defecto
            setBracketConfig({ firsts: maxGroups, seconds: 0, thirds: 0 });
        }
    }, [activeCategoryId, tournament]);

    const handleGenerateBracket = async () => {
        if (bracketConfig.firsts < 1) {
            alert("Debe haber al menos 1 primer clasificado.");
            return;
        }
        setIsGeneratingBracket(true);
        try {
            // Añadimos bracketConfig.thirds como cuarto argumento numérico
            await apiService.generateBrackets(
                tournamentId,
                activeCategoryId,
                bracketConfig.firsts,
                bracketConfig.seconds,
                bracketConfig.thirds
            );
            await fetchMatchesData();
        } catch (error: any) {
            setFetchError(error.message || "Error al generar fase final.");
        } finally {
            setIsGeneratingBracket(false);
        }
    };

    const handleBracketDragStart = (roundKey: string, matchId: string, position: 'home' | 'away', teamId: string) => {
        setDraggedBracket({ roundKey, matchId, position, teamId });
    };

    const handleBracketDragOver = (e: React.DragEvent, roundKey: string, matchId: string, position: 'home' | 'away') => {
        e.preventDefault();
        if (draggedBracket && (draggedBracket.matchId !== matchId || draggedBracket.position !== position)) {
            setDragOverBracket({ roundKey, matchId, position });
        }
    };

    const handleBracketDragLeave = () => setDragOverBracket(null);

    const executeBracketDrop = async (sourceRoundKey: string, sourceMatchId: string, sourcePosition: 'home' | 'away', sourceTeamId: string, targetRoundKey: string, targetMatchId: string, targetPosition: 'home' | 'away') => {
        if (sourceMatchId === targetMatchId && sourcePosition === targetPosition) return;

        const newTournament = { ...tournament, cuadros: { ...tournament.cuadros } };
        const categoryCuadros = { ...newTournament.cuadros[activeCategoryId] };
        newTournament.cuadros[activeCategoryId] = categoryCuadros;
        const brackets = { ...categoryCuadros.brackets };
        categoryCuadros.brackets = brackets;

        const sourceMatches = [...brackets[sourceRoundKey]];
        const targetMatches = sourceRoundKey === targetRoundKey ? sourceMatches : [...brackets[targetRoundKey]];

        const sourceMatchIdx = sourceMatches.findIndex((m: any) => m.id === sourceMatchId);
        const targetMatchIdx = targetMatches.findIndex((m: any) => m.id === targetMatchId);

        if (sourceMatchIdx === -1 || targetMatchIdx === -1) return;

        if (sourceMatchId === targetMatchId) {
            const match = { ...sourceMatches[sourceMatchIdx] };
            const originalSourceTeam = sourcePosition === 'home' ? match.homeId : match.awayId;
            const originalSourcePh = sourcePosition === 'home' ? match.placeholderHome : match.placeholderAway;

            if (sourcePosition === 'home') {
                match.homeId = targetPosition === 'home' ? match.homeId : match.awayId;
                match.placeholderHome = targetPosition === 'home' ? match.placeholderHome : match.placeholderAway;
            } else {
                match.awayId = targetPosition === 'home' ? match.homeId : match.awayId;
                match.placeholderAway = targetPosition === 'home' ? match.placeholderHome : match.placeholderAway;
            }

            if (targetPosition === 'home') {
                match.homeId = originalSourceTeam;
                match.placeholderHome = originalSourcePh;
            } else {
                match.awayId = originalSourceTeam;
                match.placeholderAway = originalSourcePh;
            }

            match.result = "";
            sourceMatches[sourceMatchIdx] = match;
            brackets[sourceRoundKey] = sourceMatches;
        } else {
            const sourceMatch = { ...sourceMatches[sourceMatchIdx] };
            const targetMatch = { ...targetMatches[targetMatchIdx] };

            const targetTeamId = targetPosition === 'home' ? targetMatch.homeId : targetMatch.awayId;
            const targetPh = targetPosition === 'home' ? targetMatch.placeholderHome : targetMatch.placeholderAway;

            const sourceTeamId = sourcePosition === 'home' ? sourceMatch.homeId : sourceMatch.awayId;
            const sourcePh = sourcePosition === 'home' ? sourceMatch.placeholderHome : sourceMatch.placeholderAway;

            if (sourcePosition === 'home') {
                sourceMatch.homeId = targetTeamId;
                sourceMatch.placeholderHome = targetPh;
            } else {
                sourceMatch.awayId = targetTeamId;
                sourceMatch.placeholderAway = targetPh;
            }

            if (targetPosition === 'home') {
                targetMatch.homeId = sourceTeamId;
                targetMatch.placeholderHome = sourcePh;
            } else {
                targetMatch.awayId = sourceTeamId;
                targetMatch.placeholderAway = sourcePh;
            }

            sourceMatch.result = "";
            targetMatch.result = "";

            sourceMatches[sourceMatchIdx] = sourceMatch;

            if (sourceRoundKey !== targetRoundKey) {
                targetMatches[targetMatchIdx] = targetMatch;
                brackets[sourceRoundKey] = sourceMatches;
                brackets[targetRoundKey] = targetMatches;
            } else {
                sourceMatches[targetMatchIdx] = targetMatch;
                brackets[sourceRoundKey] = sourceMatches;
            }
        }

        setTournament(newTournament);

        try {
            await apiService.swapBracketSlots(tournamentId, sourceMatchId, sourcePosition, targetMatchId, targetPosition);
            await fetchMatchesData();
        } catch (error: any) {
            console.error(error);
            setFetchError("Error al guardar el intercambio en la base de datos.");
            fetchMatchesData();
        }
    };

    const handleBracketDrop = async (e: React.DragEvent, targetRoundKey: string, targetMatchId: string, targetPosition: 'home' | 'away') => {
        e.preventDefault();
        if (!draggedBracket) return;

        const { roundKey: sourceRoundKey, matchId: sourceMatchId, position: sourcePosition, teamId: sourceTeamId } = draggedBracket;
        setDraggedBracket(null);
        setDragOverBracket(null);

        await executeBracketDrop(sourceRoundKey, sourceMatchId, sourcePosition, sourceTeamId, targetRoundKey, targetMatchId, targetPosition);
    };

    const handleBracketTouchStart = (e: React.TouchEvent, roundKey: string, matchId: string, position: 'home' | 'away', teamId: string) => {
        handleBracketDragStart(roundKey, matchId, position, teamId);
    };

    const handleBracketTouchMove = (e: React.TouchEvent) => {
        if (!draggedBracket) return;
        const touch = e.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elem) {
            const dragTarget = elem.closest('.bracket-team-row');
            if (dragTarget) {
                const roundKey = dragTarget.getAttribute('data-round-key');
                const matchId = dragTarget.getAttribute('data-match-id');
                const position = dragTarget.getAttribute('data-position') as 'home' | 'away';

                if (roundKey && matchId && position) {
                    if (draggedBracket.matchId !== matchId || draggedBracket.position !== position) {
                        setDragOverBracket({ roundKey, matchId, position });
                        return;
                    }
                }
            }
        }
        setDragOverBracket(null);
    };

    const handleBracketTouchEnd = async (e: React.TouchEvent) => {
        if (!draggedBracket) return;
        const dragOver = dragOverBracket;
        const sourceRoundKey = draggedBracket.roundKey;
        const sourceMatchId = draggedBracket.matchId;
        const sourcePosition = draggedBracket.position;
        const sourceTeamId = draggedBracket.teamId;

        setDraggedBracket(null);
        setDragOverBracket(null);

        if (dragOver) {
            await executeBracketDrop(sourceRoundKey, sourceMatchId, sourcePosition, sourceTeamId, dragOver.roundKey, dragOver.matchId, dragOver.position);
        }
    };

    const totalQualified = bracketConfig.firsts + bracketConfig.seconds + bracketConfig.thirds;
    const getNextPowerOf2 = (n: number) => {
        if (n <= 0) return 0;
        if (n <= 2) return 2;
        return Math.pow(2, Math.ceil(Math.log2(n)));
    };
    const projectedDrawSize = getNextPowerOf2(totalQualified);
    const projectedByes = projectedDrawSize - totalQualified;

    return (
        <div className="page-content cuadros-page">
            <TournamentSelector
                tournaments={tournaments}
                activeTournamentId={tournamentId}
                onTournamentChange={setTournamentId}
                preTitle="GESTIÓN DE TORNEO"
                title="Gestión de Cuadros"
                subtitle="Visualiza y organiza la progresión de los grupos para la fase de clasificación del torneo regional."
            >
            </TournamentSelector>

            {fetchError && (
                <div
                    role="alert"
                    className="cuadros-error-toast"
                    style={{
                        position: 'fixed',
                        bottom: 24, // Asumimos que aquí no hay syncToast que pisar
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

            {/* 1. CARGA INICIAL: Solo colapsa si NO hay torneo y está cargando */}
            {isTournamentsLoading || (isLoading && (!tournament || Object.keys(tournament.cuadros).length === 0)) ? (
                <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '3rem', color: '#64748b' }}>
                    <Loader2 className="animate-spin" size={32} />
                    <span>Construyendo matrices de enfrentamiento...</span>
                </div>
            ) : isGenerating ? (
                /* 2. ESTADO DE GENERACIÓN: El motor del backend está trabajando */
                <div className="generating-state" style={{ textAlign: 'center', marginTop: '4rem', color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-white)', padding: '3rem', borderRadius: '12px', border: '1px dashed #bfdbfe' }}>
                    <RefreshCw className="animate-spin" size={48} style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Generando Cuadros...</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px' }}>El motor de inteligencia artificial está calculando la distribución óptima de los partidos para minimizar conflictos de horarios. Recarga la página en unos segundos.</p>
                </div>
            ) :
                /* 3. ESTADO VACÍO: Hay torneo pero la API devolvió cero grupos */
                !tournament || Object.keys(tournament.cuadros).length === 0 ? (
                    <div className="empty-state" style={{ marginTop: '2rem', padding: '4rem 2rem', textAlign: 'center', color: '#64748b', background: 'var(--bg-white)', border: '1px dashed var(--border)', borderRadius: '12px', fontWeight: 500 }}>
                        No hay cuadros generados para este torneo.
                    </div>
                ) :

                    /* 3. ESTADO PERSISTENTE: Mantiene el DOM intacto durante las recargas de fondo (isLoading) */
                    (
                        <div
                            className="cuadros-content"
                            style={{
                                opacity: isLoading ? 0.5 : 1,
                                pointerEvents: isLoading ? 'none' : 'auto',
                                transition: 'opacity 0.2s ease'
                            }}
                        >
                            <div className="category-selection-tabs">
                                {/* Añadimos .sort(sortCategories) antes del .map */}
                                {Object.keys(tournament.cuadros).sort(sortCategories).map(cid => (
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

                            {/* FASE FINAL INTACTA (Usando los datos Dummy inyectados en la carga) */}
                            {activeCuadros.brackets && (
                                <div className="brackets-section" style={{ marginTop: '32px' }}>
                                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                        <h3 className="section-title" style={{ margin: 0, marginTop: '8px' }}>FASE FINAL</h3>

                                        {/* Panel de Configuración de Bracket Expandido */}
                                        <div className="bracket-config-panel" style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px',
                                            background: '#f8fafc',
                                            padding: '20px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                {/* Input 1ºs */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>1º Clasificados</label>
                                                    <input
                                                        type="number" min="0" max={maxGroups}
                                                        value={bracketConfig.firsts}
                                                        onChange={e => setBracketConfig({ ...bracketConfig, firsts: Math.max(0, Math.min(parseInt(e.target.value) || 0, maxGroups)) })}
                                                        style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}
                                                    />
                                                </div>
                                                {/* Input 2ºs */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>2º Clasificados</label>
                                                    <input
                                                        type="number" min="0" max={maxGroups}
                                                        value={bracketConfig.seconds}
                                                        onChange={e => setBracketConfig({ ...bracketConfig, seconds: Math.max(0, Math.min(parseInt(e.target.value) || 0, maxGroups)) })}
                                                        style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}
                                                    />
                                                </div>
                                                {/* Input 3ºs */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>3º Clasificados</label>
                                                    <input
                                                        type="number" min="0" max={maxGroups}
                                                        value={bracketConfig.thirds}
                                                        onChange={e => setBracketConfig({ ...bracketConfig, thirds: Math.max(0, Math.min(parseInt(e.target.value) || 0, maxGroups)) })}
                                                        style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}
                                                    />
                                                </div>

                                                <button
                                                    className="btn-primary"
                                                    onClick={handleGenerateBracket}
                                                    disabled={isGeneratingBracket || totalQualified < 2}
                                                    style={{ height: '38px', marginLeft: 'auto' }}
                                                >
                                                    {isGeneratingBracket ? <Loader2 size={16} className="animate-spin" /> : 'Crear Bracket'}
                                                </button>
                                            </div>

                                            {/* Resumen Matemático Informativo */}
                                            {totalQualified > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '24px',
                                                    padding: '10px 16px',
                                                    background: 'white',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    <div style={{ color: 'var(--text-dark)' }}>
                                                        Total parejas: <strong style={{ color: 'var(--primary)' }}>{totalQualified}</strong>
                                                    </div>
                                                    <div style={{ color: 'var(--text-dark)' }}>
                                                        Tamaño del cuadro: <strong>{projectedDrawSize}</strong>
                                                    </div>
                                                    <div style={{ color: projectedByes > 0 ? '#f59e0b' : '#10b981' }}>
                                                        BYEs necesarios: <strong>{projectedByes}</strong>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Renderizado de las Rondas si existen */}
                                    {Object.keys(activeCuadros.brackets || {}).length > 0 ? (
                                        <div className="bracket-container" style={{ overflowX: 'auto', paddingBottom: '20px' }}>

                                            {/* Cálculo dinámico de rondas activas y detección estricta de la primera ronda */}
                                            {(() => {
                                                const allPossibleRounds = ['1/32', '1/16', '1/8', 'cuartos', 'semis', 'final'];
                                                const activeRounds = allPossibleRounds.filter(r => activeCuadros.brackets[r] && activeCuadros.brackets[r].length > 0);
                                                const firstRoundKey = activeRounds[0]; // La primera ronda cronológica de este cuadro

                                                return activeRounds.map(roundKey => {
                                                    const matchesInRound = activeCuadros.brackets[roundKey];
                                                    const isFirstRound = roundKey === firstRoundKey; // Flag de validación de Drag & Drop

                                                    return (
                                                        <div key={roundKey} className={`bracket-column ${roundKey === 'final' ? 'final-column' : ''}`}>
                                                            <div className="column-label" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase' }}>
                                                                {roundKey}
                                                            </div>
                                                            {matchesInRound.map((match: any, idx: number) => {
                                                                const isByeMatch = String(match.homeId || "").includes("BYE") ||
                                                                    String(match.awayId || "").includes("BYE") ||
                                                                    match.placeholderHome === "BYE" ||
                                                                    match.placeholderAway === "BYE";

                                                                return (
                                                                    <div key={match.id} className="bracket-match-wrapper">
                                                                        <div className="bracket-card" style={isByeMatch ? { opacity: 0.6 } : {}}>
                                                                            <div className="bracket-card-content">
                                                                                {/* RENDERIZADO DEL LOCAL (HOME) */}
                                                                                <div
                                                                                    className={`bracket-team-row ${isFirstRound ? 'draggable-bracket' : ''} ${draggedBracket?.matchId === match.id && draggedBracket?.position === 'home' ? 'dragging' : ''} ${dragOverBracket?.matchId === match.id && dragOverBracket?.position === 'home' ? 'drag-over' : ''}`}
                                                                                    data-round-key={roundKey}
                                                                                    data-match-id={match.id}
                                                                                    data-position="home"
                                                                                    onDragOver={isFirstRound ? (e) => handleBracketDragOver(e, roundKey, match.id, 'home') : undefined}
                                                                                    onDragLeave={isFirstRound ? handleBracketDragLeave : undefined}
                                                                                    onDrop={isFirstRound ? (e) => handleBracketDrop(e, roundKey, match.id, 'home') : undefined}
                                                                                >
                                                                                    {isFirstRound && (
                                                                                        <div
                                                                                            className="drag-handle bracket-drag"
                                                                                            draggable="true"
                                                                                            onDragStart={(e) => {
                                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                                handleBracketDragStart(roundKey, match.id, 'home', match.homeId);
                                                                                            }}
                                                                                            onTouchStart={(e) => handleBracketTouchStart(e, roundKey, match.id, 'home', match.homeId)}
                                                                                            onTouchMove={handleBracketTouchMove}
                                                                                            onTouchEnd={handleBracketTouchEnd}
                                                                                        >
                                                                                            <GripVertical size={14} />
                                                                                        </div>
                                                                                    )}
                                                                                    <span>{resolveTeamName(match.homeId)}</span>
                                                                                </div>

                                                                                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0', opacity: 0.5 }}></div>

                                                                                {/* RENDERIZADO DEL VISITANTE (AWAY) */}
                                                                                <div
                                                                                    className={`bracket-team-row ${isFirstRound ? 'draggable-bracket' : ''} ${draggedBracket?.matchId === match.id && draggedBracket?.position === 'away' ? 'dragging' : ''} ${dragOverBracket?.matchId === match.id && dragOverBracket?.position === 'away' ? 'drag-over' : ''}`}
                                                                                    data-round-key={roundKey}
                                                                                    data-match-id={match.id}
                                                                                    data-position="away"
                                                                                    onDragOver={isFirstRound ? (e) => handleBracketDragOver(e, roundKey, match.id, 'away') : undefined}
                                                                                    onDragLeave={isFirstRound ? handleBracketDragLeave : undefined}
                                                                                    onDrop={isFirstRound ? (e) => handleBracketDrop(e, roundKey, match.id, 'away') : undefined}
                                                                                >
                                                                                    {isFirstRound && (
                                                                                        <div
                                                                                            className="drag-handle bracket-drag"
                                                                                            draggable="true"
                                                                                            onDragStart={(e) => {
                                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                                handleBracketDragStart(roundKey, match.id, 'away', match.awayId);
                                                                                            }}
                                                                                            onTouchStart={(e) => handleBracketTouchStart(e, roundKey, match.id, 'away', match.awayId)}
                                                                                            onTouchMove={handleBracketTouchMove}
                                                                                            onTouchEnd={handleBracketTouchEnd}
                                                                                        >
                                                                                            <GripVertical size={14} />
                                                                                        </div>
                                                                                    )}
                                                                                    <span>{resolveTeamName(match.awayId)}</span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="bracket-card-status">
                                                                                {isByeMatch ? (
                                                                                    <span className="match-result" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>BYE</span>
                                                                                ) : match.result ? (
                                                                                    <span className="match-result">{match.result}</span>
                                                                                ) : (
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                                        <span className="bracket-date">{formatDateTime(match.date)}</span>
                                                                                        {match.court && match.court !== "TBD" && (
                                                                                            <span className="match-court">{formatCourtDisplay(match.court)}</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {!isByeMatch && (
                                                                                    <div className="match-actions">
                                                                                        <button className="action-icon schedule" onClick={(e) => { e.stopPropagation(); handleMatchClick('schedule', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }} title="Cambiar fecha/hora"><Calendar size={14} /></button>
                                                                                        <button className="action-icon schedule" onClick={(e) => { e.stopPropagation(); handleMatchClick('court', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }} title="Asignar pista" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><MapPin size={14} /></button>
                                                                                        <button className="action-icon result" onClick={(e) => { e.stopPropagation(); handleMatchClick('result', match.homeId, match.awayId, match.id, match.result, match.date, match.court); }} title="Registrar resultado"><Trophy size={14} /></button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {roundKey !== 'final' && <div className={`connector connector-semi connector-semi-${(idx % 2) + 1}`}></div>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                                            Configura los clasificados arriba para generar el cuadro de la fase final.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

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
                maxCourts={maxCourts}
            />
        </div>
    );
}