import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ListOrdered, LayoutGrid } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
    { path: '/', label: 'Panel', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventario', icon: Package },
    { path: '/match-order', label: 'Orden de Juego', icon: ListOrdered },
    { path: '/cuadros', label: 'Gestión de Cuadros', icon: LayoutGrid },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container">
                    <img src="/koala-logo.png" alt="Koala Virtual Logo" className="logo-img" />
                    <span className="logo-text">Koala Virtual</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <Icon className="nav-icon" size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
