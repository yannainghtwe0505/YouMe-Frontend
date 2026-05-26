import GradientOrbs from './GradientOrbs';
import LoginNatureBackdrop from './LoginNatureBackdrop';

/**
 * Full-viewport auth layout.
 * @param {'default'|'login'} [variant] — login adds tree + leaves backdrop
 */
export default function AuthShell({ hero, children, maxWidth = 420, variant = 'default' }) {
  const isLogin = variant === 'login';

  return (
    <div className={`auth-page-root ${isLogin ? 'auth-page-root--login' : ''}`.trim()}>
      <GradientOrbs />
      {isLogin ? <LoginNatureBackdrop /> : null}
      <div className="auth-page-inner fade-in" style={{ maxWidth }}>
        {hero ? <header className="auth-hero auth-hero-stagger">{hero}</header> : null}
        {children}
      </div>
    </div>
  );
}
