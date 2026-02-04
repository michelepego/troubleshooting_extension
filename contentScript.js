const USERCENTRICS_V2_SRC = 'https://app.usercentrics.eu/browser-ui/latest/loader.js';
const USERCENTRICS_V3_SRC = 'https://web.cmp.usercentrics.eu/ui/loader.js';

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

const detectUsercentricsVersion = () => {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const hasV2 = scripts.some((script) => script.src.includes(USERCENTRICS_V2_SRC));
  const hasV3 = scripts.some((script) => script.src.includes(USERCENTRICS_V3_SRC));

  if (hasV2) {
    return { version: 'V2', mainFunction: 'UC_UI' };
  }

  if (hasV3) {
    return { version: 'V3', mainFunction: '__ucCmp' };
  }

  return null;
};

const logPageInfo = (reason) => {
  const info = collectPageInfo();
  const usercentrics = detectUsercentricsVersion();
  console.group(`Support Assistant: Page Snapshot (${reason})`);
  console.log('Title:', info.title);
  console.log('URL:', info.url);
  console.log('Meta description:', info.metaDescription || 'N/A');
  console.log('Headings:', info.headings.length ? info.headings : 'No headings found');
  if (usercentrics) {
    console.log('Usercentrics version:', usercentrics.version);
    console.log('Main function:', usercentrics.mainFunction);
  } else {
    console.log('Usercentrics version: Not detected');
  }
  console.log('Captured at:', info.timestamp);
  console.groupEnd();
  return { ...info, usercentrics };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SUPPORT_ASSISTANT_LOG_PAGE') {
    const info = logPageInfo('manual trigger');
    sendResponse({ ok: true, info });
  }
});

logPageInfo('auto capture');
