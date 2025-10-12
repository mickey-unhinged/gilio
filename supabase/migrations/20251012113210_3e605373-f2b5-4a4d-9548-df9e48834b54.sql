-- 1) Ensure signup creates profiles and roles automatically
-- Create trigger for public.handle_new_user (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- 2) Strengthen RLS with admin verification checks across tables
-- Announcements
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
CREATE POLICY "Admins can create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_verified_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_verified_user(auth.uid()));

-- FAQs
DROP POLICY IF EXISTS "Admins can create FAQs" ON public.faqs;
CREATE POLICY "Admins can create FAQs"
ON public.faqs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_verified_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update FAQs" ON public.faqs;
CREATE POLICY "Admins can update FAQs"
ON public.faqs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_verified_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete FAQs" ON public.faqs;
CREATE POLICY "Admins can delete FAQs"
ON public.faqs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_verified_user(auth.uid()));

-- Tickets: ensure admins must be verified
DROP POLICY IF EXISTS "Admins can view assigned tickets" ON public.tickets;
CREATE POLICY "Admins can view assigned tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_verified_user(auth.uid())
  AND ((assigned_to IS NULL) OR (assigned_to = auth.uid()))
);

DROP POLICY IF EXISTS "Admins can view tickets from their university" ON public.tickets;
CREATE POLICY "Admins can view tickets from their university"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_verified_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.university = (
        SELECT student_profile.university FROM public.profiles student_profile
        WHERE student_profile.id = tickets.student_id
      )
  )
);

DROP POLICY IF EXISTS "Admins can update tickets from their university" ON public.tickets;
CREATE POLICY "Admins can update tickets from their university"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_verified_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.university = (
        SELECT student_profile.university FROM public.profiles student_profile
        WHERE student_profile.id = tickets.student_id
      )
  )
);

-- Chats: ensure admins must be verified, and enforce university isolation
DROP POLICY IF EXISTS "Users can create chats for their university tickets" ON public.chats;
CREATE POLICY "Users can create chats for their university tickets"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = sender_id)
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.profiles student_profile ON t.student_id = student_profile.id
    JOIN public.profiles user_profile ON user_profile.id = auth.uid()
    WHERE t.id = chats.ticket_id
      AND (
        t.student_id = auth.uid()
        OR (
          public.has_role(auth.uid(), 'admin'::app_role)
          AND public.is_verified_user(auth.uid())
          AND student_profile.university = user_profile.university
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can view chats for their university tickets" ON public.chats;
CREATE POLICY "Users can view chats for their university tickets"
ON public.chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.profiles student_profile ON t.student_id = student_profile.id
    JOIN public.profiles user_profile ON user_profile.id = auth.uid()
    WHERE t.id = chats.ticket_id
      AND (
        t.student_id = auth.uid()
        OR (
          public.has_role(auth.uid(), 'admin'::app_role)
          AND public.is_verified_user(auth.uid())
          AND student_profile.university = user_profile.university
        )
      )
  )
);

-- 3) Allow verified admins to verify admins within their university
DROP POLICY IF EXISTS "Verified admins can verify admins in their university" ON public.user_roles;
CREATE POLICY "Verified admins can verify admins in their university"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_verified_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.profiles target_profile ON target_profile.id = user_roles.user_id
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.university = target_profile.university
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND public.is_verified_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    JOIN public.profiles target_profile ON target_profile.id = user_roles.user_id
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.university = target_profile.university
  )
);

-- 4) Backend automation: auto-set ticket to In Progress when a verified admin replies
CREATE OR REPLACE FUNCTION public.set_ticket_in_progress_on_admin_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(NEW.sender_id, 'admin'::app_role) AND public.is_verified_user(NEW.sender_id) THEN
    UPDATE public.tickets
      SET status = 'In Progress', updated_at = now()
      WHERE id = NEW.ticket_id AND status = 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_chat_insert_set_in_progress'
  ) THEN
    CREATE TRIGGER on_chat_insert_set_in_progress
      AFTER INSERT ON public.chats
      FOR EACH ROW EXECUTE PROCEDURE public.set_ticket_in_progress_on_admin_chat();
  END IF;
END $$;
