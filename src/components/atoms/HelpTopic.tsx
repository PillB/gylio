import React, { createContext, useContext } from 'react';

const HelpTopicContext = createContext<string | null>(null);

type Props = {
  /** The visible label or heading the help belongs to. Anything but plain text names nothing. */
  topic: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Tells a help button what it explains, so its spoken name can be "Information: Income" instead of "Information".
 * A page had up to twenty help buttons with that one name, which a screen reader's list of buttons read out as
 * twenty identical lines. The components that put a help button beside a label or heading (HelpLabel, HelpField,
 * HelpHeading, SectionCard, SettingToggle) wrap it in this; a button placed by hand passes `about` instead.
 */
export const HelpTopic: React.FC<Props> = ({ topic, children }) => (
  <HelpTopicContext.Provider value={typeof topic === 'string' && topic.trim() ? topic.trim() : null}>{children}</HelpTopicContext.Provider>
);

export const useHelpTopic = (): string | null => useContext(HelpTopicContext);

export default HelpTopic;
