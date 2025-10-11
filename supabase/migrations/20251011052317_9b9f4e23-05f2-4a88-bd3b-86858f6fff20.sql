-- Add verification field to user_roles
ALTER TABLE public.user_roles ADD COLUMN is_verified BOOLEAN DEFAULT true;

-- Set admins to unverified by default (students auto-verified)
ALTER TABLE public.user_roles 
  ALTER COLUMN is_verified SET DEFAULT false;

-- Update existing records: students verified, admins need verification
UPDATE public.user_roles 
SET is_verified = CASE 
  WHEN role = 'student' THEN true 
  ELSE false 
END;

-- Create function to check if user is verified admin or student
CREATE OR REPLACE FUNCTION public.is_verified_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND is_verified = true
  )
$$;

-- Update tickets RLS for university isolation
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Students can view own tickets" ON public.tickets;

CREATE POLICY "Admins can view tickets from their university"
ON public.tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.university = (
      SELECT university FROM public.profiles student_profile 
      WHERE student_profile.id = tickets.student_id
    )
  )
);

CREATE POLICY "Students can view own tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = student_id);

-- Update chats RLS for university isolation  
DROP POLICY IF EXISTS "Users can view chats for their tickets" ON public.chats;

CREATE POLICY "Users can view chats for their university tickets"
ON public.chats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    INNER JOIN public.profiles student_profile ON t.student_id = student_profile.id
    INNER JOIN public.profiles user_profile ON user_profile.id = auth.uid()
    WHERE t.id = chats.ticket_id
    AND (
      (t.student_id = auth.uid()) -- Student viewing own ticket
      OR (has_role(auth.uid(), 'admin'::app_role) AND student_profile.university = user_profile.university) -- Admin from same university
    )
  )
);

-- Update chats INSERT policy for university isolation
DROP POLICY IF EXISTS "Users can create chats for their tickets" ON public.chats;

CREATE POLICY "Users can create chats for their university tickets"
ON public.chats
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    INNER JOIN public.profiles student_profile ON t.student_id = student_profile.id
    INNER JOIN public.profiles user_profile ON user_profile.id = auth.uid()
    WHERE t.id = chats.ticket_id
    AND (
      (t.student_id = auth.uid())
      OR (has_role(auth.uid(), 'admin'::app_role) AND student_profile.university = user_profile.university)
    )
  )
);

-- Update admin ticket update policy for university isolation
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;

CREATE POLICY "Admins can update tickets from their university"
ON public.tickets
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.university = (
      SELECT university FROM public.profiles student_profile 
      WHERE student_profile.id = tickets.student_id
    )
  )
);