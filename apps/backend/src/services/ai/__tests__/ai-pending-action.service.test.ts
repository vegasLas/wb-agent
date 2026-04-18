const mockDeleteMany = jest.fn();
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/config/database', () => ({
  prisma: {
    aiPendingAction: {
      deleteMany: mockDeleteMany,
      create: mockCreate,
      findUnique: mockFindUnique,
    },
  },
}));

import {
  createPendingAction,
  resolvePendingOption,
  clearPendingAction,
  getPendingAction,
} from '../ai-pending-action.service';

describe('ai-pending-action.service', () => {
  const convId = 'test-conv-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and retrieves a pending action', async () => {
    mockCreate.mockResolvedValue({
      id: 'action-1',
      conversationId: convId,
      actionType: 'autobooking_draft_choice',
      options: [{ number: 1, label: 'Draft A', value: 'draft-a' }],
      context: { warehouseId: 1187 },
    });

    const result = await createPendingAction(
      convId,
      'autobooking_draft_choice',
      [{ number: 1, label: 'Draft A', value: 'draft-a' }],
      { warehouseId: 1187 },
    );

    expect(result.actionType).toBe('autobooking_draft_choice');
    expect(result.context).toEqual({ warehouseId: 1187 });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { conversationId: convId } });
    expect(mockCreate).toHaveBeenCalled();
  });

  it('resolves option by number', async () => {
    mockFindUnique.mockResolvedValue({
      conversationId: convId,
      actionType: 'autobooking_draft_choice',
      options: [
        { number: 1, label: 'Draft A', value: 'draft-a' },
        { number: 2, label: 'Draft B', value: 'draft-b' },
      ],
      context: { warehouseId: 1187 },
      expiresAt: new Date(Date.now() + 60000),
    });

    const resolved = await resolvePendingOption(convId, '2');
    expect(resolved.resolved).toBe(true);
    expect(resolved.value).toBe('draft-b');
    expect(resolved.context).toEqual({ warehouseId: 1187 });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { conversationId: convId } });
  });

  it('resolves option by text with number', async () => {
    mockFindUnique.mockResolvedValue({
      conversationId: convId,
      actionType: 'autobooking_draft_choice',
      options: [{ number: 1, label: 'Draft A', value: 'draft-a' }],
      context: {},
      expiresAt: new Date(Date.now() + 60000),
    });

    const resolved = await resolvePendingOption(convId, 'опция 1');
    expect(resolved.resolved).toBe(true);
    expect(resolved.value).toBe('draft-a');
  });

  it('does not resolve invalid option', async () => {
    mockFindUnique.mockResolvedValue({
      conversationId: convId,
      actionType: 'autobooking_draft_choice',
      options: [{ number: 1, label: 'Draft A', value: 'draft-a' }],
      context: {},
      expiresAt: new Date(Date.now() + 60000),
    });

    const resolved = await resolvePendingOption(convId, '999');
    expect(resolved.resolved).toBe(false);
  });

  it('returns unresolved for expired action', async () => {
    mockFindUnique.mockResolvedValue({
      conversationId: convId,
      actionType: 'autobooking_draft_choice',
      options: [{ number: 1, label: 'Draft A', value: 'draft-a' }],
      context: {},
      expiresAt: new Date(Date.now() - 1000),
    });

    const resolved = await resolvePendingOption(convId, '1');
    expect(resolved.resolved).toBe(false);
  });
});
