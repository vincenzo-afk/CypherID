# Audit Report Generation Workflow

1. Admin navigates to Audit Dashboard → Export Report
2. Specify date range and filters
3. Audit Service queries PostgreSQL events + Fabric blockchain for tx hashes
4. iText generates PDF with: event table, tx hashes, digital signature
5. PDF served as download
