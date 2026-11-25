import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { TemaProvider } from './context/TemaContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EventosPage from './pages/EventosPage';
import EventoDetalhePage from './pages/EventoDetalhePage';
import EventoEdicaoPage from './pages/EventoEdicaoPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import AdminMembrosPage from './pages/AdminMembrosPage';
import SobrePage from './pages/SobrePage';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TemaProvider>
        <AdminProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="eventos" element={<EventosPage />} />
              <Route path="evento/:id" element={<EventoDetalhePage />} />
              <Route path="evento/:id/editar" element={<EventoEdicaoPage />} />
              <Route path="sobre" element={<SobrePage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="admin/membros" element={<AdminMembrosPage />} />
              <Route path="admin/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </AdminProvider>
      </TemaProvider>
    </BrowserRouter>
  </StrictMode>
);