import { Injectable, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class ResponseService {
  sendSuccess(
    res: Response,
    statusCode: HttpStatus = HttpStatus.OK,
    message: string,
    data: any = null,
  ) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data: data || {}, // Ensure data is an object, default to empty object
    });
  }

  sendError(
    res: Response,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    message: string,
    errors: any = null,
  ) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors !== null && { errors }), // Include errors only if provided
    });
  }
}
