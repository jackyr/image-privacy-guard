const contentScriptInitialize = true;

chrome.runtime.onMessage.addListener(async message => {
  const runtimeData = await getRuntimeData();

  // Process image with canvas
  const blob = await processImage(
    runtimeData.originalDataUrl,
    {
      ...runtimeData,
      imgFormat: runtimeData.imgFormat === 'auto' ? runtimeData.originalFormat : runtimeData.imgFormat,
    },
  );
  const dataUrl = await blobToBase64(blob);

  // Save new image to storage
  await chrome.storage.local.set({
    format: blob.type,
    dataUrl,
  });
  
  // User operation
  if (message.action === 'copy') {
    if (blob.type !== 'image/png') {
      const pngFormatBlob = await processImage(
        runtimeData.originalDataUrl,
        {
          ...runtimeData,
          imgFormat: 'image/png',
        },
      );
      copyToClipboard(pngFormatBlob);
    } else {
      copyToClipboard(blob);
    }
  } else if (message.action === 'download') {
    chrome.runtime.sendMessage(message);
  }
});

async function getRuntimeData() {
  const { imgFormat, imgQuality, imgScaling, imgRotation, imgFlipping } = await chrome.storage.sync.get();
  const { originalSrc, originalName, originalFormat, originalDataUrl } = await chrome.storage.local.get();
  return {
    imgFormat,
    imgQuality,
    imgScaling,
    imgRotation,
    imgFlipping,
    originalSrc,
    originalName,
    originalFormat,
    originalDataUrl,
  }
}

function processImage(url, {
  imgFormat = 'image/png',
  imgQuality = 1,
  imgScaling = 1,
  imgRotation = 0,
  imgFlipping = 'none',
}) {
  const rotateCanvas = [90, 270].includes(imgRotation);
  return new Promise(resolve => {
    let img = new Image();
    img.onload = () => {
      let canvas = document.createElement("canvas");
      const imgWidth = Math.round(img.width * imgScaling);
      const imgHeight = Math.round(img.height * imgScaling);
      canvas.width = rotateCanvas ? imgHeight : imgWidth;
      canvas.height = rotateCanvas ? imgWidth : imgHeight;
      const ctx = canvas.getContext("2d");
      if (imgFormat === 'image/jpeg') {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (imgRotation) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((imgRotation * Math.PI) / 180);
        ctx.translate(-imgWidth / 2, -imgHeight / 2);
      }
      if (imgFlipping === 'horizontal') {
        ctx.scale(-1, 1);
        ctx.translate(-imgWidth, 0);
      } else if (imgFlipping === 'vertical') {
        ctx.scale(1, -1);
        ctx.translate(0, -imgHeight);
      }
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
      canvas.toBlob(blob => {
        resolve(blob);
        canvas = null;
        img = null;
      }, imgFormat, imgQuality);
    };
    img.src = url;
  });
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

async function copyToClipboard(blob) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
  } catch(err) {
    chrome.runtime.sendMessage({ action: 'handleCopyFailed' });
  }
}