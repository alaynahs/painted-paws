export default function PawIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <ellipse cx="12" cy="16.5" rx="5" ry="4" />
      <ellipse cx="4.8" cy="9.5" rx="2.1" ry="2.9" />
      <ellipse cx="9.8" cy="5.3" rx="2.1" ry="2.9" />
      <ellipse cx="14.6" cy="5.3" rx="2.1" ry="2.9" />
      <ellipse cx="19.2" cy="9.5" rx="2.1" ry="2.9" />
    </svg>
  );
}
