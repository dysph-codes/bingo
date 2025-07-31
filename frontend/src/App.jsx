import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header>
        <div className="brand">
          <div className="dot" />
          <span>Bingo</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Game
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Settings
          </NavLink>
        </nav>
      </header>
      <main className="container flex-1 py-6">
        <Outlet />
      </main>
      <footer>
        Modern Bingo • no persistence beyond session
      </footer>
    </div>
  );
}
