import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (auth: boolean) => void;
    logout: () => void;
    refreshGoogleToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessTokenState] = useState<string | null>(
        () => sessionStorage.getItem('accessToken')
    );
    const [isAuthenticated, setIsAuthenticatedState] = useState(
        () => sessionStorage.getItem('isAuthenticated') === 'true'
    );

    const setAccessToken = (token: string | null) => {
        if (token) sessionStorage.setItem('accessToken', token);
        else sessionStorage.removeItem('accessToken');
        setAccessTokenState(token);
    };

    const setIsAuthenticated = (auth: boolean) => {
        if (auth) sessionStorage.setItem('isAuthenticated', 'true');
        else sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticatedState(auth);
    };

    // Nueva función para gestionar el cierre de sesión completo
    const logout = () => {
        // 1. Intentar revocar el token en los servidores de Google
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2 && accessToken) {
            try {
                // Forzamos el tipado a 'any' para evitar el error del compilador TS
                (google.accounts.oauth2 as any).revoke(accessToken, () => {
                    console.log('Token revocado en Google');
                });
            } catch (e) {
                console.warn('No se pudo revocar el token de Google', e);
            }
        }

        // 2. Limpiar los estados de React
        setAccessTokenState(null);
        setIsAuthenticatedState(false);

        // 3. Limpiar toda la memoria de sesión y local del navegador
        sessionStorage.clear();
        localStorage.clear();

        // 4. Redirigir a la página principal / login
        window.location.href = '/';
    };

    const refreshGoogleToken = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                reject(new Error('Google Identity Services library not loaded.'));
                return;
            }

            const client = google.accounts.oauth2.initTokenClient({
                client_id: (import.meta as any).env?.GOOGLE_CLIENT_ID || '',
                scope: 'https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
                callback: (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                    } else if (response.access_token) {
                        setAccessToken(response.access_token);
                        resolve(response.access_token);
                    } else {
                        reject(new Error('No access token received.'));
                    }
                },
            });

            // Prompt vacío intenta hacer silent flow
            client.requestAccessToken({ prompt: '' });
        });
    };

    return (
        // Exponemos la función logout y refresh en el Provider
        <AuthContext.Provider value={{ accessToken, setAccessToken, isAuthenticated, setIsAuthenticated, logout, refreshGoogleToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}