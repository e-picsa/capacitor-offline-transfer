import './index.css';
import { render } from 'preact';

import { AppShell } from './components/app-shell';

const root = document.getElementById('app');
if (root) {
  render(<AppShell />, root);
}
