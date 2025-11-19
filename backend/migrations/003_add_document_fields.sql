-- AddDocumentFieldsToDentistProfiles
ALTER TABLE "dentist_profiles" 
ADD COLUMN IF NOT EXISTS "sip_file_path" TEXT,
ADD COLUMN IF NOT EXISTS "str_file_path" TEXT,
ADD COLUMN IF NOT EXISTS "ijazah_file_paths" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "certification_file_paths" TEXT[] DEFAULT '{}';
