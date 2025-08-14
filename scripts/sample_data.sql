-- Sample data for testing the quotes and jobs display

-- Insert sample customers
INSERT INTO customers (id, customerId, customerName, customerContactName, customerContactEmail) VALUES
('cust-1', 'CUST001', 'Acme Corporation', 'John Smith', 'john@acme.com'),
('cust-2', 'CUST002', 'Beta Industries', 'Jane Doe', 'jane@beta.com')
ON CONFLICT DO NOTHING;

-- Insert sample quotes
INSERT INTO quotes (id, quoteId, quoteLineId, quoteDate, status, changeHistory) VALUES
('quote-1', 'Q2024-001', 'QL001', '2024-08-01', 'Active', 'Initial quote created'),
('quote-2', 'Q2024-001', 'QL002', '2024-08-01', 'Active', 'Additional line added'),
('quote-3', 'Q2024-002', 'QL003', '2024-08-02', 'Pending', 'Awaiting customer approval')
ON CONFLICT DO NOTHING;

-- Insert sample job lines
INSERT INTO job_lines (
  id, lineIdentifier, jobId, jobLineId, jobName, orderDate, dueDate, 
  customerId, productName, quantity, materialName, printColour, quoteId
) VALUES
('job-1', 'JL001', 'J2024-001', 'JL001', 'Business Cards Print Job', '2024-08-03', '2024-08-10', 
 'CUST001', 'Business Cards', 1000, 'Premium Cardstock', 'Full Color', 'Q2024-001'),
('job-2', 'JL002', 'J2024-001', 'JL002', 'Letterhead Print Job', '2024-08-03', '2024-08-10', 
 'CUST001', 'Letterhead', 500, 'Premium Paper', 'Black + PMS', 'Q2024-001'),
('job-3', 'JL003', 'J2024-002', 'JL003', 'Brochure Print Job', '2024-08-04', '2024-08-12', 
 'CUST002', 'Tri-fold Brochure', 250, 'Glossy Paper', 'Full Color', 'Q2024-002')
ON CONFLICT DO NOTHING;
