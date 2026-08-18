"use client";

import { useEffect, useRef, useState } from "react";

export type SelectedProduct = { name: string; sku: string; quantity: number };

type Product = {
  name: string;
  sku: string;
  image: string | null;
  price: string | null;
  stock: number | null;
};

export function ProductPicker({
  value,
  onChange,
}: {
  value: SelectedProduct[];
  onChange: (next: SelectedProduct[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.products ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function add(p: Product) {
    const existing = value.find((v) => v.sku === p.sku);
    if (existing) {
      onChange(value.map((v) => (v.sku === p.sku ? { ...v, quantity: v.quantity + 1 } : v)));
    } else {
      onChange([...value, { name: p.name, sku: p.sku, quantity: 1 }]);
    }
    setQ("");
    setResults([]);
    setOpen(false);
  }

  function setQty(sku: string, qty: number) {
    onChange(
      value.map((v) => (v.sku === sku ? { ...v, quantity: Math.max(1, qty || 1) } : v)),
    );
  }

  function remove(sku: string) {
    onChange(value.filter((v) => v.sku !== sku));
  }

  return (
    <div ref={boxRef} className="prodpick">
      <div className="prodpick-search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search a product by SKU or name"
        />
        {open && (loading || results.length > 0) && (
          <div className="prodpick-results">
            {loading && results.length === 0 ? (
              <div className="prodpick-empty">Searching...</div>
            ) : (
              results.map((p) => (
                <button
                  type="button"
                  key={p.sku}
                  className="prodpick-item"
                  onClick={() => add(p)}
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="prodpick-img" />
                  ) : (
                    <span className="prodpick-img" />
                  )}
                  <span className="prodpick-info">
                    <b>{p.name}</b>
                    <span className="sub">
                      {p.sku}
                      {p.price ? ` · £${p.price}` : ""}
                      {p.stock != null ? ` · ${p.stock} in stock` : ""}
                    </span>
                  </span>
                  <span className="prodpick-plus">＋</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="prodpick-selected">
          {value.map((v) => (
            <div className="prodpick-sel" key={v.sku}>
              <span className="prodpick-sel-name">
                {v.name} <span className="sub">{v.sku}</span>
              </span>
              <input
                type="number"
                min="1"
                value={v.quantity}
                onChange={(e) => setQty(v.sku, parseInt(e.target.value, 10))}
                className="prodpick-qty"
                aria-label={`Quantity for ${v.name}`}
              />
              <button type="button" className="btn-link" onClick={() => remove(v.sku)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
