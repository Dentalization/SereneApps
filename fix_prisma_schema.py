#!/usr/bin/env python3
import re

# Read the original schema
with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "r") as f:
    content = f.read()

# Snake case to camel case mapping for models that still need renaming
renames = [
    ('model chat_messages ', 'model ChatMessage '),
    ('model chat_room_members ', 'model ChatRoomMember '),
    ('model chat_rooms ', 'model ChatRoom '),
    ('model clinic_branches ', 'model ClinicBranch '),
    ('model clinic_facilities ', 'model ClinicFacility '),
    ('model clinic_gallery ', 'model ClinicGallery '),
    ('model clinic_highlights ', 'model ClinicHighlight '),
    ('model clinic_profiles ', 'model ClinicProfile '),
    ('model clinic_services ', 'model ClinicService '),
    ('model clinic_staff ', 'model ClinicStaff '),
    ('model clinics ', 'model Clinic '),
    ('model dentist_emr_records ', 'model DentistEMRRecord '),
    ('model dentist_profiles ', 'model DentistProfile '),
    ('model dentist_services ', 'model DentistService '),
    ('model notification_devices ', 'model NotificationDevice '),
    ('model notification_preferences ', 'model NotificationPreference '),
    ('model notifications ', 'model Notification '),
    ('model patient_profiles ', 'model PatientProfile '),
    ('model payment_intents ', 'model PaymentIntent '),
    ('model payment_ledgers ', 'model PaymentLedger '),
    ('model refresh_tokens ', 'model RefreshToken '),
    ('model service_dentist_assignments ', 'model ServiceDentistAssignment '),
    ('model user_devices ', 'model UserDevice '),
    ('model users ', 'model User '),
]

# Apply renames
for old, new in renames:
    content = content.replace(old, new)

# Now add @@map() directives to models that were renamed (if not already there)
# For each renamed model, we need to add @@map at the end before closing brace
model_to_table = {
    'ChatMessage': 'chat_messages',
    'ChatRoomMember': 'chat_room_members',
    'ChatRoom': 'chat_rooms',
    'ClinicBranch': 'clinic_branches',
    'ClinicFacility': 'clinic_facilities',
    'ClinicGallery': 'clinic_gallery',
    'ClinicHighlight': 'clinic_highlights',
    'ClinicProfile': 'clinic_profiles',
    'ClinicService': 'clinic_services',
    'ClinicStaff': 'clinic_staff',
    'Clinic': 'clinics',
    'DentistEMRRecord': 'dentist_emr_records',
    'DentistProfile': 'dentist_profiles',
    'DentistService': 'dentist_services',
    'NotificationDevice': 'notification_devices',
    'NotificationPreference': 'notification_preferences',
    'Notification': 'notifications',
    'PatientProfile': 'patient_profiles',
    'PaymentIntent': 'payment_intents',
    'PaymentLedger': 'payment_ledgers',
    'RefreshToken': 'refresh_tokens',
    'ServiceDentistAssignment': 'service_dentist_assignments',
    'UserDevice': 'user_devices',
    'User': 'users',
}

for model_name, table_name in model_to_table.items():
    # Pattern: find "model ModelName {" ... "}" and check if it already has @@map
    # If not, add it before closing brace
    pattern = rf"(model {model_name}\s*\{{[^}}]*?)(\n\}}\s*(?:$|\n))"
    
    def add_map_if_needed(match):
        model_content = match.group(1)
        closing = match.group(2)
        
        # Check if @@map already exists
        if f'@@map("{table_name}")' in model_content:
            return model_content + closing
        
        # Add @@map before closing brace
        return model_content + f'\n  @@map("{table_name}")' + closing
    
    content = re.sub(pattern, add_map_if_needed, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "w") as f:
    f.write(content)

print("✓ Schema models renamed and mapped!")
