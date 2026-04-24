import { useEffect, useRef } from 'react';
import './Login.css';

interface LoginProps {
    onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const clientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);

    useEffect(() => {
        const initializeClient = () => {
            if (window.google) {
                clientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.GOOGLE_CLIENT_ID || '',
                    scope: 'https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
                    callback: (response) => {
                        if (response.access_token) {
                            onLogin(response.access_token);
                        }
                    },
                });
            }
        };

        // If google is already loaded, initialize immediately
        if (window.google) {
            initializeClient();
        } else {
            // Otherwise, wait for the script to load (using the onload defined in index.html if we had one, 
            // but since it's async/defer, we can also check in handleGoogleLogin)
            const script = document.querySelector('script[src*="gsi/client"]');
            if (script) {
                script.addEventListener('load', initializeClient);
                return () => script.removeEventListener('load', initializeClient);
            }
        }
    }, [onLogin]);

    const handleGoogleLogin = () => {
        if (clientRef.current) {
            clientRef.current.requestAccessToken();
        } else {
            // Fallback initialization check
            if (window.google) {
                clientRef.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.GOOGLE_CLIENT_ID || '',
                    scope: 'https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
                    callback: (response) => {
                        if (response.access_token) {
                            onLogin(response.access_token);
                        }
                    },
                });
                clientRef.current.requestAccessToken();
            } else {
                alert('La librería de Google no ha cargado todavía. Por favor, espera un momento o refresca la página.');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-brand">
                <img src="/koala-logo.png" alt="Koala Virtual" className="login-logo-img" />
                <h1 className="login-logo-text">Koala Virtual</h1>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <h2>Bienvenido de nuevo</h2>
                    <p>Accede a tu panel de gestión</p>
                </div>

                <button className="google-btn" onClick={handleGoogleLogin}>
                    <svg className="google-icon" viewBox="0 0 24 24" y="0px" x="0px" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.06-2.85-2.22.81-.62z"></path>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                    </svg>
                    Continuar con Google
                </button>
            </div>
        </div>
    );
}
