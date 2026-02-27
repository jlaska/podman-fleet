console.log('[Frontend] main.ts loading...');

import { mount } from 'svelte';
import App from './App.svelte';

console.log('[Frontend] Svelte imports loaded');

/**
 * Mount the Svelte app to the target element with the id 'app'.
 * using the default App.svelte component we've created.
 */
const target = document.getElementById('app');
console.log('[Frontend] Target element:', target);

let app;
if (target) {
  console.log('[Frontend] Mounting App component...');
  app = mount(App, { target });
  console.log('[Frontend] App mounted successfully');
} else {
  console.error('[Frontend] ERROR: Could not find #app element!');
}

export default app;
