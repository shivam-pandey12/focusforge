import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore, ServerSetupError } from "@/lib/firebase/admin";
import { verifyAdminRequestUser, RequestAuthError } from "@/lib/server/adminAccess";
import { withApiLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
}

type QuerySnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

function safeRecentDoc(doc: QuerySnapshotDoc) {
  const data = doc.data();
  const message = typeof data.message === "string" ? data.message : "";
  const description = typeof data.description === "string" ? data.description : "";

  return {
    id: doc.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    name: typeof data.name === "string" ? data.name : "",
    email: typeof data.email === "string" ? data.email : "",
    status: typeof data.status === "string" ? data.status : "",
    plan: typeof data.plan === "string" ? data.plan : "",
    category: typeof data.category === "string" ? data.category : "",
    type: typeof data.type === "string" ? data.type : "",
    severity: typeof data.severity === "string" ? data.severity : "",
    subject: typeof data.subject === "string" ? data.subject : "",
    title: typeof data.title === "string" ? data.title : "",
    messagePreview: message ? message.slice(0, 180) : description.slice(0, 180),
    relatedRoute: typeof data.relatedRoute === "string" ? data.relatedRoute : "",
    paymentId: typeof data.paymentId === "string" ? data.paymentId : "",
    orderId: typeof data.orderId === "string" ? data.orderId : "",
    amount: typeof data.amount === "number" ? data.amount : null,
    billingCycle: typeof data.billingCycle === "string" ? data.billingCycle : "",
    path: typeof data.path === "string" ? data.path : "",
    deviceType: typeof data.deviceType === "string" ? data.deviceType : "",
    createdAt: toIso(data.createdAt)
  };
}

