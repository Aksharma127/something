import numpy as np
from PIL import Image
import noise

# Image dimensions
WIDTH = 1920
HEIGHT = 1080

def create_sky_gradient(width, height):
    """Creates a canvas and paints a multi-color vertical sky gradient."""
    canvas = np.zeros((height, width, 3), dtype=np.uint8)

    # Refined colors based on the photograph
    colors = [
        (np.array([108, 112, 134]), 0.0),    # Dusty Blue/Grey at the top
        (np.array([188, 113, 150]), 0.35),   # Muted Pink/Violet
        (np.array([232, 108, 115]), 0.5),    # Rosy Red
        (np.array([255, 128, 78]), 0.6),     # Fiery Orange
        (np.array([255, 189, 95]), 0.75),    # Bright Yellow/Orange
    ]

    for y in range(height):
        t = y / height
        for i in range(len(colors) - 1):
            c1, p1 = colors[i]
            c2, p2 = colors[i+1]
            if p1 <= t < p2:
                local_t = (t - p1) / (p2 - p1)
                final_color = c1 + (c2 - c1) * local_t
                canvas[y, :] = final_color.astype(np.uint8)
                break
        else: # Handle the last segment
             canvas[y, :] = colors[-1][0].astype(np.uint8)

    return canvas

def add_mountain_layer(canvas, base_height, amplitude, color, octaves, persistence, lacunarity, seed, scale, is_foreground=False):
    """Generates and draws a single mountain layer onto the canvas."""
    width, height = canvas.shape[1], canvas.shape[0]

    for x in range(width):
        n = noise.pnoise1(
            (x + seed) * scale, # Use a scale parameter for more control
            octaves=octaves,
            persistence=persistence,
            lacunarity=lacunarity
        )

        m_height = int(base_height + n * amplitude)

        for y in range(m_height, height):
            # Apply atmospheric perspective by blending with sky color
            sky_color = canvas[y, x]
            # Closer mountains are less affected by atmospheric haze
            haze_factor = 1 - (amplitude / 300) # Simple factor based on amplitude

            base_mountain_color = np.array(color)

            # Blend the mountain color with the sky color based on haze
            blended_color = base_mountain_color * haze_factor + sky_color * (1-haze_factor)

            # Add foreground texture if specified
            if is_foreground:
                # High-frequency noise for texture
                tex_noise = noise.pnoise2(x * 0.05, y * 0.05, octaves=4, persistence=0.7, lacunarity=2.0, base=seed)
                # Use noise to vary brightness
                brightness_variation = tex_noise * 25
                textured_color = blended_color + brightness_variation
                blended_color = textured_color

            canvas[y, x] = np.clip(blended_color, 0, 255).astype(np.uint8)

    return canvas


def add_structures(canvas, num_structures, y_start_scan, brightness_threshold):
    """Scatters small structures on the mountain surfaces."""
    width, height = canvas.shape[1], canvas.shape[0]

    colors = [np.array([255, 255, 220]), np.array([200, 80, 80]), np.array([80, 180, 80])]

    for _ in range(num_structures):
        x = np.random.randint(int(width * 0.1), int(width * 0.9))

        for y in range(y_start_scan, height - 2):
            pixel_color = canvas[y, x]
            brightness = np.mean(pixel_color)

            if brightness < brightness_threshold:
                pixel_above_color = canvas[y-1, x]
                brightness_above = np.mean(pixel_above_color)
                if brightness_above > brightness + 10: # Ensure it's a surface, not just a dark area
                    color = colors[np.random.randint(0, len(colors))]
                    canvas[y, x] = color
                    if x < width -1:
                        canvas[y, x+1] = color
                break

    return canvas


