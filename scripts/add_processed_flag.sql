-- Add processed flag to job_lines table
ALTER TABLE job_lines ADD COLUMN processed BOOLEAN DEFAULT FALSE;

-- Add processed flag to quotes table for consistency
ALTER TABLE quotes ADD COLUMN processed BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX idx_job_lines_processed ON job_lines(processed);
CREATE INDEX idx_quotes_processed ON quotes(processed);
