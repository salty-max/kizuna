import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { DatasetProvider } from "@/data/DatasetContext";
import { BuilderPage } from "@/pages/BuilderPage";
import { WikiAbilitiesPage } from "@/pages/wiki/WikiAbilitiesPage";
import { WikiAbilityDetailPage } from "@/pages/wiki/WikiAbilityDetailPage";
import { WikiBondDetailPage } from "@/pages/wiki/WikiBondDetailPage";
import { WikiBondsPage } from "@/pages/wiki/WikiBondsPage";
import { WikiEquipmentDetailPage } from "@/pages/wiki/WikiEquipmentDetailPage";
import { WikiEquipmentPage } from "@/pages/wiki/WikiEquipmentPage";
import { WikiHomePage } from "@/pages/wiki/WikiHomePage";
import { WikiPassiveDetailPage } from "@/pages/wiki/WikiPassiveDetailPage";
import { WikiPassivesPage } from "@/pages/wiki/WikiPassivesPage";
import { WikiPlayerDetailPage } from "@/pages/wiki/WikiPlayerDetailPage";
import { WikiPlayersPage } from "@/pages/wiki/WikiPlayersPage";
import { WikiTacticDetailPage } from "@/pages/wiki/WikiTacticDetailPage";
import { WikiTacticsPage } from "@/pages/wiki/WikiTacticsPage";

/**
 * App shell: top chrome + routes.
 *
 * Builder keeps the team share hash (`#c=KZ1…`) on `/`. Wiki lives under
 * `/wiki/*` so the two never fight over the URL.
 */
export default function App() {
  return (
    <BrowserRouter>
      <DatasetProvider>
        <div className="mx-auto flex h-dvh max-w-[1600px] flex-col gap-2 overflow-hidden p-4">
          <TopBar />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </DatasetProvider>
    </BrowserRouter>
  );
}
