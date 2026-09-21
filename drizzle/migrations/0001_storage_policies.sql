-- complaint-media: authenticated users may read; owners write into their own folder
create policy "complaint media read" on storage.objects for select to authenticated
  using (bucket_id = 'complaint-media');
create policy "complaint media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'complaint-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "complaint media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'complaint-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: own folder only
create policy "avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "avatar write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents: staff read, own write
create policy "documents read staff" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (public.is_staff(auth.uid()) or (storage.foldername(name))[1] = auth.uid()::text));
create policy "documents write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);