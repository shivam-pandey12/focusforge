const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 850_000;
const AVATAR_SIZE = 256;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process the selected image."));
    image.src = src;
  });
}

export async function resizeProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is not available in this browser.");
  }

  const cropSize = Math.min(image.width, image.height);
  const cropX = (image.width - cropSize) / 2;
  const cropY = (image.height - cropSize) / 2;

  context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  const output = canvas.toDataURL("image/jpeg", 0.82);

  if (output.length > MAX_OUTPUT_CHARS) {
    throw new Error("This image is still too large after resizing. Try another image.");
  }

  return output;
}
