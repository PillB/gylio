import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Task } from '../../../core/hooks/useDB';
import type { EventForm } from '../hooks/useEventForm';
import type { EventFields, ValidatedField } from '../utils/eventFields';
import type { ThemeTokens } from '../../../core/themes';
import { fieldControlStyle } from './calendarStyles';
import CalendarHelp, { type CalendarHelpTopic } from './CalendarHelp';
import HelpField from '../../../components/atoms/HelpField';

const VALIDATED_LABELS: Record<ValidatedField, true> = { title: true, startDate: true, endDate: true, reminderMinutesBefore: true };

type FieldProps = {
  form: EventForm;
  name: keyof EventFields;
  labelKey: string;
  help: CalendarHelpTopic;
  type?: 'text' | 'datetime-local' | 'number';
};

const FormField: React.FC<FieldProps> = ({ form, name, labelKey, help, type = 'text' }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const error = name in VALIDATED_LABELS ? form.errorFor(name as ValidatedField) : '';
  return (
    <HelpField label={t(labelKey)} help={<CalendarHelp topic={help} />} error={error || undefined} style={fieldStackStyle(theme)} labelStyle={LABEL_STYLE}>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        value={form.fields[name]}
        onChange={(event) => form.setField(name, event.target.value)}
        style={fieldControlStyle(theme)}
      />
    </HelpField>
  );
};

const LABEL_STYLE: React.CSSProperties = { fontWeight: 600 };
const fieldStackStyle = (theme: ThemeTokens): React.CSSProperties => ({
  display: 'grid',
  gap: `${theme.spacing.xs}px`,
  gridTemplateColumns: 'minmax(0, 1fr)',
  minWidth: 0,
});

type Props = { form: EventForm; tasks: Task[] };

/** Title, times, place, notes, linked task and reminder for one event. */
const EventFormFields: React.FC<Props> = ({ form, tasks }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <div style={{ display: 'grid', gap: `${theme.spacing.sm}px`, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
      <FormField form={form} name="title" labelKey="titleLabel" help="title" />
      <FormField form={form} name="startDate" labelKey="calendarStartLabel" help="startDate" type="datetime-local" />
      <FormField form={form} name="endDate" labelKey="calendarEndLabel" help="endDate" type="datetime-local" />
      <FormField form={form} name="location" labelKey="calendarLocationLabel" help="location" />
      <FormField form={form} name="description" labelKey="calendarDescriptionLabel" help="description" />
      <HelpField label={t('calendarTaskLinkLabel')} help={<CalendarHelp topic="taskLink" />} style={fieldStackStyle(theme)} labelStyle={LABEL_STYLE}>
        <select value={form.fields.taskId} onChange={(event) => form.setField('taskId', event.target.value)} style={fieldControlStyle(theme)}>
          <option value="">{t('calendarTaskLinkNone')}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </HelpField>
      <FormField form={form} name="reminderMinutesBefore" labelKey="calendarReminderLabel" help="reminder" type="number" />
    </div>
  );
};

export default EventFormFields;
