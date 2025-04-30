import { Response } from 'express';
import { ResponseType } from '../types/httpResponses';

/**
 * Utility function to send a standardized response.
 * It sends a JSON response with the specified status code, success flag, message, and optional data.
 *
 * @param {Response} res - The response object.
 * @param {number} statusCode - The HTTP status code to send.
 * @param {boolean} success - Indicates if the response is successful or not.
 * @param {string} message - The message to include in the response.
 * @param {object} data - Data to include in the response.
 */
const sendResponse = (res: Response, statusCode: number, success: boolean, message: string, data: object = {}): void => {
  const response: ResponseType = { success, message, ...({ data }) };
  res.status(statusCode).json(response);
};

/**
 * Sends a success response.
 * It includes a message and data in the response.
 *
 * @param {Response} res - The response object.
 * @param {number} statusCode - The HTTP status code to send.
 * @param {string} message - The success message to include in the response.
 * @param {object} data - Data to include in the response.
 */
export const sendSuccess = (res: Response, statusCode: number, message: string, data: object): void => {
  sendResponse(res, statusCode, true, message, data);
};

/**
 * Sends an error response.
 * It includes a message in the response.
 *
 * @param {Response} res - The response object.
 * @param {number} statusCode - The HTTP status code to send.
 * @param {string} message - The error message to include in the response.
 */
export const sendError = (res: Response, statusCode: number, message: string): void => {
  sendResponse(res, statusCode, false, message);
};
