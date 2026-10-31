import { useRef, useState } from 'react';
import { downloadText, exportAll, importAll } from '../lib/backup';

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    try {
      importAll(await file.text());
      window.location.reload();
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  return (
    <div className="settings">
      <button className="btn ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ⚙️ Données
      </button>
      {open && (
        <div className="menu" onMouseLeave={() => setOpen(false)}>
          <button
            className="menu-item"
            onClick={() => downloadText(`dofus-tools-${new Date().toISOString().slice(0, 10)}.json`, exportAll())}
          >
            Exporter une sauvegarde
          </button>
          <button className="menu-item" onClick={() => fileRef.current?.click()}>
            Importer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
      )}
    </div>
  );
}
