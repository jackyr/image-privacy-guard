chrome.runtime.onInstalled.addListener(async () => {
  // Initial set options
  await chrome.storage.local.clear();
  const options = await chrome.storage.sync.get();
  chrome.storage.sync.set({
    imgFormat: options.imgFormat || 'auto',
    imgQuality: options.imgQuality || 0.8,
    imgScaling: options.imgScaling || 1,
    imgRotation: options.imgRotation || 0,
    imgFlipping: options.imgFlipping || 'none',
  });

  // Set context menu
  chrome.contextMenus.create({
    id: "privacyCopy",
    title: chrome.i18n.getMessage("menu_private_copy"),
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "privacyDownload",
    title: chrome.i18n.getMessage("menu_private_download"),
    contexts: ["image"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!['privacyCopy', 'privacyDownload'].includes(info.menuItemId)) {
    return;
  }

  const originalSrc = info.srcUrl;
  let originalName;
  let originalFormat;
  let originalDataUrl;

  // Fetch original image
  try {
    const res = await fetch(originalSrc);
    if (res.ok) {
      const blob = await res.blob();
      originalName = getFileName(originalSrc, res);
      originalFormat = blob.type;
      originalDataUrl = await blobToBase64(blob);
    }
  } catch(err) {
    console.log(err);
  }

  if (!originalDataUrl) {
    await chrome.storage.local.clear();
    return;
  }

  // Save to storage for content script use
  await chrome.storage.local.set({ 
    originalSrc,
    originalName,
    originalFormat,
    originalDataUrl,
  });

  // Inject runtime content script
  await injectContentScript(tab.id);

  // Execute image processing
  if (info.menuItemId === "privacyCopy") {
    chrome.tabs.sendMessage(tab.id, { action: "copy" });
  } else if (info.menuItemId === "privacyDownload") {
    chrome.tabs.sendMessage(tab.id, { action: "download" });
  }
});

// User operation
chrome.runtime.onMessage.addListener(async message => {
  if (message.action === 'handleCopyFailed') {
    chrome.action.setBadgeText({ text: '1' });
    return;
  }

  const { format, dataUrl, originalName } = await chrome.storage.local.get();
  if (message.action === 'download') {
    chrome.downloads.download({
      url: dataUrl,
      filename: `${originalName}.${format.replace('image/', '')}`,
      saveAs: true,
    });
  }
})

function injectContentScript(tabId) {
  return new Promise(resolve => {
    chrome.scripting.executeScript({ 
      target: { tabId },
      func: () => typeof contentScriptInitialize !== 'undefined',
    }, async result => {
      const contentScriptInitialize = result[0].result;
      if (!contentScriptInitialize) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content-script.js'],
        });
      }
      resolve();
    });
  });
}

function getFileName(src, response) {
  const contentDisposition = response.headers.get('content-disposition') || '';
  const match = contentDisposition.match(/filename="(.+)"/);
  if (match) {
    return match[1];
  }
  const pathname = new URL(src).pathname;
  let fileName;
  fileName = pathname.substring(pathname.lastIndexOf('/') + 1);
  if (fileName.includes('.')) {
    fileName = fileName.split('.').slice(0, -1).join('.');
  }
  return fileName || 'privacy_image';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}