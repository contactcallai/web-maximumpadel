import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Extraemos la función de logout del contexto de autenticación
    // (Asegúrate de que tu AuthContext exporta una función 'logout' o ajusta el nombre)
    const { logout } = useAuth() as any;

    // Efecto para cerrar el menú si el usuario hace clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setIsDropdownOpen(false);

        if (typeof logout === 'function') {
            logout(); // Ejecuta la limpieza de Google desde tu AuthContext
        } else {
            // Fallback: Si no tienes función logout, limpiamos el token de memoria y recargamos
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <header className="main-header">
            {onMenuClick && (
                <button className="mobile-menu-btn" onClick={onMenuClick}>
                    <Menu size={24} />
                </button>
            )}
            <div className="header-actions">

                {/* Contenedor del Avatar y el Menú Desplegable */}
                <div className="user-menu-container" ref={dropdownRef} style={{ position: 'relative' }}>
                    <div
                        className="user-avatar"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        <User size={20} />
                    </div>

                    {/* Menú Desplegable */}
                    {isDropdownOpen && (
                        <div className="user-dropdown" style={{
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            right: 0,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            minWidth: '160px',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LogOut size={16} />
                                Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}