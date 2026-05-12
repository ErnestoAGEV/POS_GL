import { useState, useEffect } from "react";
import { Search, Package } from "lucide-react";
import { formatCurrency } from "../../lib/format";

export function ProductsTab() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (search?: string) => {
    const result = await window.api.inventory.products(search);
    setProducts(result);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    loadProducts(value);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted"
            size={18}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar producto por nombre o SKU..."
            className="w-full bg-pos-card border border-slate-700 text-pos-text placeholder:text-slate-500 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex items-center justify-center h-full text-pos-muted">
            <div className="text-center">
              <Package size={48} className="mx-auto mb-2 opacity-50" />
              <p>No hay productos</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-pos-card border-b border-slate-700">
              <tr className="text-pos-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Producto</th>
                <th className="text-left py-3 px-4 w-28">SKU</th>
                <th className="text-left py-3 px-4 w-36">Codigo Barras</th>
                <th className="text-right py-3 px-4 w-28">Costo</th>
                <th className="text-right py-3 px-4 w-28">Precio</th>
                <th className="text-center py-3 px-4 w-20">Activo</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-800 hover:bg-pos-active/50 transition-colors"
                >
                  <td className="py-3 px-4 text-pos-text font-medium">
                    {p.nombre}
                  </td>
                  <td className="py-3 px-4 text-pos-muted text-sm">
                    {p.sku || "\u2014"}
                  </td>
                  <td className="py-3 px-4 text-pos-muted text-sm font-mono">
                    {p.codigoBarras || "\u2014"}
                  </td>
                  <td className="py-3 px-4 text-right text-pos-muted tabular-nums">
                    {formatCurrency(p.costo)}
                  </td>
                  <td className="py-3 px-4 text-right text-pos-green font-medium tabular-nums">
                    {formatCurrency(p.precioVenta)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        p.activo ? "bg-pos-green" : "bg-pos-red"
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
