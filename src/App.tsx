import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import MatchOrder from './pages/MatchOrder'
import Inventory from './pages/Inventory'
import Cuadros from './pages/Cuadros'

// Placeholder components for routes

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    if (!isAuthenticated) {
        return <Login onLogin={() => setIsAuthenticated(true)} />
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

export default App
