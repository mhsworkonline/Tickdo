import { fireEvent, render, screen } from '@testing-library/react-native';

import DisclaimerStep from '@/app/onboarding/disclaimer';
import LanguageStep from '@/app/onboarding/index';
import { i18n, initI18n } from '@/i18n';
import { AppStateProvider } from '@/state/app-state';
import { loadPreferences } from '@/storage/preferences';
import { secureStoreMock } from '@/test-utils/secure-store-mock';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted and cannot use imports
jest.mock('expo-secure-store', () => require('@/test-utils/secure-store-mock').secureStoreMock);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const emptyPrefs = { language: null, disclaimerAcceptedAt: null };

beforeEach(async () => {
  secureStoreMock.reset();
  await initI18n('en');
});

describe('onboarding', () => {
  it('shows the doctor/pharmacist disclaimer and records acceptance', async () => {
    await render(
      <AppStateProvider initial={{ language: 'en', disclaimerAcceptedAt: null }}>
        <DisclaimerStep />
      </AppStateProvider>,
    );

    expect(screen.getByText(/does not replace a doctor or pharmacist/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('accept-disclaimer'));

    const prefs = await loadPreferences();
    expect(prefs.disclaimerAcceptedAt).not.toBeNull();
  });

  it('choosing Hindi persists the language and switches the UI', async () => {
    await render(
      <AppStateProvider initial={emptyPrefs}>
        <LanguageStep />
      </AppStateProvider>,
    );

    await fireEvent.press(screen.getByTestId('language-hi'));

    expect(i18n.language).toBe('hi');
    expect((await loadPreferences()).language).toBe('hi');
    expect(screen.getByText('अपनी भाषा चुनें')).toBeOnTheScreen();
  });

  it('accept button meets the 48dp minimum touch target', async () => {
    await render(
      <AppStateProvider initial={emptyPrefs}>
        <DisclaimerStep />
      </AppStateProvider>,
    );
    const button = screen.getByTestId('accept-disclaimer');
    expect(button).toHaveStyle({ minHeight: 48, minWidth: 48 });
  });
});