type CountableQuery = {
  count: () => {
    get: () => Promise<{ data: () => { count?: number } }>;
  };
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function countDocs(queryRef: unknown): Promise<number> {
  const snapshot = await (queryRef as CountableQuery).count().get();

  return Number(snapshot.data().count ?? 0);
}

async function listAllUsers() {
  const auth = getAdminAuth();
  const users = [];
  let pageToken: string | undefined;

  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

function isPaidPayment(data: Record<string, unknown>): boolean {
  return data.status === "verified" || data.status === "paid";
}

function timestampToMillis(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return null;
}

function effectivePaidPlan(data: Record<string, unknown>, nowMillis: number): "free" | "pro" | "elite" {
  const plan = data.plan === "pro" || data.plan === "elite" ? data.plan : "free";
  const status = String(data.subscriptionStatus ?? "free");

  if (plan === "free" || status === "free" || status === "expired" || status === "inactive") {
    return "free";
  }

  const expiryMillis = timestampToMillis(data.planExpiresAt);

  if (expiryMillis && expiryMillis <= nowMillis) {
    return "free";
  }

  return plan;
}

function revenueByPayments(paymentDocs: QuerySnapshotDoc[]) {
  const initial = {
    totalRevenue: 0,
    proRevenue: 0,
    eliteRevenue: 0,
    monthlyRevenue: 0,
    seasonRevenue: 0,
    yearlyRevenue: 0,
    paidPayments: 0
  };

  return paymentDocs.reduce((summary, doc) => {
    const data = doc.data();

    if (!isPaidPayment(data)) {
      return summary;
    }

    const amount = typeof data.amount === "number" ? data.amount : 0;
    summary.totalRevenue += amount;
    summary.paidPayments += 1;

    if (data.plan === "pro") {
      summary.proRevenue += amount;
    }

    if (data.plan === "elite") {
      summary.eliteRevenue += amount;
    }

    if (data.billingCycle === "monthly") {
      summary.monthlyRevenue += amount;
    }

    if (data.billingCycle === "season") {
      summary.seasonRevenue += amount;
    }

    if (data.billingCycle === "yearly") {
      summary.yearlyRevenue += amount;
    }

    return summary;
  }, initial);
}

function summarizeRoutes(docs: QuerySnapshotDoc[]) {
  const routeCounts = docs.reduce<Record<string, number>>((items, doc) => {
    const path = String(doc.data().path ?? "/");
    items[path] = (items[path] ?? 0) + 1;

    return items;
  }, {});

  return Object.entries(routeCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function jsonError(message: string, status = 400, setup = false) {
  return NextResponse.json({ error: message, setup }, { status });
}

export async function GET(request: Request) {
  return withApiLogging("admin.summary", async (logContext) => {
    try {
      const admin = await verifyAdminRequestUser(request);
      logContext.userId = admin.uid;
      const { db } = await getAdminFirestore();
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const sevenDaysAgo = addDays(todayStart, -6);
      const todayKey = dateKey(todayStart);
      const weekKey = dateKey(sevenDaysAgo);
      const [
        authUsers,
        profiles,
        payments,
        recentPayments,
        recentTickets,
        recentFeedback,
        totalTraffic,
        todayTraffic,
        weekTrafficCount,
        weekTraffic,
        recentTraffic
      ] = await Promise.all([
        listAllUsers(),
        db.collection("userProfiles").get(),
        db.collection("payments").get(),
        db.collection("payments").orderBy("createdAt", "desc").limit(10).get(),
        db.collection("supportTickets").orderBy("createdAt", "desc").limit(10).get(),
        db.collection("feedback").orderBy("createdAt", "desc").limit(10).get(),
        countDocs(db.collection("trafficEvents")),
        countDocs(db.collection("trafficEvents").where("dateKey", "==", todayKey)),
        countDocs(db.collection("trafficEvents").where("dateKey", ">=", weekKey)),
        db.collection("trafficEvents").where("dateKey", ">=", weekKey).limit(1000).get(),
        db.collection("trafficEvents").orderBy("createdAt", "desc").limit(500).get()
      ]);
      const effectivePlans = profiles.docs.map((entry) => effectivePaidPlan(entry.data(), now.getTime()));
      const newUsersToday = authUsers.filter((entry) => Date.parse(entry.metadata.creationTime) >= todayStart.getTime()).length;
      const newUsers7d = authUsers.filter((entry) => Date.parse(entry.metadata.creationTime) >= sevenDaysAgo.getTime()).length;
      const returningUsers7d = authUsers.filter((entry) => {
        const createdAt = Date.parse(entry.metadata.creationTime);
        const lastSignInAt = Date.parse(entry.metadata.lastSignInTime || "");

        return Number.isFinite(lastSignInAt) && lastSignInAt >= sevenDaysAgo.getTime() && createdAt < sevenDaysAgo.getTime();
      }).length;
      const uniqueVisitors7d = new Set(weekTraffic.docs.map((entry) => String(entry.data().visitorHash ?? ""))).size;

      return NextResponse.json({
        counts: {
          totalUsers: authUsers.length || profiles.size,
          profileCount: profiles.size,
          paidUsers: effectivePlans.filter((plan) => plan === "pro" || plan === "elite").length,
          freeUsers: effectivePlans.filter((plan) => plan !== "pro" && plan !== "elite").length,
          proUsers: effectivePlans.filter((plan) => plan === "pro").length,
          eliteUsers: effectivePlans.filter((plan) => plan === "elite").length,
          newUsersToday,
          newUsers7d,
          returningUsers7d
        },
        traffic: {
          totalImpressions: totalTraffic,
          todayImpressions: todayTraffic,
          weekImpressions: weekTrafficCount,
          uniqueVisitors7d,
          topRoutes: summarizeRoutes(recentTraffic.docs.map((doc) => ({ id: doc.id, data: () => doc.data() })))
        },
        revenue: revenueByPayments(payments.docs.map((doc) => ({ id: doc.id, data: () => doc.data() }))),
        recentPayments: recentPayments.docs.map(safeRecentDoc),
        recentSupportTickets: recentTickets.docs.map(safeRecentDoc),
        recentFeedback: recentFeedback.docs.map(safeRecentDoc),
        recentTraffic: recentTraffic.docs.slice(0, 10).map(safeRecentDoc)
      });
    } catch (error) {
      logContext.errorClass = error instanceof Error ? error.name : "UnknownError";

      if (error instanceof RequestAuthError) {
        return jsonError(error.message, error.status);
      }

      if (error instanceof ServerSetupError) {
        logContext.setup = true;
        return jsonError(error.message, 503, true);
      }

      return jsonError(error instanceof Error ? error.message : "Could not load admin summary.", 500);
    }
  });
}
