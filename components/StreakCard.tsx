interface StreakCardProps {
  currentStreak: number;
  loading?: boolean;
}

export default function StreakCard({ currentStreak, loading = false }: StreakCardProps) {
  return (
    <article className="stat-card bg-forge-surfaceAlt/70">
      <p className="stat-label">Current streak</p>
      <p className="stat-value">
        {loading ? "..." : currentStreak}
        <span className="ml-2 text-xl font-bold text-forge-muted">
          {currentStreak === 1 ? "day" : "days"}
        </span>
      </p>
      <p className="stat-detail">
        Your streak updates once after the first completed focus session each day.
      </p>
    </article>
  );
}
