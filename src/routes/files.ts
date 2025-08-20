import type { RouteHandler } from '../types/common.js';
import {
  uploadFile,
  getFiles,
  getFileContent,
  getFileThumbnail,
  checkQuoteFiles,
  importQuoteFiles,
  deleteFile
} from '../controllers/fileController.js';

/**
 * Handle file-related routes
 */
export const handleFileRoutes: RouteHandler = async (req: Request, url: URL): Promise<Response | null> => {
  const origin = req.headers.get('origin') || undefined;

  // POST /api/upload-file - Upload a file
  if (url.pathname === '/api/upload-file' && req.method === 'POST') {
    return uploadFile(req, origin);
  }

  // GET /api/get-files - Get list of files
  if (url.pathname === '/api/get-files' && req.method === 'GET') {
    return getFiles(req, origin);
  }

  // GET /api/file-content - Get file content
  if (url.pathname === '/api/file-content' && req.method === 'GET') {
    return getFileContent(req, origin);
  }

  // GET /api/file-thumbnail - Get file thumbnail
  if (url.pathname === '/api/file-thumbnail' && req.method === 'GET') {
    return getFileThumbnail(req, origin);
  }

  // POST /api/check-quote-files - Check if quote files exist
  if (url.pathname === '/api/check-quote-files' && req.method === 'POST') {
    return checkQuoteFiles(req, origin);
  }

  // POST /api/import-quote-files - Import quote files
  if (url.pathname === '/api/import-quote-files' && req.method === 'POST') {
    return importQuoteFiles(req, origin);
  }

  // DELETE /api/delete-file - Delete a file
  if (url.pathname === '/api/delete-file' && req.method === 'DELETE') {
    return deleteFile(req, origin);
  }

  // No file routes matched
  return null;
};
