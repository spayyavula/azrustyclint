import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function Landing() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container">
          <div className="logo">RustyClint</div>
          <nav className="landing-nav">
            {isAuthenticated ? (
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link primary">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="landing-container">
            <h1>Code together, build faster</h1>
            <p className="hero-subtitle">
              A secure, collaborative IDE for teams. Write code in 13+ languages
              with real-time collaboration, instant execution, and zero setup.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-primary">
                Start coding for free
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="landing-container">
            <div className="features-grid">
              <div className="feature">
                <h3>Secure sandboxes</h3>
                <p>
                  Every execution runs in an isolated Docker container.
                  Your code is safe, and so is everyone else's.
                </p>
              </div>
              <div className="feature">
                <h3>Real-time collaboration</h3>
                <p>
                  See your teammates type. Share cursors, chat, and
                  review code together as if you're in the same room.
                </p>
              </div>
              <div className="feature">
                <h3>13+ languages</h3>
                <p>
                  Rust, Python, JavaScript, Go, Java, C++, and more.
                  Switch languages instantly, no configuration needed.
                </p>
              </div>
              <div className="feature">
                <h3>Code intelligence</h3>
                <p>
                  Autocomplete, go to definition, find references.
                  Full LSP support for every language.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="landing-container">
            <h2>Simple pricing</h2>
            <p>Free for individuals. Teams start at $10/user/month.</p>
            <Link to="/register" className="btn-secondary">
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <p>&copy; 2025 RustyClint</p>
        </div>
      </footer>
    </div>
  );
}
