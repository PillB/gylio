export const collectValidationMessages = (validation) => {
  const messages = Object.values(validation).filter(Boolean);
  return [...new Set(messages)];
};

export const hasValidationErrors = (validation) => Object.values(validation).some(Boolean);

export const logValidationSummary = (context, messages) => {
  if (!messages.length) return;
  console.warn(`[Validation] ${context}`, messages);
};
