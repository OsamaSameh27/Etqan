import { Service } from '@angular/core';

@Service()
export class CloudinaryService {
  private readonly cloudName = 'derulhs2';
  private readonly uploadPreset = 'iawjys3r';

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل رفع الصورة إلى Cloudinary');
    }

    const data: { secure_url: string } = await response.json();

    return data.secure_url;
  }
}
