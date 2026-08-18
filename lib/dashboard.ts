import { prisma } from "@/lib/prisma";
import { formatDateGB } from "@/lib/format";

export type Gran = "daily" | "weekly" | "monthly";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Bucket = { label: string; start: Date; end: Date };

function startOfUTCDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function startOfISOWeek(d: Date): Date {
  const x = startOfUTCDay(d);
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(x, -dow);
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function buildBuckets(gran: Gran, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  if (gran === "daily") {
    const today = startOfUTCDay(now);
    for (let i = 13; i >= 0; i--) {
      const start = addDays(today, -i);
      buckets.push({
        label: String(start.getUTCDate()).padStart(2, "0"),
        start,
        end: addDays(start, 1),
      });
    }
  } else if (gran === "weekly") {
    const thisWeek = startOfISOWeek(now);
    for (let i = 11; i >= 0; i--) {
      const start = addDays(thisWeek, -i * 7);
      buckets.push({
        label: `${String(start.getUTCDate()).padStart(2, "0")} ${MONTHS[start.getUTCMonth()]}`,
        start,
        end: addDays(start, 7),
      });
    }
  } else {
    const thisMonth = startOfMonth(now);
    for (let i = 11; i >= 0; i--) {
      const start = addMonths(thisMonth, -i);
      buckets.push({ label: MONTHS[start.getUTCMonth()], start, end: addMonths(start, 1) });
    }
  }
  return buckets;
}

export type DashboardData = {
  windowLabel: string;
  kpis: {
    onlineCount: number;
    instoreCount: number;
    revenue: number;
    discount: number;
    onlineSplit: number; // % of redemptions that are online
    revenueSplit: number; // % of revenue that is online
  };
  series: { label: string; online: number; instore: number }[];
  byStore: { name: string; count: number }[];
  topCodes: {
    code: string;
    name: string;
    online: number;
    instore: number;
    revenue: number;
    discount: number;
    aov: number;
  }[];
};

export async function getDashboardData(gran: Gran): Promise<DashboardData> {
  const now = new Date();
  const buckets = buildBuckets(gran, now);
  const windowStart = buckets[0].start;

  const [online, instore, coupons, stores] = await Promise.all([
    prisma.onlineRedemption.findMany({
      where: { orderDate: { gte: windowStart } },
      select: {
        orderDate: true,
        orderNumber: true,
        orderTotal: true,
        couponId: true,
      },
    }),
    prisma.instoreRedemption.findMany({
      where: { redeemedOn: { gte: windowStart } },
      select: {
        redeemedOn: true,
        transactionTotal: true,
        discountAmount: true,
        storeId: true,
        couponId: true,
      },
    }),
    prisma.coupon.findMany({ select: { id: true, code: true, name: true } }),
    prisma.store.findMany({ select: { id: true, name: true } }),
  ]);

  const couponMap = new Map(coupons.map((c) => [c.id, c]));
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  const bucketIndex = (d: Date): number => {
    const t = d.getTime();
    for (let i = 0; i < buckets.length; i++) {
      if (t >= buckets[i].start.getTime() && t < buckets[i].end.getTime()) return i;
    }
    return -1;
  };

  const series = buckets.map((b) => ({ label: b.label, online: 0, instore: 0 }));
  for (const o of online) {
    const i = bucketIndex(o.orderDate);
    if (i >= 0) series[i].online += 1;
  }
  for (const s of instore) {
    const i = bucketIndex(new Date(s.redeemedOn));
    if (i >= 0) series[i].instore += 1;
  }

  // Revenue: dedupe online order totals by order number (BR-03), plus in-store totals.
  const orderTotals = new Map<string, number>();
  for (const o of online) {
    if (!orderTotals.has(o.orderNumber)) {
      orderTotals.set(o.orderNumber, Number(o.orderTotal ?? 0));
    }
  }
  const onlineRevenue = [...orderTotals.values()].reduce((a, b) => a + b, 0);
  const instoreRevenue = instore.reduce((a, s) => a + Number(s.transactionTotal), 0);
  const revenue = onlineRevenue + instoreRevenue;
  const discount = instore.reduce((a, s) => a + Number(s.discountAmount ?? 0), 0);

  const onlineCount = online.length;
  const instoreCount = instore.length;
  const totalRedemptions = onlineCount + instoreCount;

  const storeCounts = new Map<string, number>();
  for (const s of instore) {
    storeCounts.set(s.storeId, (storeCounts.get(s.storeId) ?? 0) + 1);
  }
  const byStore = [...storeCounts.entries()]
    .map(([id, count]) => ({ name: storeMap.get(id)?.name ?? "Unknown", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top codes: aggregate by coupon.
  type Agg = {
    online: number;
    instore: number;
    discount: number;
    orderTotals: Map<string, number>;
    instoreRevenue: number;
  };
  const agg = new Map<string, Agg>();
  const get = (id: string) => {
    let a = agg.get(id);
    if (!a) {
      a = { online: 0, instore: 0, discount: 0, orderTotals: new Map(), instoreRevenue: 0 };
      agg.set(id, a);
    }
    return a;
  };
  for (const o of online) {
    if (!o.couponId) continue;
    const a = get(o.couponId);
    a.online += 1;
    if (!a.orderTotals.has(o.orderNumber)) {
      a.orderTotals.set(o.orderNumber, Number(o.orderTotal ?? 0));
    }
  }
  for (const s of instore) {
    const a = get(s.couponId);
    a.instore += 1;
    a.instoreRevenue += Number(s.transactionTotal);
    a.discount += Number(s.discountAmount ?? 0);
  }

  const topCodes = [...agg.entries()]
    .map(([id, a]) => {
      const c = couponMap.get(id);
      const rev = [...a.orderTotals.values()].reduce((x, y) => x + y, 0) + a.instoreRevenue;
      const uses = a.online + a.instore;
      return {
        code: c?.code ?? "(unmapped)",
        name: c?.name ?? "",
        online: a.online,
        instore: a.instore,
        revenue: rev,
        discount: a.discount,
        aov: uses ? rev / uses : 0,
      };
    })
    .sort((a, b) => b.online + b.instore - (a.online + a.instore))
    .slice(0, 8);

  const windowLabel = `${formatDateGB(windowStart)} – ${formatDateGB(now)}`;

  return {
    windowLabel,
    kpis: {
      onlineCount,
      instoreCount,
      revenue,
      discount,
      onlineSplit: totalRedemptions ? Math.round((onlineCount / totalRedemptions) * 100) : 0,
      revenueSplit: revenue ? Math.round((onlineRevenue / revenue) * 100) : 0,
    },
    series,
    byStore,
    topCodes,
  };
}
