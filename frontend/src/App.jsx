import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-500">
        <h1 className="text-2xl font-bold">🟣 Bingo</h1>
        <nav className="space-x-4">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'underline' : ''}>
            Game
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'underline' : ''}>
            Settings
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <footer className="text-center py-2 text-sm">
        Modern Bingo • no persistence beyond session
      </footer>
    </div>
  );
}
