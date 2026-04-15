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
        const isValidValue = (val: string) => val !== '' && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 7;
        
        const isSetValid = (s: SetResult) => isValidValue(s.t1) && isValidValue(s.t2);
        const isSetEmpty = (s: SetResult) => s.t1 === '' && s.t2 === '';

        if (!isSetValid(sets[0]) || !isSetValid(sets[1])) {
            setError('Los dos primeros sets son obligatorios.');
            return;
        }

        if (!isSetEmpty(sets[2]) && !isSetValid(sets[2])) {
            setError('El tercer set debe estar completo o vacío.');
            return;
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
                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancelar</button>
                    <button className="save-btn" onClick={handleSave}>Guardar Resultado</button>
                </div>
            </div>
        </div>
    );
}
