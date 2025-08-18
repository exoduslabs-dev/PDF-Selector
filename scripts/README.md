# PostgreSQL Label Production Management System

## Clean Database Schema

This directory contains the cleaned-up PostgreSQL schema for the Label Production Management System.

### Key Files

- **`schema.sql`** - Main schema file with comprehensive database structure
- **`clean_fresh_schema.sql`** - Source file (same content as schema.sql)
- **`backup/schema_original_backup.sql`** - Original schema with redundancy issues (backup only)

### Schema Features

✅ **Optimized Design**: No data redundancy between jobs and tools_library tables  
✅ **Comprehensive Coverage**: All 30+ tables from the database diagram  
✅ **Clean Structure**: No legacy compatibility - fresh, modern design  
✅ **PostgreSQL Optimized**: Uses PostgreSQL-specific features and data types  
✅ **Performance Ready**: Complete indexes and optimized views  
✅ **Sample Data**: Includes test data for immediate use  

### Database Structure

The schema includes:

- **Core Business**: Customers, Orders, Jobs
- **Materials**: Materials, Finishing Options, Shapes
- **Tools**: Centralized tools_library (single source of truth)
- **Production**: Machines, Operations, Job Operations
- **Scheduling**: Production Queue, Gang Runs
- **Costing**: Job Costing with calculated tool costs
- **Pricing**: Price Lists, Customer Price Lists
- **Workflow**: Rules Engine, Production Workflows

### Key Optimization

**REDUNDANCY ELIMINATED**: The original schema had duplicate tool data in both the `jobs` table and `tools_library` table. The clean schema:

- **jobs** table: Only has `tool_id` foreign key reference
- **tools_library** table: Contains all tool specifications (number_around, number_across, gap_around, gap_across, corner_radius, tool_cost_aud, lead_time_days)
- **Views**: Provide easy access to combined job + tool data

### Usage

To apply the schema to your PostgreSQL database:

```bash
psql -h localhost -p 5432 -d jobmanager -U user -f scripts/schema.sql
```

Or from the root directory:
```bash
psql -h localhost -p 5432 -d jobmanager -U user -f schema.sql
```

### Views for Data Access

The schema includes optimized views:

- **`jobs_complete`** - Jobs with tool specifications and related data
- **`job_costing_complete`** - Job costing with calculated tool costs
- **`production_queue_complete`** - Production queue with machine and job details

### Benefits

1. **Data Consistency** - Tool specs in one place only
2. **Reduced Storage** - No duplicate columns
3. **Easier Maintenance** - Update tool specs in one table
4. **Better Performance** - Smaller jobs table, optimized joins
5. **Data Integrity** - Foreign key constraints prevent orphaned data

---

*This schema represents a clean, optimized, production-ready database structure for comprehensive label production management.*
