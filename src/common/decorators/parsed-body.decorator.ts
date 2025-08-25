import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';

export const ParsedBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const logger = new Logger('ParsedBodyDecorator');

    if (!request.body || typeof request.body !== 'object') return request.body;
    try {
      Object.keys(request.body).forEach((key) => {
        if (typeof request.body[key] === 'string') {
          const strValue = request.body[key].trim();

          if (key == 'phone') {
            request.body[key] = strValue;
          } else if (strValue.toLowerCase() === 'true') {
            request.body[key] = true;
          } else if (strValue.toLowerCase() === 'false') {
            request.body[key] = false;
          } else if (!isNaN(Number(strValue)) && strValue !== '') {
            request.body[key] = Number(strValue);
          } else {
            try {
              request.body[key] = JSON.parse(strValue);
            } catch (error) {
              logger.warn(
                `Failed to parse JSON for key "${key}": ${error.message}`,
              );
            }
          }
        }
      });
    } catch (error) {
      logger.warn('Error parsing request body:', error.message);
      throw new BadRequestException('Invalid JSON format in request body');
    }
    return request.body;
  },
);
