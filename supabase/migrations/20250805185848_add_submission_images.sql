CREATE TABLE public.submission_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_images_submission_id ON public.submission_images(submission_id);
