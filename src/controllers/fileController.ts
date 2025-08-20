import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getCorsHeaders } from '../config/cors.js';

const execAsync = promisify(exec);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/Volumes/Archives/Next-Label/database';

/**
 * Generate thumbnail for uploaded PDF
 */
async function generateThumbnail(pdfPath: string, thumbnailPath: string): Promise<void> {
  try {
    const thumbnailDir = path.dirname(thumbnailPath);
    await fs.mkdir(thumbnailDir, { recursive: true });
    
    // Use macOS sips command to convert PDF to PNG
    const command = `sips -s format png "${pdfPath}" --out "${thumbnailPath}" --resampleHeightWidthMax 1024`;
    await execAsync(command);
    
    console.log(`Generated thumbnail: ${thumbnailPath}`);
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${pdfPath}:`, error);
    // Don't throw error - thumbnail generation failure shouldn't fail upload
  }
}

/**
 * Handle file upload
 * POST /api/upload-file
 */
export async function uploadFile(req: Request, origin?: string): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customerName = formData.get('customerName') as string;
    const size = formData.get('size') as string;
    const quoteId = formData.get('quoteId') as string;
    const type = formData.get('type') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Create directory structure
    const dir = path.join(UPLOAD_DIR, customerName, size, quoteId, 'files');
    await fs.mkdir(dir, { recursive: true });

    // Save file
    const filePath = path.join(dir, file.name);
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filePath, new Uint8Array(buffer));

    // Generate thumbnail if it's a PDF
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const thumbnailDir = path.join(UPLOAD_DIR, customerName, size, quoteId, 'thumbs');
      const thumbnailName = file.name.replace(/\.pdf$/i, '.png');
      const thumbnailPath = path.join(thumbnailDir, thumbnailName);
      
      // Generate thumbnail asynchronously (don't wait for it)
      generateThumbnail(filePath, thumbnailPath).catch(error => {
        console.error('Thumbnail generation failed:', error);
      });
    }

    const relativePath = path.join(customerName, size, quoteId, 'files', file.name);

    return new Response(
      JSON.stringify({
        success: true,
        fileName: file.name,
        filePath: relativePath,
        message: 'File uploaded successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    console.error('File upload error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Get list of files
 * GET /api/get-files
 */
export async function getFiles(req: Request, origin?: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const customerName = url.searchParams.get('customerName');
    const size = url.searchParams.get('size');
    const quoteId = url.searchParams.get('quoteId');
    const type = url.searchParams.get('type');

    if (!customerName || !size || !quoteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    const dir = path.join(UPLOAD_DIR, customerName, size, quoteId, 'files');
    
    let files: string[] = [];
    try {
      const fileList = await fs.readdir(dir);
      files = fileList.filter(file => file.toLowerCase().endsWith('.pdf'));
    } catch (error) {
      // Directory doesn't exist, return empty array
      files = [];
    }

    const fileDetails = files.map(filename => ({
      filename,
      filePath: path.join(customerName, size, quoteId, 'files', filename)
    }));

    return new Response(
      JSON.stringify({
        success: true,
        files: fileDetails
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    console.error('Get files error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get files',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Get file content
 * GET /api/file-content
 */
export async function getFileContent(req: Request, origin?: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('filePath');

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file path provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);
    try {
      const fileBuffer = await fs.readFile(fullPath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'File not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }
  } catch (error) {
    console.error('Get file content error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get file content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Get file thumbnail
 * GET /api/file-thumbnail
 */
export async function getFileThumbnail(req: Request, origin?: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('filePath');

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file path provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // Convert PDF path to thumbnail path
    const thumbnailPath = filePath
      .replace('/files/', '/thumbs/')
      .replace(/\.pdf$/i, '.png');
    
    const fullThumbnailPath = path.join(UPLOAD_DIR, thumbnailPath);
    try {
      const fileBuffer = await fs.readFile(fullThumbnailPath);
      
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      // If thumbnail doesn't exist, try to generate it from the original PDF
      const originalPdfPath = path.join(UPLOAD_DIR, filePath);
      
      try {
        // Check if original PDF exists
        await fs.access(originalPdfPath);
        
        // Generate thumbnail
        await generateThumbnail(originalPdfPath, fullThumbnailPath);
        
        // Try to read the generated thumbnail
        const fileBuffer = await fs.readFile(fullThumbnailPath);
        
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            ...getCorsHeaders(origin),
          },
        });
      } catch (generateError) {
        console.error('Failed to generate thumbnail on demand:', generateError);
        
        // Return a placeholder image or 404
        return new Response(
          JSON.stringify({ success: false, error: 'Thumbnail not found and could not be generated' }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...getCorsHeaders(origin),
            },
          }
        );
      }
    }
  } catch (error) {
    console.error('Get file thumbnail error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get file thumbnail',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Check if quote files exist
 * POST /api/check-quote-files
 */
export async function checkQuoteFiles(req: Request, origin?: string): Promise<Response> {
  try {
    const body = await req.json();
    const { jobId, size, lineIdentifiers } = body;

    if (!jobId || !size) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    // This is a simplified implementation
    // In a real system, you'd check against the database and file system
    const hasFiles = false; // Placeholder logic

    return new Response(
      JSON.stringify({
        success: true,
        hasFiles
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    console.error('Check quote files error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to check quote files',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Import quote files
 * POST /api/import-quote-files
 */
export async function importQuoteFiles(req: Request, origin?: string): Promise<Response> {
  try {
    const body = await req.json();
    // Placeholder implementation
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote files imported successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error) {
    console.error('Import quote files error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to import quote files',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}

/**
 * Delete file
 * DELETE /api/delete-file
 */
export async function deleteFile(req: Request, origin?: string): Promise<Response> {
  try {
    const body = await req.json();
    const { filePath } = body;

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file path provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    try {
      await fs.unlink(fullPath);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'File deleted successfully'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'File not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        }
      );
    }
  } catch (error) {
    console.error('Delete file error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    );
  }
}
