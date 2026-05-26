/** Animated gradient orbs for auth screens (glassmorphism backdrop). */
export default function GradientOrbs() {
  return (
    <div className="auth-orbs" aria-hidden>
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />
      <div className="auth-orb auth-orb--3" />
      <div className="auth-orb--ring" />
    </div>
  );
}
