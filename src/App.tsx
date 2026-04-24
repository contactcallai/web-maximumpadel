import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import MatchOrder from './pages/MatchOrder'
import Inventory from './pages/Inventory'
import Cuadros from './pages/Cuadros'
import { AuthProvider, useAuth } from './context/AuthContext'

// Placeholder components for routes

function AppContent() {
    const { isAuthenticated, setAccessToken, setIsAuthenticated } = useAuth()

    const handleLoginSuccess = (token: string) => {
        setAccessToken(token)
        setIsAuthenticated(true)
    }

    if (!isAuthenticated) {
        return <Login onLogin={handleLoginSuccess} />
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Panel />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="match-order" element={<MatchOrder />} />
                    <Route path="cuadros" element={<Cuadros />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
