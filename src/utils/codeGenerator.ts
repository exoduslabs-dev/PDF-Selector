// Code generation utilities for materials, jobs, quotes, etc.

/**
 * Generate a unique material code
 */
export const generateMaterialCode = (): string => {
  const timestamp = Date.now();
  return `MAT-${timestamp}`;
};

/**
 * Generate a unique job ID
 */
export const generateJobId = (): number => {
  return Math.floor(Date.now() / 1000); // Unix timestamp in seconds
};

/**
 * Generate a unique quote ID
 */
export const generateQuoteId = (): number => {
  return Math.floor(Date.now() / 1000); // Unix timestamp in seconds
};

/**
 * Generate a unique pricing ID
 */
export const generatePricingId = (): string => {
  const timestamp = Date.now();
  return `PRC-${timestamp}`;
};

/**
 * Generate a unique supplier ID
 */
export const generateSupplierId = (): string => {
  const timestamp = Date.now();
  return `SUP-${timestamp}`;
};

/**
 * Generate a unique line ID
 */
export const generateLineId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `LINE-${timestamp}-${random}`;
};

/**
 * Generate a unique process step ID
 */
export const generateStepId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `STEP-${timestamp}-${random}`;
};

/**
 * Generate a unique file reference ID
 */
export const generateFileId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `FILE-${timestamp}-${random}`;
};

/**
 * Generate a unique group ID
 */
export const generateGroupId = (): string => {
  const timestamp = Date.now();
  return `GRP-${timestamp}`;
};

/**
 * Sanitize a string for use in file names or codes
 */
export const sanitizeForCode = (input: string): string => {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Generate a human-readable reference code
 */
export const generateReference = (prefix: string, customerName?: string): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  let reference = `${prefix}-${year}${month}${day}`;
  
  if (customerName) {
    const sanitized = sanitizeForCode(customerName).slice(0, 8);
    reference += `-${sanitized}`;
  }
  
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  reference += `-${random}`;
  
  return reference;
};
