import { Bell, Settings, User } from 'lucide-react';
import './Header.css';

export default function Header() {
    return (
        <header className="main-header">
            <div className="header-actions">
                <button className="icon-btn">
                    <Bell size={20} />
                </button>
                <button className="icon-btn">
                    <Settings size={20} />
                </button>
                <div className="user-avatar">
                    <User size={20} />
                </div>
            </div>
        </header>
    );
}
