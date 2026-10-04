-- Create the storage bucket for documents
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', true)
on conflict (id) do nothing;


-- Allow all operations for authenticated users on the 'documents' bucket
create policy "Authenticated users can upload documents" 
on storage.objects for insert 
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

create policy "Users can view own documents" 
on storage.objects for select 
using ( bucket_id = 'documents' and auth.uid() = owner );

create policy "Users can update own documents" 
on storage.objects for update 
using ( bucket_id = 'documents' and auth.uid() = owner );

create policy "Users can delete own documents" 
on storage.objects for delete 
using ( bucket_id = 'documents' and auth.uid() = owner );
