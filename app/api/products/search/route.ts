import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { metorikGet, metorikConfigured } from "@/lib/metorik";

export const dynamic = "force-dynamic";

type Product = {
  name: string;
  sku: string;
  image: string | null;
  price: string | null;
  stock: number | null;
};

// Products in the search response are objects carrying both sku and title.
// Collect them wherever they sit (the response wraps results by resource).
function extractProducts(node: unknown, out: Product[]): void {
  if (Array.isArray(node)) {
    for (const x of node) extractProducts(x, out);
    return;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.sku === "string" && o.sku && typeof o.title === "string") {
      out.push({
        name: o.title,
        sku: o.sku,
        image: typeof o.image === "string" ? o.image : null,
        price:
          typeof o.regular_price === "string" && o.regular_price !== "0.00"
            ? o.regular_price
            : typeof o.current_price === "string"
              ? o.current_price
              : null,
        stock: typeof o.stock_quantity === "number" ? o.stock_quantity : null,
      });
      return; // don't descend into a matched product
    }
    for (const v of Object.values(o)) extractProducts(v, out);
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  if (!metorikConfigured()) return NextResponse.json({ products: [] });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ products: [] });

  let res: Response;
  try {
    res = await metorikGet("/search", { resource: "products", query: q, count: 12 });
  } catch {
    return NextResponse.json({ products: [] });
  }
  if (!res.ok) return NextResponse.json({ products: [] });

  const all: Product[] = [];
  try {
    extractProducts(await res.json(), all);
  } catch {
    return NextResponse.json({ products: [] });
  }

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const p of all) {
    if (seen.has(p.sku)) continue;
    seen.add(p.sku);
    products.push(p);
    if (products.length >= 12) break;
  }

  return NextResponse.json({ products });
}
