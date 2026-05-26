/** Subtle tree + falling leaves — login screen only. */
export default function LoginNatureBackdrop() {
  const leaves = [
    { left: '8%', delay: 0, duration: 14, drift: -18 },
    { left: '18%', delay: 2.5, duration: 16, drift: 12 },
    { left: '32%', delay: 5, duration: 13, drift: -10 },
    { left: '48%', delay: 1, duration: 18, drift: 20 },
    { left: '62%', delay: 7, duration: 15, drift: -14 },
    { left: '75%', delay: 3.5, duration: 17, drift: 8 },
    { left: '88%', delay: 9, duration: 14, drift: -22 },
    { left: '42%', delay: 11, duration: 19, drift: 15 },
    { left: '55%', delay: 6, duration: 12, drift: -8 },
    { left: '25%', delay: 8, duration: 16, drift: 10 },
  ];

  return (
    <div className="login-nature" aria-hidden>
      <svg
        className="login-nature__tree"
        viewBox="0 0 400 320"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="200" cy="300" rx="120" ry="18" fill="var(--nature-tree)" />
        <path
          d="M200 300 L200 200 Q195 180 200 160 Q205 140 200 120 Q198 100 200 80 L200 300"
          fill="var(--nature-tree)"
        />
        <circle cx="200" cy="95" r="70" fill="var(--nature-tree)" />
        <circle cx="155" cy="115" r="48" fill="var(--nature-tree)" />
        <circle cx="248" cy="108" r="52" fill="var(--nature-tree)" />
        <circle cx="200" cy="55" r="42" fill="var(--nature-tree)" />
      </svg>

      <div className="login-nature__leaves">
        {leaves.map((leaf, i) => (
          <span
            key={i}
            className="login-nature__leaf"
            style={{
              left: leaf.left,
              animationDuration: `${leaf.duration}s`,
              animationDelay: `${leaf.delay}s`,
              '--leaf-drift': `${leaf.drift}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
