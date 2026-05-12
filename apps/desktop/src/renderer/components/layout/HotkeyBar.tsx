const hotkeys = [
  { key: "F1", label: "Buscar" },
  { key: "F2", label: "Cliente" },
  { key: "F3", label: "Cantidad" },
  { key: "F4", label: "Precio" },
  { key: "F5", label: "Espera" },
  { key: "F6", label: "Recuperar" },
  { key: "F7", label: "Reimprimir" },
  { key: "F8", label: "Descuento" },
  { key: "F9", label: "Devolver" },
  { key: "F10", label: "Apartado" },
  { key: "F11", label: "Cotizar" },
  { key: "F12", label: "Cobrar" },
];

export function HotkeyBar() {
  return (
    <footer className="h-10 bg-pos-card border-t border-slate-700 flex items-center px-2 gap-1">
      {hotkeys.map((hk) => (
        <div
          key={hk.key}
          className="flex items-center gap-1 px-2 py-1 text-xs text-pos-muted"
        >
          <kbd className="bg-pos-active px-1.5 py-0.5 rounded text-pos-text font-mono text-[10px]">
            {hk.key}
          </kbd>
          <span>{hk.label}</span>
        </div>
      ))}
    </footer>
  );
}
