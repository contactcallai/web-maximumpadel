import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import './ResultModal.css'; // Reusing common modal styles

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: string) => void;
    initialSchedule?: string;
    team1: string;
    team2: string;
}

export default function ScheduleModal({ isOpen, onClose, onSave, initialSchedule, team1, team2 }: ScheduleModalProps) {
    const [dateTime, setDateTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialSchedule && initialSchedule.includes('T')) {
                setDateTime(initialSchedule);
            } else {
                setDateTime('');
            }
        }
    }, [isOpen, initialSchedule]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(dateTime);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Programar Encuentro</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="match-teams">
                        <div className="team-name">{team1}</div>
                        <div className="vs-badge">VS</div>
                        <div className="team-name">{team2}</div>
                    </div>

                    <div className="modal-section">
                        <h4 className="section-subtitle">Ajustar Horario y Pista</h4>
                        <div className="schedule-inputs-row">
                            <div className="input-group" style={{ flex: 1 }}>
                                <label>
                                    <Calendar size={14} style={{ marginRight: '4px' }} />
                                    Fecha y Hora del Partido
                                </label>
                                <input 
                                    type="datetime-local" 
                                    value={dateTime} 
                                    onChange={(e) => setDateTime(e.target.value)}
                                    className="datetime-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancelar</button>
                    <button className="save-btn" onClick={handleSave}>Guardar Horario</button>
                </div>
            </div>
        </div>
    );
}
