import React from "react";

// Flags drawn as SVG so every device shows the same, correct flag.
// Syria: the green independence flag (green, white, black with three red stars) — the official flag.
// Emoji are never used: on many devices the Syria emoji still shows the old flag.
function star(cx, cy, outer, inner, rotate = -90) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = ((rotate + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function SyriaFlag({ height = 14, title = "Syria" }) {
  return (
    <svg
      className="flag"
      viewBox="0 0 900 600"
      height={height}
      width={(height * 3) / 2}
      role="img"
      aria-label={title}
    >
      <rect width="900" height="200" fill="#007A3D" />
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      <rect y="400" width="900" height="200" fill="#000000" />
      {[225, 450, 675].map((x) => (
        <polygon key={x} points={star(x, 300, 72, 28)} fill="#CE1126" />
      ))}
    </svg>
  );
}

export function TurkeyFlag({ height = 14, title = "Türkiye" }) {
  return (
    <svg
      className="flag"
      viewBox="0 0 1200 800"
      height={height}
      width={(height * 3) / 2}
      role="img"
      aria-label={title}
    >
      <rect width="1200" height="800" fill="#E30A17" />
      <circle cx="425" cy="400" r="200" fill="#FFFFFF" />
      <circle cx="475" cy="400" r="160" fill="#E30A17" />
      <polygon points={star(583, 400, 100, 40, 180)} fill="#FFFFFF" />
    </svg>
  );
}

export function Flag({ c, height, t }) {
  if (c === "SY") return <SyriaFlag height={height} title={t ? t("syria") : "Syria"} />;
  if (c === "TR") return <TurkeyFlag height={height} title={t ? t("turkey") : "Türkiye"} />;
  return null;
}
