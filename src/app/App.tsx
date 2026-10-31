import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { FEATURES } from './features';
import SettingsMenu from './SettingsMenu';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-egg">🥚</span> Dofus Tools
        </div>
        <nav className="tabs">
          {FEATURES.map((f) => (
            <NavLink key={f.path} to={`/${f.path}`} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
              <span aria-hidden>{f.icon}</span> {f.label}
            </NavLink>
          ))}
        </nav>
        <SettingsMenu />
      </header>
      <main className="content">
        <Routes>
          {FEATURES.map((f) => (
            <Route key={f.path} path={`/${f.path}/*`} element={<f.component />} />
          ))}
          <Route path="*" element={<Navigate to={`/${FEATURES[0].path}`} replace />} />
        </Routes>
      </main>
      <footer className="footer">
        Données du jeu : <a href="https://docs.dofusdu.de" target="_blank" rel="noreferrer">dofusdu.de</a> et <a href="https://dofusdb.fr" target="_blank" rel="noreferrer">DofusDB</a> · Dofus est une marque
        d'Ankama, ce projet n'est pas affilié. Vos données restent sur votre PC.
      </footer>
    </div>
  );
}
