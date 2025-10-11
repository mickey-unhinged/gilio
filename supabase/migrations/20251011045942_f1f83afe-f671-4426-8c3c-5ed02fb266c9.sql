-- Add assigned_to column to tickets table for admin assignment
ALTER TABLE public.tickets
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Add index for better performance
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);

-- Update RLS policy to allow admins to view tickets assigned to them
CREATE POLICY "Admins can view assigned tickets"
ON public.tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (assigned_to IS NULL OR assigned_to = auth.uid())
);

-- Create FAQ table
CREATE TABLE public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Anyone can view FAQs
CREATE POLICY "Anyone can view FAQs"
ON public.faqs
FOR SELECT
USING (true);

-- Only admins can create FAQs
CREATE POLICY "Admins can create FAQs"
ON public.faqs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update FAQs
CREATE POLICY "Admins can update FAQs"
ON public.faqs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete FAQs
CREATE POLICY "Admins can delete FAQs"
ON public.faqs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_faqs_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();