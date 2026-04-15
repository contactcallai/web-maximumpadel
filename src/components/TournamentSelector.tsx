import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import './TournamentSelector.css';

interface Tournament {
    id: string;
    name: string;
}

interface TournamentSelectorProps {
    tournaments: Tournament[];
    activeTournamentId: string;
    onTournamentChange: (id: string) => void;
    preTitle?: string;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export default function TournamentSelector({
    tournaments,
    activeTournamentId,
    onTournamentChange,
    preTitle,
    title,
    subtitle,
    children
}: TournamentSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeTournament = tournaments.find(t => t.id === activeTournamentId) || tournaments[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="hero-header-card">
            <div className="hero-header-left">
                {preTitle && <span className="hero-pre-title">{preTitle}</span>}
                {title && <h1 className="hero-main-title">{title}</h1>}
                {subtitle && <p className="hero-subtitle-desc">{subtitle}</p>}
                
                <div className="tc-selector-wrapper" ref={dropdownRef}>
                    <button
                        className="tc-selector-trigger"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <span className="tc-selected-name">{activeTournament?.name}</span>
                        <ChevronDown size={18} className={`tc-chevron ${isOpen ? 'open' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="tc-dropdown-list">
                            {tournaments.map(t => (
                                <button
                                    key={t.id}
                                    className={`tc-dropdown-choice ${t.id === activeTournamentId ? 'active' : ''}`}
                                    onClick={() => {
                                        onTournamentChange(t.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {children && (
                <div className="hero-header-right">
                    {children}
                </div>
            )}
        </div>
    );
}
