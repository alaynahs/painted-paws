import PawIcon from "./paw-icon";

const BUBBLE_BLUE = "#4f8fb3";
const BUBBLE_YELLOW = "#f3e2b3";
const BUBBLE_MINT = "#bfe0d1";

const bubbles = [
  { top: "6%", left: "88%", size: 90, color: BUBBLE_BLUE },
  { top: "16%", left: "6%", size: 50, color: BUBBLE_YELLOW },
  { top: "34%", left: "72%", size: 130, color: BUBBLE_BLUE },
  { top: "52%", left: "18%", size: 65, color: BUBBLE_MINT },
  { top: "70%", left: "92%", size: 55, color: BUBBLE_YELLOW },
  { top: "86%", left: "10%", size: 100, color: BUBBLE_BLUE },
  { top: "94%", left: "60%", size: 45, color: BUBBLE_MINT },
];

const PAW_BLUE = "#3a6d8a";
const PAW_PINK = "#d98caa";
const PAW_LAVENDER = "#c3aede";

const paws = [
  { top: "12%", left: "22%", size: 34, rotate: -18, color: PAW_BLUE },
  { top: "28%", left: "94%", size: 26, rotate: 25, color: PAW_PINK },
  { top: "44%", left: "4%", size: 30, rotate: 8, color: PAW_BLUE },
  { top: "60%", left: "48%", size: 22, rotate: -30, color: PAW_LAVENDER },
  { top: "76%", left: "78%", size: 36, rotate: 15, color: PAW_BLUE },
  { top: "90%", left: "30%", size: 24, rotate: -10, color: PAW_PINK },
  { top: "20%", left: "58%", size: 20, rotate: 40, color: PAW_LAVENDER },
  { top: "8%", left: "40%", size: 24, rotate: -22, color: PAW_PINK },
  { top: "38%", left: "84%", size: 20, rotate: 12, color: PAW_LAVENDER },
  { top: "56%", left: "8%", size: 26, rotate: -35, color: PAW_PINK },
  { top: "68%", left: "60%", size: 30, rotate: 22, color: PAW_BLUE },
  { top: "82%", left: "50%", size: 20, rotate: -8, color: PAW_PINK },
  { top: "96%", left: "84%", size: 28, rotate: 18, color: PAW_LAVENDER },
];

export default function DecorativeBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {bubbles.map((b, i) => (
        <div
          key={`bubble-${i}`}
          className="absolute rounded-full opacity-[0.18]"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            backgroundColor: b.color,
          }}
        />
      ))}
      {paws.map((p, i) => (
        <PawIcon
          key={`paw-${i}`}
          className="absolute opacity-[0.18]"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            color: p.color,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
