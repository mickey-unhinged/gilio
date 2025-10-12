-- Fix university isolation leak for admin ticket visibility
-- The existing policy "Admins can view assigned tickets" allowed admins to see unassigned tickets across all universities.
-- We replace it with a version that ALSO requires the admin and the ticket's student to belong to the same university.

-- 1) Drop the overly-permissive policy
DROP POLICY IF EXISTS "Admins can view assigned tickets" ON public.tickets;

-- 2) Recreate it with university restriction in addition to assignment constraint
CREATE POLICY "Admins can view assigned tickets"
ON public.tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND is_verified_user(auth.uid())
  AND (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.university = (
          SELECT student_profile.university
          FROM public.profiles AS student_profile
          WHERE student_profile.id = public.tickets.student_id
        )
    )
  )
  AND ((assigned_to IS NULL) OR (assigned_to = auth.uid()))
);
