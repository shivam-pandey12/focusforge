interface ProfileAvatarProps {
  email?: string | null;
  displayName?: string | null;
  src?: string | null;
  className?: string;
  showStatus?: boolean;
}

function getInitials(email?: string | null, displayName?: string | null): string {
  const source = displayName?.trim() || email?.split("@")[0] || "";
  const pieces = source.split(/[\s._-]+/).filter(Boolean);

  if (pieces.length >= 2) {
    return `${pieces[0][0]}${pieces[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || "FF";
}

export default function ProfileAvatar({
  email,
  displayName,
  src,
  className = "h-10 w-10",
  showStatus = false
}: ProfileAvatarProps) {
  const initials = getInitials(email, displayName);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-forge-gold text-sm font-bold text-white shadow-glow ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={displayName || email || "Profile"} className="h-full w-full object-cover" src={src} />
      ) : (
        <span>{initials}</span>
      )}
      {showStatus ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#7AA66A]" /> : null}
    </span>
  );
}
