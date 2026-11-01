-- 1. New complaint statuses for the full resolution workflow
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'REOPENED';

-- 2. Resolution evidence columns on complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS resolution_remarks text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0;

-- 3. Media classification: citizen evidence vs before/after resolution proof
ALTER TABLE public.complaint_media
  ADD COLUMN IF NOT EXISTS media_kind text NOT NULL DEFAULT 'EVIDENCE';

-- 4. Duplicate-notification prevention via unique event id
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_id_key
  ON public.notifications (event_id)
  WHERE event_id IS NOT NULL;

-- 5. Citizen verification of a resolution
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS still_exists boolean NOT NULL DEFAULT false;

-- 6. Escalation history
CREATE TABLE public.complaint_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1,
  reason text,
  escalated_by uuid,
  from_department_id uuid REFERENCES public.departments(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.complaint_escalations TO authenticated;
GRANT ALL ON public.complaint_escalations TO service_role;
ALTER TABLE public.complaint_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations follow complaint access" ON public.complaint_escalations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_escalations.complaint_id));
CREATE POLICY "staff escalates complaints" ON public.complaint_escalations
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

-- 7. Department officers can upload resolution proof photos
CREATE POLICY "complaint media staff insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'complaint-media') AND public.is_staff(auth.uid()));

DROP POLICY "owner inserts media" ON public.complaint_media;
CREATE POLICY "owner or staff inserts media" ON public.complaint_media
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_media.complaint_id
      AND (c.citizen_id = auth.uid() OR is_staff(auth.uid()))
  ));

-- 8. Tighten insert/update policies flagged by the security scan
DROP POLICY "insert notifications" ON public.notifications;
CREATE POLICY "own or staff inserts notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_staff(auth.uid()));

DROP POLICY "any user writes audit" ON public.audit_logs;
CREATE POLICY "own or staff writes audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_staff(auth.uid()));

DROP POLICY "staff updates complaints" ON public.complaints;
CREATE POLICY "staff updates complaints" ON public.complaints
  FOR UPDATE TO authenticated
  USING ((assigned_officer_id = auth.uid())
         OR has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
         OR (has_role(auth.uid(), 'DEPARTMENT_ADMIN'::app_role)
             AND assigned_department_id = my_department()))
  WITH CHECK ((assigned_officer_id = auth.uid())
         OR has_role(auth.uid(), 'SUPER_ADMIN'::app_role)
         OR (has_role(auth.uid(), 'DEPARTMENT_ADMIN'::app_role)
             AND assigned_department_id = my_department()));