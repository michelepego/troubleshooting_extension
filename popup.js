const STORAGE_KEY = 'supportAssistantData';

const defaultData = {
  links: [
    {
      label: 'Ticket Queue',
      value: 'https://support.example.com/queue',
      meta: 'Open the live ticket backlog.'
    },
    {
      label: 'Knowledge Base',
      value: 'https://support.example.com/kb',
      meta: 'Search approved troubleshooting steps.'
    },
    {
      label: 'Status Page',
      value: 'https://status.example.com',
      meta: 'Check ongoing incidents.'
    }
  ],
  templates: [
    {
      label: 'First response',
      value:
        'Hi there! Thanks for reaching out. I am looking into this now and will share an update shortly.',
      meta: 'Standard acknowledgement.'
    },
    {
      label: 'Need more info',
      value:
        'Can you share the exact time of the issue, affected user email, and any screenshots or error messages?',
      meta: 'Gather missing details.'
    },
    {
      label: 'Resolution confirmation',
      value:
        'We have deployed a fix. Please confirm if the issue is resolved on your end.',
      meta: 'Close-the-loop response.'
    }
  ],
  checklist: [
    { label: 'Review overnight escalations', done: false },
    { label: 'Check open high-priority tickets', done: false },
    { label: 'Send end-of-day summary', done: false }
  ]
};

const linkTemplate = document.querySelector('#linkTemplate');
const templateTemplate = document.querySelector('#templateTemplate');
const checklistTemplate = document.querySelector('#checklistTemplate');
const linksContainer = document.querySelector('#links');
const templatesContainer = document.querySelector('#templates');
const checklistContainer = document.querySelector('#checklist');
const addLinkButton = document.querySelector('#addLink');
const addTemplateButton = document.querySelector('#addTemplate');
const resetButton = document.querySelector('#resetDefaults');
const logPageInfoButton = document.querySelector('#logPageInfo');
const pageStatus = document.querySelector('#pageStatus');

const editor = document.querySelector('#editor');
const editorTitle = document.querySelector('#editorTitle');
const editorLabel = document.querySelector('#editorLabel');
const editorValue = document.querySelector('#editorValue');
const editorValueWrapper = document.querySelector('#editorValueWrapper');
const editorSave = document.querySelector('#editorSave');

let state = structuredClone(defaultData);
let editingContext = null;

const saveState = async () => {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
};

const loadState = async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    state = stored[STORAGE_KEY];
  }
  render();
};

const createItemActions = (actions) => {
  const container = document.createElement('div');
  container.className = 'item__actions';

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.className = action.className;
    button.textContent = action.label;
    button.type = 'button';
    button.addEventListener('click', action.handler);
    container.appendChild(button);
  });

  return container;
};

const renderLinks = () => {
  linksContainer.innerHTML = '';
  state.links.forEach((link, index) => {
    const node = linkTemplate.content.cloneNode(true);
    node.querySelector('.item__title').textContent = link.label;
    node.querySelector('.item__meta').textContent = link.meta || link.value;

    const actions = node.querySelector('.item__actions');
    actions.replaceWith(
      createItemActions([
        {
          label: 'Open',
          className: 'open',
          handler: () => chrome.tabs.create({ url: link.value })
        },
        {
          label: 'Edit',
          className: 'edit',
          handler: () => openEditor('link', index)
        },
        {
          label: 'Remove',
          className: 'remove',
          handler: () => removeItem('links', index)
        }
      ])
    );

    linksContainer.appendChild(node);
  });
};

const renderTemplates = () => {
  templatesContainer.innerHTML = '';
  state.templates.forEach((template, index) => {
    const node = templateTemplate.content.cloneNode(true);
    node.querySelector('.item__title').textContent = template.label;
    node.querySelector('.item__meta').textContent = template.meta || 'Click to copy response.';

    const actions = node.querySelector('.item__actions');
    actions.replaceWith(
      createItemActions([
        {
          label: 'Copy',
          className: 'copy',
          handler: () => copyTemplate(template)
        },
        {
          label: 'Edit',
          className: 'edit',
          handler: () => openEditor('template', index)
        },
        {
          label: 'Remove',
          className: 'remove',
          handler: () => removeItem('templates', index)
        }
      ])
    );

    templatesContainer.appendChild(node);
  });
};

