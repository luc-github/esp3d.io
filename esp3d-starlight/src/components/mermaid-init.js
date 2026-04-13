import mermaid from 'mermaid/dist/mermaid.esm.mjs';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const runMermaid = () => {
  try {
    mermaid.run();
  } catch (error) {
    console.error('Mermaid initialization failed:', error);
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', runMermaid);
} else {
  runMermaid();
}
