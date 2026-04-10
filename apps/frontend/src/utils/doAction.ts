import { useWebAppPopup } from 'vue-tg';

export const doAction = async (options: {
  title: string;
  message: string;
  buttonText: string;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    const { showPopup, onPopupClosed } = useWebAppPopup();
    const popupClosed = onPopupClosed(
      (e: { button_id: string | null }) => {
        popupClosed.off();
        if (e.button_id !== 'cancel') {
          resolve(false);
          return;
        }
        resolve(true);
      },
      { manual: true },
    );

    showPopup({
      title: options.title,
      message: options.message,
      buttons: [
        { id: 'cancel', type: 'default', text: options.buttonText },
        { text: 'Закрыть', type: 'destructive' },
      ],
    });
  });
};