const renderChecklist = () => {
  checklistContainer.innerHTML = '';
  state.checklist.forEach((item, index) => {
    const node = checklistTemplate.content.cloneNode(true);
    const checkbox = node.querySelector('input');
    checkbox.checked = item.done;
    checkbox.addEventListener('change', () => toggleChecklist(index));
    node.querySelector('span').textContent = item.label;
    checklistContainer.appendChild(node);
  });
};

const render = () => {
  renderLinks();
  renderTemplates();
  renderChecklist();
};

const openEditor = (type, index = null) => {
  editingContext = { type, index };
  const isLink = type === 'link';
  const isTemplate = type === 'template';
  editorTitle.textContent = index === null ? `Add ${type}` : `Edit ${type}`;
  editorValueWrapper.style.display = 'flex';
  editorValue.required = true;

  if (index !== null) {
    const data = isLink ? state.links[index] : state.templates[index];
    editorLabel.value = data.label;
    editorValue.value = data.value;
  } else {
    editorLabel.value = '';
    editorValue.value = '';
  }

  if (!isLink && !isTemplate) {
    editorValueWrapper.style.display = 'none';
    editorValue.required = false;
  }

  editor.showModal();
};

const closeEditor = () => {
  editor.close();
  editingContext = null;
};

const removeItem = (collection, index) => {
  state[collection].splice(index, 1);
  saveState();
  render();
};

const copyTemplate = async (template) => {
  try {
    await navigator.clipboard.writeText(template.value);
  } catch (error) {
    console.error('Clipboard copy failed', error);
  }
};

const toggleChecklist = (index) => {
  state.checklist[index].done = !state.checklist[index].done;
  saveState();
};

const logCurrentPageInfo = async () => {
  pageStatus.textContent = 'Sending request to content script...';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    pageStatus.textContent = 'No active tab found.';
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'SUPPORT_ASSISTANT_LOG_PAGE'
    });
    if (response?.ok) {
      pageStatus.textContent = `Logged page info for ${response.info?.title || 'current tab'}.`;
    } else {
      pageStatus.textContent = 'Unable to log page info.';
    }
  } catch (error) {
    console.error('Failed to reach content script', error);
    pageStatus.textContent = 'Content script not available on this tab.';
  }
};

addLinkButton.addEventListener('click', () => openEditor('link'));
addTemplateButton.addEventListener('click', () => openEditor('template'));
resetButton.addEventListener('click', async () => {
  state = structuredClone(defaultData);
  await saveState();
  render();
});
logPageInfoButton.addEventListener('click', logCurrentPageInfo);

editor.addEventListener('close', () => {
  if (!editingContext) {
    return;
  }

  if (editor.returnValue !== 'save') {
    closeEditor();
    return;
  }

  const label = editorLabel.value.trim();
  const value = editorValue.value.trim();

  if (!label) {
    return;
  }

  if (editingContext.type === 'link') {
    const item = {
      label,
      value,
      meta: 'Custom link.'
    };
    if (editingContext.index === null) {
      state.links.push(item);
    } else {
      state.links[editingContext.index] = { ...state.links[editingContext.index], ...item };
    }
  }

  if (editingContext.type === 'template') {
    const item = {
      label,
      value,
      meta: 'Custom response.'
    };
    if (editingContext.index === null) {
      state.templates.push(item);
    } else {
      state.templates[editingContext.index] = {
        ...state.templates[editingContext.index],
        ...item
      };
    }
  }

  saveState();
  render();
  closeEditor();
});

loadState();
