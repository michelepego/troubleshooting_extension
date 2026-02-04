const collectPageInfo = () => {
  const title = document.title;
  const url = window.location.href;
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .slice(0, 5)
    .map((heading) => heading.textContent.trim())
    .filter(Boolean);
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

  return {
    title,
    url,
    headings,
    metaDescription,
    timestamp: new Date().toISOString()
  };
};

const logPageInfo = (reason) => {
  const info = collectPageInfo();
  console.group(`Support Assistant: Page Snapshot (${reason})`);
  console.log('Title:', info.title);
  console.log('URL:', info.url);
  console.log('Meta description:', info.metaDescription || 'N/A');
  console.log('Headings:', info.headings.length ? info.headings : 'No headings found');
  console.log('Captured at:', info.timestamp);
  console.groupEnd();
  return info;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SUPPORT_ASSISTANT_LOG_PAGE') {
    const info = logPageInfo('manual trigger');
    sendResponse({ ok: true, info });
  }
});

logPageInfo('auto capture');
