import { Service } from '@angular/core';

@Service()
export class CloudinaryService {
  private readonly cloudName = 'derulhs2';
  private readonly uploadPreset = 'iawjys3r';

  async uploadImage(file: File): Promise<string> {
    const result = await this.upload(file);
    return result.secureUrl;
  }

  uploadPaymentReceipt(file: File) {
    return this.upload(file, 'payment_receipts');
  }

  private async upload(file: File, folder?: string) {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    if (folder) formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل رفع الصورة إلى Cloudinary');
    }

    const data: { secure_url: string; public_id: string } = await response.json();

    return {
      secureUrl: data.secure_url,
      publicId: data.public_id,
    };
  }
}
