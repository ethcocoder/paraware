export async function compressImage(file, max = 1200, quality = 0.72) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a photograph.');
  }
  if (file.size > 18 * 1024 * 1024) {
    throw new Error('That photograph is very large. Please choose one under 18 MB.');
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The photograph could not be read.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The photograph could not be opened.'));
    img.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
