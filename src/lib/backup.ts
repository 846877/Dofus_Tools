/** Export / import de toutes les données locales de l'application (clés préfixées). */
const PREFIX = 'dofus-tools:';
const API_CACHE = 'dofus-tools:api:';

export function exportAll(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX) && !k.startsWith(API_CACHE)) data[k] = JSON.parse(localStorage.getItem(k)!);
  }
  return JSON.stringify({ app: 'dofus-tools', exportedAt: new Date().toISOString(), data }, null, 2);
}

export function importAll(json: string) {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown> };
  if (parsed.app !== 'dofus-tools' || !parsed.data) throw new Error('Fichier de sauvegarde invalide');
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k.startsWith(PREFIX)) localStorage.setItem(k, JSON.stringify(v));
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
