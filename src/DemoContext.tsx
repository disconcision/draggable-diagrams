import { createContext, ReactNode, useContext, useState } from "react";

export type DemoSettings = {
  showTreeView: boolean;
  showDropZones: boolean;
  showDebugOverlay: boolean;
  showStateViewer: boolean;
};

const defaultSettings: DemoSettings = {
  showTreeView: false,
  showDropZones: false,
  showDebugOverlay: false,
  showStateViewer: false,
};

const DemoContext = createContext<DemoSettings>(defaultSettings);

export const DemoProvider = DemoContext.Provider;
export const useDemoSettings = () => useContext(DemoContext);

export function DemoSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DemoSettings>(defaultSettings);
  return (
    <DemoProvider value={settings}>
      <SettingsPanel settings={settings} setSettings={setSettings} />
      {children}
    </DemoProvider>
  );
}

function SettingsPanel({
  settings,
  setSettings,
}: {
  settings: DemoSettings;
  setSettings: React.Dispatch<React.SetStateAction<DemoSettings>>;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex flex-col gap-2 text-sm text-slate-600 select-none">
      {(
        [
          ["showTreeView", "Tree view"],
          ["showDropZones", "Drop zones"],
          ["showDebugOverlay", "Debug overlay"],
          ["showStateViewer", "State viewer"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings[key]}
            onChange={(e) =>
              setSettings((s) => ({ ...s, [key]: e.target.checked }))
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}
