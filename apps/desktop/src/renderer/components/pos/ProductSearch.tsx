import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useCartStore } from "../../stores/cart-store";

export function ProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      reqId.current += 1;
      const currentReqId = reqId.current;
      const products = await window.api.products.search(value);
      if (currentReqId !== reqId.current) return;
      setResults(products);
      setShowResults(products.length > 0);
    }, 250);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    try {
      if (e.key === "Enter" && query.trim()) {
        const product = await window.api.products.getByBarcode(query.trim());
        if (product) {
          addItem(product);
          setQuery("");
          setResults([]);
          setShowResults(false);
          return;
        }
        if (results.length > 0) {
          addItem(results[0]);
          setQuery("");
          setResults([]);
          setShowResults(false);
        }
      }
      if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setShowResults(false);
      }
    } catch (err) {
      console.error("handleKeyDown error:", err);
    }
  };

  const handleSelect = (product: any) => {
    addItem(product);
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Escanear código de barras o buscar producto..."
          className="w-full bg-pos-card border border-slate-700 text-pos-text placeholder:text-slate-500 pl-10 pr-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-pos-blue focus:border-transparent transition-colors duration-150"
        />
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-pos-card border border-slate-700 rounded-xl shadow-2xl z-40 max-h-64 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-pos-active transition-colors cursor-pointer border-b border-slate-800 last:border-0"
            >
              <div className="text-left">
                <div className="text-pos-text font-medium">{product.nombre}</div>
                <div className="text-pos-muted text-xs">
                  {product.sku && <span>SKU: {product.sku}</span>}
                  {product.codigoBarras && <span className="ml-3">CB: {product.codigoBarras}</span>}
                </div>
              </div>
              <div className="text-pos-green font-bold font-heading">
                ${product.precioVenta.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
