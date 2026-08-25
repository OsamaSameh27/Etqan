import Swal from 'sweetalert2';

export class Alerts {
  static success(title: string, text: string) {
    Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'حسنًا',
      confirmButtonColor: '#8B5E3C',
      customClass: {
        container: 'my-swal-container',
      },
    });
  }

  static error(title: string, text: string) {
    Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'حسنًا',
      confirmButtonColor: '#8B5E3C',
      customClass: {
        container: 'my-swal-container',
      },
    });
  }

  static async confirm(title: string, text: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'لا',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      customClass: {
        container: 'my-swal-container',
      },
    });

    return result.isConfirmed;
  }

  static async confirmAction(title: string, text: string, confirmButtonText = 'تأكيد') {
    const result = await Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#8B5E3C',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      customClass: {
        container: 'my-swal-container',
      },
    });

    return result.isConfirmed;
  }
}
