import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import './ResultModal.css';

interface CourtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (court: string) => void;
    initialCourt?: string;
    team1: string;
    team2: string;
}

export default function CourtModal({ isOpen, onClose, onSave, initialCourt, team1, team2 }: CourtModalProps) {
    const [court, setCourt] = useState('');
    const courts = ['Pista 1', 'Pista 2', 'Pista 3', 'Pista 4', 'Pista 5', 'Pista Central'];

    useEffect(() => {
        if (isOpen) {
            setCourt(initialCourt || '');
        }
    }, [isOpen, initialCourt]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Asignar Pista</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="match-teams" style={{ marginBottom: '20px' }}>
                        <div className="team-name" style={{ fontSize: '0.9rem' }}>{team1}</div>
                        <div className="vs-badge">VS</div>
                        <div className="team-name" style={{ fontSize: '0.9rem' }}>{team2}</div>
                    </div>

                    <div className="modal-section">
                        <h4 className="section-subtitle">Selecciona una pista</h4>
                        <div className="court-grid">
                            {courts.map(c => (
                                <button 
                                    key={c}
                                    className={`court-option ${court === c ? 'active' : ''}`}
                                    onClick={() => setCourt(c)}
                                >
                                    <MapPin size={14} />
                                    {c}
                                </button>
                            ))}
                        </div>
                        
                        <div className="input-group" style={{ marginTop: '16px' }}>
                            <label>O escribe otra pista</label>
                            <input 
                                type="text" 
                                value={court} 
                                onChange={(e) => setCourt(e.target.value)}
                                placeholder="Ej: Pista 7 o Exterior"
                            />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancelar</button>
                    <button className="save-btn" onClick={() => onSave(court)}>Confirmar Pista</button>
                </div>
            </div>
        </div>
    );
}
