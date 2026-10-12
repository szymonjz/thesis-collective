import { createRoot } from 'react-dom/client';
import { Component, type ReactNode } from 'react';
import App from './App';
import './theme.css';
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="crash">
        <h1>Ein unerwarteter Fehler ist aufgetreten.</h1>
        <p>Gespeicherte Daten bleiben erhalten. Bitte lade die Seite neu.</p>
        <button onClick={() => location.reload()}>Neu laden</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
