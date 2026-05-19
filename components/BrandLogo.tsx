interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
}

export default function BrandLogo({ className = "", imageClassName = "" }: BrandLogoProps) {
  return (
    <span className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className={`h-full w-full object-contain ${imageClassName}`.trim()}
        draggable={false}
        src="/icons/focusforge-logo.png"
      />
    </span>
  );
}
