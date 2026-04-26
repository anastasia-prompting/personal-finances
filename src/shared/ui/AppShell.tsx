import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center py-1 text-xs ${isActive ? "text-sky-400" : "text-slate-400"}`;

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideNav = pathname.startsWith("/operation");
  return (
    <div className="flex min-h-dvh flex-col">
      <main className={`flex-1 px-3 pb-4 pt-2 ${hideNav ? "" : "pb-20"}`}>
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="safe-pb fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-lg items-stretch">
            <NavLink to="/" className={linkClass} end>
              <span>Главная</span>
            </NavLink>
            <NavLink to="/journal" className={linkClass}>
              <span>Журнал</span>
            </NavLink>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center"
              onClick={() => void navigate("/operation")}
              aria-label="Добавить операцию"
            >
              <span className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-lg font-semibold text-slate-900 shadow">＋</span>
            </button>
            <NavLink to="/funds" className={linkClass}>
              <span>Фонды</span>
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              <span>Настр.</span>
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  );
}
