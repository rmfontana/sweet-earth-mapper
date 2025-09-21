-- Migration: add trigger to update user points on submission

CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    points = COALESCE(points, 0) + 10
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS submissions_after_insert_points ON public.submissions;
CREATE TRIGGER submissions_after_insert_points
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points();
