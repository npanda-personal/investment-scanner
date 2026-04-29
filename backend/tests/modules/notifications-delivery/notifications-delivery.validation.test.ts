/// <reference types="@types/jest" />
import { validatePreferences } from '../../../src/modules/notifications-delivery';

describe('notifications delivery validation', () => {
  it('accepts valid preference updates', () => {
    expect(validatePreferences({
      emailNotificationsEnabled: true,
      alertEmailsEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: null,
    })).toEqual([]);
  });

  it('rejects invalid boolean and quiet-hour values', () => {
    expect(validatePreferences({
      emailNotificationsEnabled: 'yes' as any,
      quietHoursStart: '10pm',
    })).toEqual([
      'emailNotificationsEnabled must be a boolean',
      'quietHoursStart must use HH:mm format',
    ]);
  });
});
