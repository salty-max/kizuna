import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";

import { Footer } from "@/components/Footer";
import { RouteHeading, RouteMetadata } from "@/components/RouteMetadata";
import { TopBar } from "@/components/TopBar";
import { DatasetProvider } from "@/data/DatasetContext";
import { useI18n } from "@/i18n";
import { BuilderPage } from "@/pages/BuilderPage";

const WikiAbilitiesPage = lazy(() =>
  import("@/pages/wiki/WikiAbilitiesPage").then((module) => ({
    default: module.WikiAbilitiesPage,
  })),
);
const WikiAbilityDetailPage = lazy(() =>
  import("@/pages/wiki/WikiAbilityDetailPage").then((module) => ({
    default: module.WikiAbilityDetailPage,
  })),
);
const WikiBondDetailPage = lazy(() =>
  import("@/pages/wiki/WikiBondDetailPage").then((module) => ({
    default: module.WikiBondDetailPage,
  })),
);
const WikiBondsPage = lazy(() =>
  import("@/pages/wiki/WikiBondsPage").then((module) => ({ default: module.WikiBondsPage })),
);
const WikiLocationDetailPage = lazy(() =>
  import("@/pages/wiki/WikiLocationDetailPage").then((module) => ({
    default: module.WikiLocationDetailPage,
  })),
);
const WikiLocationsPage = lazy(() =>
  import("@/pages/wiki/WikiLocationsPage").then((module) => ({
    default: module.WikiLocationsPage,
  })),
);
const WikiEquipmentDetailPage = lazy(() =>
  import("@/pages/wiki/WikiEquipmentDetailPage").then((module) => ({
    default: module.WikiEquipmentDetailPage,
  })),
);
const WikiEquipmentPage = lazy(() =>
  import("@/pages/wiki/WikiEquipmentPage").then((module) => ({
    default: module.WikiEquipmentPage,
  })),
);
const WikiHomePage = lazy(() =>
  import("@/pages/wiki/WikiHomePage").then((module) => ({ default: module.WikiHomePage })),
);
const WikiPassiveDetailPage = lazy(() =>
  import("@/pages/wiki/WikiPassiveDetailPage").then((module) => ({
    default: module.WikiPassiveDetailPage,
  })),
);
const WikiPassivesPage = lazy(() =>
  import("@/pages/wiki/WikiPassivesPage").then((module) => ({
    default: module.WikiPassivesPage,
  })),
);
const WikiPlayerDetailPage = lazy(() =>
  import("@/pages/wiki/WikiPlayerDetailPage").then((module) => ({
    default: module.WikiPlayerDetailPage,
  })),
);
const WikiPlayersPage = lazy(() =>
  import("@/pages/wiki/WikiPlayersPage").then((module) => ({
    default: module.WikiPlayersPage,
  })),
);
const WikiTacticDetailPage = lazy(() =>
  import("@/pages/wiki/WikiTacticDetailPage").then((module) => ({
    default: module.WikiTacticDetailPage,
  })),
);
const WikiTacticsPage = lazy(() =>
  import("@/pages/wiki/WikiTacticsPage").then((module) => ({
    default: module.WikiTacticsPage,
  })),
);

/**
 * App shell: top chrome + routes.
 *
 * Builder keeps the team share hash (`#c=KZ1…`) on `/`. Wiki lives under
 * `/wiki/*` so the two never fight over the URL.
 */
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DatasetProvider>
        <AppFrame />
      </DatasetProvider>
    </BrowserRouter>
  );
}

let previousPath: string | null = null;
let routeAwaitingFocus: string | null = null;

function AppFrame() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (previousPath !== null && previousPath !== pathname) routeAwaitingFocus = pathname;
    previousPath = pathname;
    const frame = window.requestAnimationFrame(() => {
      const main = mainRef.current;
      if (routeAwaitingFocus === pathname && main && document.contains(main)) {
        main.focus();
        routeAwaitingFocus = null;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col gap-2 p-2 lg:p-4 xl:h-dvh xl:overflow-hidden">
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[110] -translate-y-20 border-2 border-bolt-400 bg-ink-950 px-3 py-2 font-display text-sm font-bold text-bolt-400 uppercase italic no-underline focus:translate-y-0"
      >
        {t("nav.skipContent")}
      </a>
      <TopBar />
      <RouteMetadata />
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 outline-none"
      >
        <RouteHeading />
        <Suspense
          fallback={
            <p
              role="status"
              className="flex-1 py-8 text-center font-display text-sm font-bold tracking-wide text-ink-500 uppercase italic"
            >
              …
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<BuilderPage />} />
            <Route path="/wiki" element={<WikiHomePage />} />
            <Route path="/wiki/abilities" element={<WikiAbilitiesPage />} />
            <Route path="/wiki/abilities/:id" element={<WikiAbilityDetailPage />} />
            <Route path="/wiki/equipment" element={<WikiEquipmentPage />} />
            <Route path="/wiki/equipment/:id" element={<WikiEquipmentDetailPage />} />
            <Route path="/wiki/tactics" element={<WikiTacticsPage />} />
            <Route path="/wiki/tactics/:id" element={<WikiTacticDetailPage />} />
            <Route path="/wiki/players" element={<WikiPlayersPage />} />
            <Route path="/wiki/players/:id" element={<WikiPlayerDetailPage />} />
            <Route path="/wiki/passives" element={<WikiPassivesPage />} />
            <Route path="/wiki/passives/:id" element={<WikiPassiveDetailPage />} />
            <Route path="/wiki/bonds" element={<WikiBondsPage />} />
            <Route path="/wiki/bonds/:id" element={<WikiBondDetailPage />} />
            <Route path="/wiki/locations" element={<WikiLocationsPage />} />
            <Route path="/wiki/locations/:id" element={<WikiLocationDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer className="xl:hidden" />
    </div>
  );
}
