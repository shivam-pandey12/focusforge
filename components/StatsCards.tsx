import MetricCard from "@/components/MetricCard";

interface StatsCardsProps {
  totalStudyTimeToday: number;
  sessionsToday: number;
  loading?: boolean;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function StatsCards({
  totalStudyTimeToday,
  sessionsToday,
  loading = false
}: StatsCardsProps) {
  const cards = [
    {
      label: "Study time today",
      value: loading ? "..." : formatMinutes(totalStudyTimeToday),
      detail: "Saved from completed focus sessions"
    },
    {
      label: "Sessions today",
      value: loading ? "..." : String(sessionsToday),
      detail: "Finished timers saved to Firestore"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <MetricCard detail={card.detail} key={card.label} label={card.label} value={card.value} />
      ))}
    </div>
  );
}
