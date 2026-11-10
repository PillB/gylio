import React from 'react';
import { HelpTopic } from './HelpTopic';

type Props = {
  /** The help button, if the section has one. */
  help?: React.ReactNode;
  /** Space under the row; the heading itself has no margin. */
  spaceBelow?: number | string;
  children: React.ReactNode;
};

/**
 * A section heading (h3) with its help button beside it. The button is not inside the heading:
 * there it became part of the heading's name ("Scheduled events Information") in a screen
 * reader's list of headings.
 */
const HelpHeading: React.FC<Props> = ({ help, spaceBelow = 0, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: spaceBelow, minWidth: 0 }}>
    <h3 style={{ margin: 0 }}>{children}</h3>
    <HelpTopic topic={children}>{help}</HelpTopic>
  </div>
);

export default HelpHeading;
