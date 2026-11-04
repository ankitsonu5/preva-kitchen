'use client';

import { useEffect } from 'react';

function mountScripts(markup, target) {
  if (!markup?.trim()) return () => {};

  const template = document.createElement('template');
  template.innerHTML = markup;
  const mountedScripts = [];

  template.content.querySelectorAll('script').forEach((source) => {
    const script = document.createElement('script');
    Array.from(source.attributes).forEach(({ name, value }) => script.setAttribute(name, value));
    script.textContent = source.textContent;
    target.appendChild(script);
    mountedScripts.push(script);
  });

  return () => mountedScripts.forEach((script) => script.remove());
}

export default function CustomIntegrationScripts({ headerScripts = '', footerScripts = '' }) {
  useEffect(() => {
    const removeHeaderScripts = mountScripts(headerScripts, document.head);
    const removeFooterScripts = mountScripts(footerScripts, document.body);

    return () => {
      removeHeaderScripts();
      removeFooterScripts();
    };
  }, [headerScripts, footerScripts]);

  return null;
}
