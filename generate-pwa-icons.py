#!/usr/bin/env python3
"""Generate PWA icons from the Omega Longevity logo."""

from PIL import Image, ImageDraw
import os

# Output directory
output_dir = "/home/ubuntu/health-coach-protocol-app/client/public"

# Create a simple icon with the Omega symbol and brand colors
# Using the brand colors from the app (dark blue/orange theme)
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

def create_omega_icon(size):
    """Create an Omega icon with the brand colors."""
    # Create image with dark background (matching app theme)
    img = Image.new('RGBA', (size, size), (15, 23, 42, 255))  # Dark slate background
    draw = ImageDraw.Draw(img)
    
    # Draw a circle background
    margin = size // 10
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(30, 41, 59, 255),  # Slightly lighter slate
        outline=(249, 115, 22, 255),  # Orange accent
        width=max(2, size // 50)
    )
    
    # Draw the Omega symbol (Ω) - simplified geometric version
    center_x = size // 2
    center_y = size // 2
    radius = size // 3
    
    # Draw the horseshoe part of omega
    draw.arc(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        start=30,
        end=150,
        fill=(249, 115, 22, 255),  # Orange
        width=max(3, size // 20)
    )
    
    # Draw the legs of omega
    leg_width = max(3, size // 20)
    leg_height = size // 5
    leg_offset = radius - size // 10
    
    # Left leg
    draw.rectangle(
        [center_x - leg_offset - leg_width // 2, center_y + radius // 3,
         center_x - leg_offset + leg_width // 2, center_y + radius // 3 + leg_height],
        fill=(249, 115, 22, 255)
    )
    
    # Right leg
    draw.rectangle(
        [center_x + leg_offset - leg_width // 2, center_y + radius // 3,
         center_x + leg_offset + leg_width // 2, center_y + radius // 3 + leg_height],
        fill=(249, 115, 22, 255)
    )
    
    return img

# Generate icons for all sizes
for size in sizes:
    icon = create_omega_icon(size)
    icon.save(os.path.join(output_dir, f"pwa-icon-{size}x{size}.png"))
    print(f"Generated pwa-icon-{size}x{size}.png")

# Also create apple-touch-icon (180x180)
apple_icon = create_omega_icon(180)
apple_icon.save(os.path.join(output_dir, "apple-touch-icon.png"))
print("Generated apple-touch-icon.png")

# Create favicon.ico (multiple sizes in one file)
favicon_sizes = [16, 32, 48]
favicon_images = [create_omega_icon(s) for s in favicon_sizes]
favicon_images[0].save(
    os.path.join(output_dir, "favicon.ico"),
    format='ICO',
    sizes=[(s, s) for s in favicon_sizes]
)
print("Generated favicon.ico")

print("\nAll PWA icons generated successfully!")
