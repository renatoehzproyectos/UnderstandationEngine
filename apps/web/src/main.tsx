import './log';
import { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { copyLog, log } from './log';
import './styles.css';

class Boundary extends Component<{ children: ReactNode }, { err: boolean; ok: boolean | null }> {
  state = { err: false, ok: null as boolean | null };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: Error, info: { componentStack?: string | null }) { log('render-crash', `${e.message}\n${e.stack}\n${info.componentStack}`); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <main style={{ alignItems: 'center', justifyContent: 'center', gap: 16, flexDirection: 'row' }}>
        <button aria-label="⚠" style={{ width: 72, height: 72, fontSize: 32 }} onClick={async () => this.setState({ ok: await copyLog() })}>
          {this.state.ok === null ? '📋' : this.state.ok ? '✓' : '⚠'}
        </button>
        <button aria-label="↺" style={{ width: 72, height: 72, fontSize: 32 }} onClick={() => location.reload()}>↺</button>
      </main>
    );
  }
}
createRoot(document.getElementById('root')!).render(<Boundary><App /></Boundary>);
