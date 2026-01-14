#!/usr/bin/env python3
"""
Generate a corrected Prisma schema with camelCase models and proper field mappings
"""

import re

# Read the original schema
with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "r") as f:
    content = f.read()

# Function to convert snake_case to camelCase
def snake_to_camel(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

# Function to convert model name from snake_case to camelCase
def fix_model_name(match):
    model_keyword = match.group(1)
    model_name = match.group(2)
    rest = match.group(3)
    
    # Convert model name to camelCase
    camel_name = snake_to_camel(model_name) if '_' in model_name else model_name
    
    return f"{model_keyword} {camel_name}{rest}"

# Replace model definitions
content = re.sub(r"^(model|enum)\s+(\w+)\s*(\{|$)", fix_model_name, content, flags=re.MULTILINE)

# Add @@map directives to models that had snake_case names
def add_map_directive(match):
    model_content = match.group(1)
    closing_brace = match.group(2)
    
    # Extract original model name (now in camelCase at start of match)
    # We need to track which models need @@map
    snake_case_models = [
        'appointment_status_history', 'appointments', 'chat_messages', 'chat_room_members',
        'chat_rooms', 'clinic_branches', 'clinic_facilities', 'clinic_gallery', 'clinic_highlights',
        'clinic_profiles', 'clinic_services', 'clinic_staff', 'clinics', 'dentist_emr_records',
        'dentist_profiles', 'dentist_services', 'notification_devices', 'notification_jobs',
        'notification_preferences', 'notifications', 'patient_profiles', 'payment_intents',
        'payment_ledgers', 'refresh_tokens', 'service_dentist_assignments', 'user_devices',
        'users', 'ai_analysis_results'
    ]
    
    return model_content + closing_brace

# Now add @@map() directives for models
for snake_name in ['appointment_status_history', 'appointments', 'chat_messages', 'chat_room_members',
                    'chat_rooms', 'clinic_branches', 'clinic_facilities', 'clinic_gallery', 'clinic_highlights',
                    'clinic_profiles', 'clinic_services', 'clinic_staff', 'clinics', 'dentist_emr_records',
                    'dentist_profiles', 'dentist_services', 'notification_devices', 'notification_jobs',
                    'notification_preferences', 'notifications', 'patient_profiles', 'payment_intents',
                    'payment_ledgers', 'refresh_tokens', 'service_dentist_assignments', 'user_devices',
                    'users', 'ai_analysis_results']:
    
    camel_name = snake_to_camel(snake_name) if '_' in snake_name else snake_name
    
    # Find the model and add @@map right before closing brace
    pattern = f"(model {camel_name} {{[^}}]*?)(\n}}\s*$)"
    
    def add_map(m):
        return m.group(1) + f'\n  @@map("{snake_name}")' + m.group(2)
    
    content = re.sub(pattern, add_map, content, flags=re.MULTILINE | re.DOTALL, count=1)

# Save the corrected schema
with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "w") as f:
    f.write(content)

print("Schema fixed!")
