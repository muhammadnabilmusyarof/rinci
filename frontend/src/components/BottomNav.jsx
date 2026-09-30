import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
    <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875ZM9.75 17.25a.75.75 0 0 0-1.5 0V18a.75.75 0 0 0 1.5 0v-.75Zm2.25-3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0V18a.75.75 0 0 0 1.5 0v-4.5Z" clipRule="evenodd" />
    <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
  </svg>
);

const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625Z" />
    <path d="M2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625Z" />
    <path d="M5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

export default function BottomNav() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-50">
      <div className="flex items-center justify-around px-2 py-1 pb-safe">

        {/* Beranda */}
        <NavLink
          to="/"
          end
          id="nav-home"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          <HomeIcon />
          <span className="text-[10px]">Beranda</span>
        </NavLink>

        {/* Riwayat */}
        <NavLink
          to="/riwayat"
          id="nav-history"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          <HistoryIcon />
          <span className="text-[10px]">Riwayat</span>
        </NavLink>

        {/* Catat (tombol utama) */}
        <button
          id="nav-add"
          onClick={() => navigate('/tambah')}
          className="flex flex-col items-center -mt-5 group"
        >
          <span className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white group-active:scale-95 transition-transform">
            <PlusIcon />
          </span>
          <span className="text-[10px] mt-1 text-gray-400">Catat</span>
        </button>

        {/* Dompet */}
        <NavLink
          to="/dompet"
          id="nav-wallet"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          <WalletIcon />
          <span className="text-[10px]">Dompet</span>
        </NavLink>

        {/* Keluar */}
        <button
          id="nav-logout"
          onClick={() => {
            if (window.confirm('Keluar dari aplikasi?')) logout();
          }}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogoutIcon />
          <span className="text-[10px]">Keluar</span>
        </button>

      </div>
    </nav>
  );
}
