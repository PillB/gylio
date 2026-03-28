const { ApiError } = require('../lib/errors');

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const validatorByType = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  integer: (value) => Number.isInteger(value),
  boolean: (value) => typeof value === 'boolean',
  array: (value) => Array.isArray(value),
  object: (value) => isObject(value)
};

const validateSchema = (data, schema, { partial = false } = {}) => {
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];
    const hasValue = value !== undefined;

    if (!partial && rules.required && !hasValue) {
      errors.push({ field, message: 'Field is required' });
      return;
    }

    if (!hasValue) return;

    if (value === null) {
      if (!rules.nullable) {
        errors.push({ field, message: 'Field cannot be null' });
      }
      return;
    }

    const typeValidator = validatorByType[rules.type];
    if (!typeValidator || !typeValidator(value)) {
      errors.push({ field, message: `Expected type ${rules.type}` });
      return;
    }

    if (typeof rules.min === 'number' && typeof value === 'number' && value < rules.min) {
      errors.push({ field, message: `Must be >= ${rules.min}` });
    }

    if (typeof rules.maxLength === 'number' && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push({ field, message: `Length must be <= ${rules.maxLength}` });
    }

    if (Array.isArray(rules.enum) && !rules.enum.includes(value)) {
      errors.push({ field, message: `Must be one of: ${rules.enum.join(', ')}` });
    }

    if (typeof rules.custom === 'function') {
      const message = rules.custom(value, data);
      if (message) {
        errors.push({ field, message });
      }
    }
  });

  return errors;
};

const validateBody = (schema, options = {}) => (req, _res, next) => {
  if (!isObject(req.body)) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object', [{ field: 'body', message: 'Expected object' }]));
  }

  const errors = validateSchema(req.body, schema, options);
  if (errors.length) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', errors));
  }
  return next();
};

module.exports = {
  validateBody,
  validateSchema
};
