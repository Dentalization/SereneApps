# 🎨 Dentalization — Color Palette & Style Guide

A core part of Dentalization’s visual identity—helping ensure consistent design across mobile and web platforms.

---

## 🔹 Color Palette

### Primary Color
- **HEX**: `#483AA0`  
- **RGB**: `72, 58, 160`  
- Conveys trust, professionalism, and creativity.

### Accent Color
- **HEX**: `#A08A48`  
- **RGB**: `160, 138, 72`  
- Provides warm contrast and visual interest.

### Tertiary Colors
- **Light Violet**: `#6854C0` (104, 84, 192)  
- **Soft Blue**: `#4848C0` (72, 72, 192)  
- Ideal for hover states and subtle UI accents.

### Neutral Shades
| Purpose         | HEX       | RGB             |
|-----------------|-----------|-----------------|
| Background      | `#F2F1F8` | 242, 241, 248   |
| Secondary Text  | `#6E6E6E` | 110, 110, 110   |
| Primary Text    | `#333333` | 51, 51, 51      |

### Functional Colors
- **Success**: `#4CAF50` (76, 175, 80)  
- **Warning**: `#FFB300` (255, 179, 0)  
- **Error**: `#E53935` (229, 57, 53)  
- **Info**: `#2196F3` (33, 150, 243)

---

## ⚙️ Usage Guidelines

- **Primary** (`#483AA0`): buttons, icons, headers, CTAs  
- **Accent** (`#A08A48`): highlights, secondary CTAs  
- **Neutrals**: backgrounds, cards, text hierarchy  
- **Functional Colors**: status messages and alerts  
- **Accessibility**: high contrast meets WCAG AA/AAA

### CSS Variables

```css
:root {
  --primary: #483AA0;
  --primary-rgb: 72, 58, 160;
  --accent: #A08A48;
  --violet-1: #6854C0;
  --blue-1: #4848C0;

  --bg-light: #F2F1F8;
  --text-dark: #333333;
  --text-medium: #6E6E6E;

  --success: #4CAF50;
  --warning: #FFB300;
  --error: #E53935;
  --info: #2196F3;
}
