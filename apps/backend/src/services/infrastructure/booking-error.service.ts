import { prisma } from '@/config/database';
import type { Autobooking, AutobookingReschedule, User } from '@prisma/client';
import { TBOT } from '@/utils/TBOT';

/**
 * Error configuration with status and message
 */
interface ErrorConfig {
  status: string;
  message: string;
}

/**
 * Critical booking errors mapping
 * Updated to use an object with key-value pairs for error messages and their configurations
 */
const CRITICAL_BOOKING_ERRORS: Record<string, ErrorConfig> = {
  'Невозможно создать поставку': {
    status: 'ERROR',
    message: 'Невозможно создать поставку МОНОПАЛЛЕТА',
  },
  'no valid response from draft mongo: draft does not belong to the current supplier':
    {
      status: 'ERROR',
      message:
        'Черновик не принадлежит текущему поставщику. Скорее всего черновик был удален.',
    },
  'есть ошибки в товарах поставки': {
    status: 'ERROR',
    message:
      'Есть ошибки в товарах поставки. Пожалуйста, проверьте правильность выбранных товаров в черновике.',
  },
  'Issues found with delivered items': {
    status: 'ERROR',
    message:
      'Есть ошибки в товарах поставки. Пожалуйста, проверьте правильность выбранных товаров в черновике.',
  },
  'Пустой черновик': {
    status: 'ERROR',
    message:
      'Пустой черновик. Пожалуйста, проверьте правильность выбранного черновика.',
  },
  'Request failed with status 403': {
    status: 'ERROR',
    message:
      'Нет прав доступа к созданию поставки. Пожалуйста, переавторизируйтесь в боте, чтобы боту удалось забронировать слот.',
  },
  'Request failed with status 401': {
    status: 'ARCHIVED',
    message:
      'Ошибка авторизации. Бот нашел свободный слот для вашего созданного автобронирования, но ваши авторизационные данные устарели и бот не может забронирова вам слот, пожалуйста, переавторизируйтесь в боте, чтобы боту удалось забронировать слот.',
  },
  'Невалидный draftID': {
    status: 'ERROR',
    message:
      'Невалидный ID черновика. Пожалуйста, проверьте правильность выбранного черновика.',
  },
  'Превышена вместимость склада': {
    status: 'ERROR',
    message:
      'Превышена вместимость склада. Пожалуйста, выберите другой склад или уменьшите объем поставки.',
  },
  'Невалидный ключ поставщика': {
    status: 'ERROR',
    message:
      'Невалидный ключ поставщика. Пожалуйста, обновите данные поставщика.',
  },
  'Ошибка создания поставки': {
    status: 'ERROR',
    message:
      'Ошибка создания поставки. Пожалуйста, попробуйте позже или обратитесь в поддержку.',
  },
  'Слот уже занят': {
    status: 'ERROR',
    message:
      'Выбранный слот уже занят. Пожалуйста, выберите другое время для бронирования.',
  },
  "An error occurred. We're sorry for the inconvenience": {
    status: 'ERROR',
    message:
      'Произошла не объяснимая ошибка, может быть вы не приняли оферту, или склад не принимает ваш товар',
  },
};

/**
 * Parameters for handling critical booking errors
 */
interface HandleCriticalErrorParams {
  error: Error | { message?: string };
  entity: Autobooking | AutobookingReschedule;
  user: User;
  warehouseName: string;
  effectiveDate: Date;
  type: 'reschedule' | 'autobooking';
}

/**
 * Handles critical errors for autobookings and reschedules by updating the database and notifying the user.
 * @param params - Parameters for handling the critical error.
 */
async function handleCriticalBookingError({
  error,
  entity,
  user,
  warehouseName,
  effectiveDate,
  type,
}: HandleCriticalErrorParams): Promise<void> {
  const errorMessage = (error as Error)?.message || 'Неизвестная ошибка';

  // Determine if this is an autobooking or reschedule based on the presence of supplyId
  const isReschedule = type === 'reschedule';

  try {
    // Get error configuration or use defaults
    const errorConfig = CRITICAL_BOOKING_ERRORS[errorMessage] || {
      status: 'ERROR',
      message: errorMessage,
    };

    // Update the appropriate table based on the type
    if (isReschedule) {
      await prisma.autobookingReschedule.update({
        where: { id: entity.id },
        data: { status: errorConfig.status },
      });
    } else {
      await prisma.autobooking.update({
        where: { id: entity.id },
        data: { status: errorConfig.status },
      });
    }

    // Send notification to the user with appropriate message
    const operationType = isReschedule
      ? 'переноса поставки'
      : 'автобронирования';
    const taskType = isReschedule ? 'переноса' : 'автобронирования';

    const notificationMessage = `❌ Ошибка ${operationType}:

🏢 Склад: ${warehouseName}
📅 Дата: ${effectiveDate.toLocaleDateString('ru-RU')}
❗️ ${errorConfig.message}
ℹ️ Статус этого задания ${taskType} был изменен на "${errorConfig.status === 'ARCHIVED' ? 'АРХИВНЫЙ' : 'ОШИБКА'}" и помещен в список с архивными. Задание больше не будет активно.`;

    if (user.chatId && TBOT) {
      await TBOT.sendMessage(user.chatId, notificationMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'ℹ️ Поддержка', url: 'https://t.me/wb_booking_support' }],
            [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
          ],
        },
      });
    }

    // Notify admin
    const adminUser = await prisma.user.findFirst({
      where: {
        id: 4,
      },
    });
    if (adminUser?.chatId && TBOT) {
      await TBOT.sendMessage(adminUser.chatId, notificationMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
          ],
        },
      });
    }
  } catch (dbError) {
    console.error(
      `Failed to update database or send notification for critical error on ${type} ID ${entity.id}:`,
      dbError,
    );
    // Optionally, add more robust fallback error handling here
  }
}

/**
 * Checks if the given error message is considered a critical booking error.
 * @param errorMessage - The error message string.
 * @returns True if the error is critical, false otherwise.
 */
function isCriticalBookingError(errorMessage: string): boolean {
  return Object.keys(CRITICAL_BOOKING_ERRORS).includes(errorMessage);
}

export const bookingErrorService = {
  handleCriticalBookingError,
  isCriticalBookingError,
};
