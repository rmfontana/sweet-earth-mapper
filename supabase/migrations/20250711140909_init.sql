-- Enable UUID generation extension
create extension if not exists "pgcrypto";

-- Enable PostGIS for geospatial data support
-- Location-based queries: map filters or radius-based queries 
create extension if not exists postgis;