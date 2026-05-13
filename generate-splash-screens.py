#!/usr/bin/env python3
"""Generate PWA splash screen images for iOS devices."""

from PIL import Image, ImageDraw, ImageFont
import os

output_dir = "/home/ubuntu/health-coach-protocol-app/client/public"

# iOS splash screen sizes (width x height)
splash_sizes = [
    # iPhone
    (640, 1136),   # iPhone 5/SE
    (750, 1334),   # iPhone 6/7/8
    (828, 1792),   # iPhone XR/11
    (1125, 2436),  # iPhone X/XS/11 Pro
    (1170, 2532),  # iPhone 12/13/14
    (1179, 2556),  # iPhone 14 Pro
    (1242, 2208),  # iPhone 6+/7+/8+
    (1242, 2688),  # iPhone XS Max/11 Pro Max
    (1284, 2778),  # iPhone 12/13/14 Pro Max
    (1290, 2796),  # iPhone 14 Pro Max
    # iPad
    (1536, 2048),  # iPad Mini/Air
    (1668, 2224),  # iPad Pro 10.5
    (1668, 2388),  # iPad Pro 11
    (2048, 2732),  # iPad Pro 12.9
]

def create_splash_screen(width, height):
    """Create a branded splash screen."""
    # Dark slate background matching the app
    img = Image.new('RGB', (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)
    
    # Calculate center
    center_x = width // 2
    center_y = height // 2
    
    # Draw the Omega symbol (larger for splash)
    symbol_size = min(width, height) // 4
    radius = symbol_size // 2
    
    # Draw circle background
    circle_margin = symbol_size // 10
    draw.ellipse(
        [center_x - radius, center_y - radius - height // 10, 
         center_x + radius, center_y + radius - height // 10],
        fill=(30, 41, 59),
        outline=(249, 115, 22),
        width=max(4, symbol_size // 25)
    )
    
    # Draw the Omega arc
    arc_y_offset = height // 10
    draw.arc(
        [center_x - radius + circle_margin, center_y - radius + circle_margin - arc_y_offset,
         center_x + radius - circle_margin, center_y + radius - circle_margin - arc_y_offset],
        start=30,
        end=150,
        fill=(249, 115, 22),
        width=max(6, symbol_size // 12)
    )
    
    # Draw omega legs
    leg_width = max(6, symbol_size // 12)
    leg_height = symbol_size // 4
    leg_offset = radius - symbol_size // 8
    
    # Left leg
    draw.rectangle(
        [center_x - leg_offset - leg_width // 2, center_y + radius // 4 - arc_y_offset,
         center_x - leg_offset + leg_width // 2, center_y + radius // 4 + leg_height - arc_y_offset],
        fill=(249, 115, 22)
    )
    
    # Right leg
    draw.rectangle(
        [center_x + leg_offset - leg_width // 2, center_y + radius // 4 - arc_y_offset,
         center_x + leg_offset + leg_width // 2, center_y + radius // 4 + leg_height - arc_y_offset],
        fill=(249, 115, 22)
    )
    
    # Draw "OMEGA LONGEVITY" text below
    text_y = center_y + radius + height // 20
    
    # Draw "OMEGA" in orange
    omega_text = "OMEGA"
    # Simple text positioning (no custom fonts needed)
    text_width = len(omega_text) * (symbol_size // 10)
    
    # Draw loading indicator dots at bottom
    dot_y = height - height // 8
    dot_radius = max(4, width // 100)
    dot_spacing = dot_radius * 4
    
    for i in range(3):
        dot_x = center_x + (i - 1) * dot_spacing
        alpha = 255 if i == 1 else 128
        draw.ellipse(
            [dot_x - dot_radius, dot_y - dot_radius,
             dot_x + dot_radius, dot_y + dot_radius],
            fill=(249, 115, 22) if i == 1 else (100, 100, 100)
        )
    
    return img

# Generate splash screens for all sizes
for width, height in splash_sizes:
    splash = create_splash_screen(width, height)
    filename = f"splash-{width}x{height}.png"
    splash.save(os.path.join(output_dir, filename))
    print(f"Generated {filename}")

# Also create a generic splash for Android
android_splash = create_splash_screen(1080, 1920)
android_splash.save(os.path.join(output_dir, "splash-android.png"))
print("Generated splash-android.png")

print("\nAll splash screens generated successfully!")
