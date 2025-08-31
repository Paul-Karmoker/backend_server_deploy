import Joi from 'joi';

export const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
  if (error) {
    res.status(400);
    return next(new Error(error.details.map((d) => d.message).join(', ')));
  }
  req[property] = value;
  next();
};

export const initSchema = Joi.object({
  //userId: Joi.string().hex().length(24).required(),
  jobTitle: Joi.string().min(2).max(120).required(),
  experienceYears: Joi.number().integer().min(0).max(50).default(0),
  skills: Joi.array().items(Joi.string().min(1).max(64)).default([]),
  jobDescription: Joi.string().allow('').max(10000).default(''),
  durationMinutes: Joi.number().integer().min(1).max(240).default(20)
});

export const answerSchema = Joi.object({
  sessionId: Joi.string().hex().length(24).required(),
  answer: Joi.string().allow('').max(20000).required()
});
