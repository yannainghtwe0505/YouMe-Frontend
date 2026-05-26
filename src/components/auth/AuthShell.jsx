import GradientOrbs from './GradientOrbs';

/**
 * Full-viewport auth layout with animated gradient orbs + centered content.
 */
export default function AuthShell({ hero, children, maxWidth = 420 }) {
  return (
    <div className="auth-page-root">
      <GradientOrbs />
      <div className="auth-page-inner fade-in" style={{ maxWidth }}>
        {hero ? <header className="auth-hero auth-hero-stagger">{hero}</header> : null}
        {children}
      </div>
    </div>
  );
}
