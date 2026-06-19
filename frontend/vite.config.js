import { defineConfig } from 'vite';

// The React plugin is only needed during `vite build` — not during `vite preview`.
// Using an async factory + dynamic import means the plugin (and therefore the package)
// is never resolved at runtime, which allows @vitejs/plugin-react to live in
// devDependencies and be correctly excluded by `npm ci --omit=dev` in the runtime
// Docker stage.
export default defineConfig(async ({ command }) => {
  const plugins = [];
  if (command === 'build') {
    const { default: react } = await import('@vitejs/plugin-react');
    plugins.push(react());
  }

  return {
    plugins,
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});
