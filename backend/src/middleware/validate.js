export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      const issues = error?.issues || error?.errors;
      if (issues) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Data tidak valid',
          errors: issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};