def add_clouds(canvas, scale, octaves, persistence, lacunarity, seed, threshold, cloud_color):
    """Generates and blends procedural clouds onto the canvas."""
    width, height = canvas.shape[1], canvas.shape[0]

    # Create a separate layer for clouds to avoid modifying the canvas while reading from it
    cloud_layer = np.copy(canvas).astype(np.float32)

    for y in range(int(height * 0.7)): # Only generate clouds in the upper 70% of the sky
        for x in range(width):
            # Generate 2D Perlin noise
            nx = x / width
            ny = y / height
            noise_val = noise.pnoise2(
                nx * scale + seed,
                ny * scale + seed,
                octaves=octaves,
                persistence=persistence,
                lacunarity=lacunarity
            )

            # Normalize noise_val to be in 0-1 range
            noise_val = (noise_val + 1) / 2

            # Apply threshold to create cloud shapes
            if noise_val > threshold:
                # Calculate cloud transparency based on how much it exceeds the threshold
                cloud_alpha = (noise_val - threshold) / (1 - threshold)
                cloud_alpha = min(cloud_alpha * 1.2, 1.0) # Make clouds a bit more solid

                # The cloud color is influenced by the sun's glow
                # A simple approach: brighter clouds near the horizon
                glow_factor = (y / (height * 0.7))**2
                final_cloud_color = np.array(cloud_color, dtype=np.float32) + (np.array([255, 220, 180], dtype=np.float32) - np.array(cloud_color, dtype=np.float32)) * glow_factor

                # Blend the cloud color with the existing canvas color
                existing_color = cloud_layer[y, x]
                blended_color = existing_color + (final_cloud_color - existing_color) * cloud_alpha * 0.7 # 0.7 to make clouds semi-transparent

                canvas[y, x] = np.clip(blended_color, 0, 255).astype(np.uint8)

    return canvas


def draw_sun(canvas, pos_x, pos_y, radius, color):
    """Draws a soft, glowing sun on the canvas."""
    width, height = canvas.shape[1], canvas.shape[0]
    for y in range(max(0, pos_y - radius), min(height, pos_y + radius)):
        for x in range(max(0, pos_x - radius), min(width, pos_x + radius)):
            dist = np.sqrt((x - pos_x)**2 + (y - pos_y)**2)
            if dist < radius:
                # Create a falloff effect for a soft edge
                falloff = 1 - (dist / radius)
                falloff = falloff**2 # Square falloff for a brighter core

                # Blend the sun color with the existing sky color
                existing_color = canvas[y, x].astype(np.float32)
                sun_color = np.array(color, dtype=np.float32)

                blended_color = existing_color + (sun_color - existing_color) * falloff
                canvas[y, x] = np.clip(blended_color, 0, 255).astype(np.uint8)
    return canvas

def add_horizontal_glow(canvas, y_center, height, color):
    """Adds a horizontal glow effect to the canvas."""
    canvas_height = canvas.shape[0]
    for y in range(canvas_height):
        dist_from_center = abs(y - y_center)
        if dist_from_center < height:
            # Calculate glow intensity with a smooth falloff
            glow_intensity = (1 - (dist_from_center / height))**2

            # Create a glow color array
            glow_color = np.array(color, dtype=np.float32)

            # Blend the glow with the existing canvas row
            existing_row = canvas[y, :].astype(np.float32)
            blended_row = existing_row + (glow_color - existing_row) * glow_intensity * 0.5 # 0.5 to make it less overpowering
            canvas[y, :] = np.clip(blended_row, 0, 255).astype(np.uint8)

    return canvas


if __name__ == "__main__":
    main_canvas = create_sky_gradient(WIDTH, HEIGHT)

    # Define sun position and properties
    sun_y = int(HEIGHT * 0.62)
    sun_x = int(WIDTH * 0.5)

    # Add the glow before the sun and mountains for correct layering
    main_canvas = add_horizontal_glow(main_canvas, sun_y, 150, [255, 220, 180])

    # Draw the sun
    main_canvas = draw_sun(main_canvas, sun_x, sun_y, 30, [255, 255, 240])

    # Add clouds before the mountains
    main_canvas = add_clouds(main_canvas, scale=5.0, octaves=6, persistence=0.45, lacunarity=2.0, seed=300, threshold=0.55, cloud_color=[210, 210, 220])


    # Layer 1: Farthest, most hazy mountains
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.60), 80, [40, 45, 80], 4, 0.4, 2.0, 100, 0.001)

    # Layer 2: Mid-distance mountains
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.65), 120, [35, 40, 70], 6, 0.5, 2.0, 500, 0.002)

    # Layer 3: Closer, more detailed mountains
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.70), 160, [30, 35, 60], 8, 0.5, 2.0, 25, 0.003)

    # Layer 4: Foreground hill with more detail
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.75), 220, [20, 35, 30], 10, 0.6, 2.0, 800, 0.005, is_foreground=True)

    # Add distant structures as a final touch
    main_canvas = add_structures(main_canvas, num_structures=150, y_start_scan=int(HEIGHT*0.65), brightness_threshold=90)


    img = Image.fromarray(main_canvas, 'RGB')
    img.save('procedural_sunset.png')
    print("Landscape saved to procedural_sunset.png")
