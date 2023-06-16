document.addEventListener("DOMContentLoaded", async () => {
  document.title = chrome.i18n.getMessage('popup_title');
  chrome.action.setBadgeText({ text: '' });

  const options = await chrome.storage.sync.get();

  // Set initial value
  imgFormatTitle.textContent = `${chrome.i18n.getMessage('popup_option_image_format')}:`;
  imgScalingTitle.textContent = `${chrome.i18n.getMessage('popup_option_image_scaling')}:`;
  imgRotationTitle.textContent = `${chrome.i18n.getMessage('popup_option_image_rotation')}:`;
  imgFlippingTitle.textContent = `${chrome.i18n.getMessage('popup_option_image_flipping')}:`;
  imgFlippingHorizontal.textContent = `${chrome.i18n.getMessage('popup_option_image_flipping_horizontal')}`;
  imgFlippingVertical.textContent = `${chrome.i18n.getMessage('popup_option_image_flipping_vertical')}`;
  imgQualityTitle.textContent = `${chrome.i18n.getMessage('popup_option_image_quality')}:`;
  clear.title = chrome.i18n.getMessage('popup_operation_clear_storage');
  imgFormat.value = options.imgFormat;
  imgScaling.value = options.imgScaling;
  imgRotation.value = options.imgRotation;
  imgFlipping.value = options.imgFlipping;
  setQuality(options.imgFormat, options.imgQuality);

  // Handle options change
  imgFormat.addEventListener("change", e => {
    setQuality(e.target.value);
    chrome.storage.sync.set({ imgFormat: e.target.value });
  });
  qualityInput.addEventListener("input", e => {
    qualityPercent.innerText = e.target.value;
  });
  qualityInput.addEventListener("change", e => {
    const quality = e.target.value;
    chrome.storage.sync.set({ imgQuality: quality / 100 });
  });
  imgScaling.addEventListener("change", e => {
    chrome.storage.sync.set({ imgScaling: Number(e.target.value) });
  });
  imgRotation.addEventListener("change", e => {
    chrome.storage.sync.set({ imgRotation: Number(e.target.value) });
  });
  imgFlipping.addEventListener("change", e => {
    chrome.storage.sync.set({ imgFlipping: e.target.value });
  });

  // Set image
  setImage();
  clear.addEventListener('click', async () => {
    await chrome.storage.local.clear();
    setImage();
  })
});

async function setQuality(format, quality) {
  if (['image/png'].includes(format)) {
    qualityInput.value = 100;
    qualityPercent.textContent = 100;
    qualityInput.disabled = true;
  } else {
    quality = quality || (await chrome.storage.sync.get()).imgQuality;
    qualityInput.value = parseInt(quality * 100);
    qualityPercent.textContent = parseInt(quality * 100);
    qualityInput.disabled = false;
  }
}

async function setImage() {
  const { originalName, format, dataUrl } = await chrome.storage.local.get();
  if (dataUrl) {
    imageWrapper.style.display = 'block';
    clear.style.display = 'block';
    image.src = dataUrl;
    fileFormat.textContent = `${chrome.i18n.getMessage('popup_image_format')}: ${format.replace('image/', '')}`;
    fileName.textContent = `${chrome.i18n.getMessage('popup_image_name')}: ${originalName}`;
  } else {
    imageWrapper.style.display = 'none';
    clear.style.display = 'none';
    image.src = '';
    fileFormat.textContent = '';
    fileName.textContent = '';
  }
}