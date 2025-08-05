-- CROPS
ALTER TABLE public.crops ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (LOWER(name)) STORED;
CREATE UNIQUE INDEX crops_name_normalized_unique ON public.crops(name_normalized);
CREATE INDEX crops_name_idx ON public.crops(name_normalized);

-- BRANDS
ALTER TABLE public.brands ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (LOWER(name)) STORED;
CREATE UNIQUE INDEX brands_name_normalized_unique ON public.brands(name_normalized);
CREATE INDEX brands_name_idx ON public.brands(name_normalized);

-- STORES
ALTER TABLE public.stores ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (LOWER(name)) STORED;
CREATE UNIQUE INDEX stores_name_normalized_unique ON public.stores(name_normalized);
CREATE INDEX stores_name_idx ON public.stores(name_normalized);
