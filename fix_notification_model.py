#!/usr/bin/env python3
import re

with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "r") as f:
    content = f.read()

# First, let's fix the Notification model
notification_pattern = r'(model Notification \{)(.*?)(@@index.*?\n\})'

def fix_notification(match):
    before = match.group(1)
    middle = match.group(2)
    after = match.group(3)
    
    # Convert snake_case fields to camelCase with @map
    replacements = [
        ('user_id', 'userId', 'user_id'),
        ('is_read', 'isRead', 'is_read'),
        ('read_at', 'readAt', 'read_at'),
        ('created_at', 'createdAt', 'created_at'),
    ]
    
    for snake, camel, map_to in replacements:
        # Pattern: find "  snake_case" (with spaces) and replace with "  camelCase @map("snake_case")"
        pattern = rf'  {snake}\s+' 
        replacement = f'  {camel}\s+'
        if re.search(pattern, middle):
            # Check if it already has @map
            if f'@map("{map_to}")' not in middle:
                middle = re.sub(
                    rf'({camel}\s+\S+\s+)',
                    rf'\1@map("{map_to}") ',
                    middle
                )
    
    # Add @@map at the end
    result = before + middle + after
    if '@@map("notifications")' not in result:
        result = result.replace(after, f'{after}\n  @@map("notifications")')
    
    return result

content = re.sub(notification_pattern, fix_notification, content, flags=re.DOTALL)

# Now fix any other models that might be missing field mappings
# Let's check which models still have snake_case fields

with open("/Users/adrianhalim/SereneApps/backend/prisma/schema.prisma", "w") as f:
    f.write(content)

print("✓ Fixed Notification model")
