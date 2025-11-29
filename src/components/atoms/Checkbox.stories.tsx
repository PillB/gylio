import React, { useState } from 'react';
import Checkbox, { CheckedIndicator, UncheckedIndicator } from './Checkbox';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '../../core/context/ThemeContext';
import { AccessibilityProvider } from '../../core/hooks/useAccessibility';
import { OnboardingFlowProvider } from '../../hooks/useOnboardingFlow.jsx';
import i18n from '../../i18n/i18n';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    <OnboardingFlowProvider>
      <ThemeProvider>
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </ThemeProvider>
    </OnboardingFlowProvider>
  </I18nextProvider>
);

export default {
  title: 'Atoms/Checkbox',
  component: Checkbox
};

export const BasicCheckbox = () => {
  const [checked, setChecked] = useState(false);

  return (
    <Providers>
      <Checkbox
        id="checkbox-basic"
        labelKey="tasks.title"
        helperTextKey="tasks.description"
        checked={checked}
        onChange={setChecked}
      />
    </Providers>
  );
};

export const InlineHelper = () => {
  const [checked, setChecked] = useState(true);

  return (
    <Providers>
      <Checkbox
        id="checkbox-inline"
        label="Prepare a checklist"
        helperText="Use this pattern in forms and list rows"
        checked={checked}
        onChange={setChecked}
      />
    </Providers>
  );
};

export const IndicatorsGallery = () => (
  <Providers>
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <CheckedIndicator />
      <UncheckedIndicator />
    </div>
  </Providers>
);
