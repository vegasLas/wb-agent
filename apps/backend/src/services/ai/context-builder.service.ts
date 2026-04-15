import { prisma } from '@/config/database';

export async function buildContextMessage(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: { include: { suppliers: true } },
      autobookings: { orderBy: { createdAt: 'desc' }, take: 5 },
      supplyTriggers: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!user) throw new Error('User not found');

  const suppliers = user.accounts.flatMap(a => a.suppliers);
  const supplierList = suppliers.map(s => `- ${s.supplierName} (ID: ${s.supplierId})`).join('\n');

  const autobookingList = user.autobookings
    .map(ab => `- ${ab.id}: ${ab.supplyType} @ ${ab.warehouseId} [${ab.status}]`)
    .join('\n');

  const triggerList = user.supplyTriggers
    .map(t => `- ${t.id}: warehouses=[${t.warehouseIds.join(',')}] [${t.status}]`)
    .join('\n');

  return `Ты — AI-ассистент для продавцов на Wildberries.
Помогаешь управлять автобронированием (autobooking) и таймслотами (triggers).

### Правила
1. Всегда проверяй баланс кредитов пользователя перед созданием autobooking.
2. Не раскрывай чужие данные.
3. Перед удалением требуй явного подтверждения.
4. Отвечай на языке пользователя (русский по умолчанию).
5. Если нужен ID или account, которого пользователь не предоставил — спроси. Не угадывай ID.
6. Поддерживаются одиночные вызовы, последовательные вызовы и параллельные вызовы инструментов.
7. Всегда кратко суммируй результат инструмента своими словами для пользователя.

### Данные пользователя
- ID: ${user.id}
- Кредиты (autobookingCount): ${user.autobookingCount ?? 0}

### Поставщики
${supplierList || 'Нет поставщиков'}

### Активные autobooking (последние 5)
${autobookingList || 'Нет autobooking'}

### Триггеры (последние 5)
${triggerList || 'Нет триггеров'}

Сегодня: ${new Date().toISOString().split('T')[0]}
`;
}
