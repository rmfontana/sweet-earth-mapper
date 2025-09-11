DROP FUNCTION IF EXISTS get_normalized_brix_1_to_2(uuid, numeric);
CREATE FUNCTION get_normalized_brix_1_to_2(crop_id_arg uuid, brix_value_arg numeric)
RETURNS numeric AS $$
DECLARE
    poor_brix numeric;
    excellent_brix numeric;
    denominator numeric;
BEGIN
    SELECT c.poor_brix, c.excellent_brix
    INTO poor_brix, excellent_brix
    FROM crops c
    WHERE c.id = crop_id_arg;

    denominator := excellent_brix - poor_brix;

    -- Handle the division by zero case explicitly
    IF denominator IS NULL OR denominator = 0 THEN
        -- Return a default average value (1.5) to prevent NaN
        RETURN 1.5;
    END IF;

    -- The calculation that was causing the error
    RETURN 1.0 + LEAST(1.0, GREATEST(0.0,
        (brix_value_arg - poor_brix) / denominator
    ));
END;
$$ LANGUAGE plpgsql;