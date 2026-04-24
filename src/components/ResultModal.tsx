import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import './ResultModal.css';

interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (result: string) => void;
    initialResult?: string;
    team1: string;
    team2: string;
}

type SetResult = { t1: string; t2: string };

export default function ResultModal({ isOpen, onClose, onSave, initialResult, team1, team2 }: ResultModalProps) {
    const [sets, setSets] = useState<SetResult[]>([
        { t1: '', t2: '' }, { t1: '', t2: '' }, { t1: '', t2: '' }
    ]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (initialResult) {
                const parsed = initialResult.split(' / ').map(s => {
                    const [t1, t2] = s.split('-');
                    return { t1: t1 || '', t2: t2 || '' };
                });
                while (parsed.length < 3) parsed.push({ t1: '', t2: '' });
                setSets(parsed.slice(0, 3));
            } else {
                setSets([
                    { t1: '', t2: '' }, { t1: '', t2: '' }, { t1: '', t2: '' }
                ]);
            }
        }
    }, [isOpen, initialResult]);

    if (!isOpen) return null;

    const handleSetChange = (index: number, team: 't1' | 't2', value: string) => {
        const newSets = [...sets];
        newSets[index][team] = value;
        setSets(newSets);
        if (error) setError('');
    };

    const handleSave = () => {
        // Validaciones estructurales básicas
        const isSetFilled = (s: SetResult) => s.t1 !== '' && s.t2 !== '';
        const isSetEmpty = (s: SetResult) => s.t1 === '' && s.t2 === '';

        // Validación matemática del set (Reglas de Tenis/Pádel)
        const isValidSet = (t1Str: string, t2Str: string) => {
            const t1 = parseInt(t1Str, 10);
            const t2 = parseInt(t2Str, 10);

            // Rechaza valores no numéricos y empates
            if (isNaN(t1) || isNaN(t2) || t1 === t2) return false;

            const max = Math.max(t1, t2);
            const min = Math.min(t1, t2);

            // Sets estándar (6-0 a 6-4)
            if (max === 6 && min <= 4) return true;

            // Sets con alargue o tie-break (7-5 o 7-6)
            if (max === 7 && (min === 5 || min === 6)) return true;

            return false;
        };

        const getWinner = (s: SetResult) => parseInt(s.t1, 10) > parseInt(s.t2, 10) ? 1 : 2;

        // Comprobaciones secuenciales rigurosas
        if (!isSetFilled(sets[0]) || !isSetFilled(sets[1])) {
            setError('Los dos primeros sets son obligatorios.');
            return;
        }

        if (!isValidSet(sets[0].t1, sets[0].t2)) {
            setError('Set 1 inválido. Formatos permitidos: 6-X (donde X ≤ 4), 7-5 o 7-6.');
            return;
        }

        if (!isValidSet(sets[1].t1, sets[1].t2)) {
            setError('Set 2 inválido. Formatos permitidos: 6-X (donde X ≤ 4), 7-5 o 7-6.');
            return;
        }

        const winner1 = getWinner(sets[0]);
        const winner2 = getWinner(sets[1]);

        if (!isSetEmpty(sets[2])) {
            if (!isSetFilled(sets[2])) {
                setError('El Set 3 está incompleto. Rellena ambos valores o borra su contenido.');
                return;
            }
            if (!isValidSet(sets[2].t1, sets[2].t2)) {
                setError('Set 3 inválido. Formatos permitidos: 6-X (donde X ≤ 4), 7-5 o 7-6.');
                return;
            }
            if (winner1 === winner2) {
                setError('Error lógico: El partido ya se definió en 2 sets. Elimina el tercer set.');
                return;
            }
        } else {
            if (winner1 !== winner2) {
                setError('Empate en el partido (1-1). Es obligatorio registrar el resultado del Set 3.');
                return;
            }
        }

        const resultParts = [];
        resultParts.push(`${sets[0].t1}-${sets[0].t2}`);
        resultParts.push(`${sets[1].t1}-${sets[1].t2}`);
        if (!isSetEmpty(sets[2])) {
            resultParts.push(`${sets[2].t1}-${sets[2].t2}`);
        }

        onSave(resultParts.join(' / '));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Registrar Resultado</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {error && (
                        <div className="modal-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="match-teams">
                        <div className="team-name">{team1}</div>
                        <div className="vs-badge">VS</div>
                        <div className="team-name">{team2}</div>
                    </div>

                    <div className="sets-container">
                        {[0, 1, 2].map((idx) => (
                            <div key={idx} className="set-row">
                                <span className="set-label">Set {idx + 1}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="7"
                                    value={sets[idx].t1}
                                    onChange={(e) => handleSetChange(idx, 't1', e.target.value)}
                                    placeholder="-"
                                    className="set-input"
                                />
                                <span className="set-divider">-</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="7"
                                    value={sets[idx].t2}
                                    onChange={(e) => handleSetChange(idx, 't2', e.target.value)}
                                    placeholder="-"
                                    className="set-input"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <button
                        className="delete-btn-text"
                        onClick={() => onSave('')}
                        style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Eliminar Resultado
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="cancel-btn" onClick={onClose}>Cancelar</button>
                        <button className="save-btn" onClick={handleSave}>Guardar Resultado</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
