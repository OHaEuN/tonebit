/** 파일을 이미지로 디코딩한다. EXIF 회전은 브라우저 기본 image-orientation에 맡긴다 */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
