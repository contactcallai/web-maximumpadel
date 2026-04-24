import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import './ResultModal.css'; // Usamos el mismo CSS base

interface CourtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (court: string) => void;
    initialCourt?: string;
    team1: string;
    team2: string;
    maxCourts?: number;
}

export default function CourtModal({ isOpen, onClose, onSave, initialCourt, team1, team2, maxCourts = 5 }: CourtModalProps) {
    const [courtInput, setCourtInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCourtInput(initialCourt && initialCourt !== 'TBD' ? initialCourt : '');
        }
    }, [isOpen, initialCourt]);

    if (!isOpen) return null;

    // Generar array dinámico de pistas (del 1 al maxCourts)
    const courtOptions = Array.from({ length: maxCourts }, (_, i) => `${i + 1}`);

    // Helper para comprobar visualmente si un botón está activo
    const isActive = (val: string) => {
        const inputLower = courtInput.toLowerCase().trim();
        const valLower = val.toLowerCase().trim();
        return inputLower === valLower || inputLower === `pista ${valLower}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Asignar Pista</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="match-teams">
                        <div className="team-name" style={{ textAlign: 'right' }}>{team1}</div>
                        <div className="vs-badge">VS</div>
                        <div className="team-name" style={{ textAlign: 'left' }}>{team2}</div>
                    </div>

                    <div className="modal-section">
                        <div className="section-subtitle">SELECCIONA UNA PISTA</div>
                        <div className="court-grid">
                            {/* BOTONES DINÁMICOS */}
                            {courtOptions.map(num => (
                                <button
                                    key={num}
                                    className={`court-option ${isActive(num) ? 'active' : ''}`}
                                    onClick={() => setCourtInput(num)}
                                >
                                    <MapPin size={16} /> Pista {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-section" style={{ marginTop: '24px' }}>
                        <div className="section-subtitle">O escribe el identificador de pista</div>
                        <input
                            type="text"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: '#f8fafc',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            placeholder="Ej: Pista TBD"
                            value={courtInput}
                            onChange={(e) => setCourtInput(e.target.value)}
                            onFocus={(e) => e.target.style.backgroundColor = 'white'}
                            onBlur={(e) => e.target.style.backgroundColor = '#f8fafc'}
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <button
                        className="delete-btn-text"
                        onClick={() => onSave('TBD')}
                        style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: '8px' }}
                    >
                        Eliminar Pista
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="cancel-btn" onClick={onClose}>Cancelar</button>
                        <button className="save-btn" onClick={() => onSave(courtInput || 'TBD')}>Confirmar Pista</button>
                    </div>
                </div>
            </div>
        </div>
    );
}