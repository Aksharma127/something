import numpy as np
from PIL import Image
import noise

# Image dimensions
WIDTH = 1920
HEIGHT = 1080

def create_sky_gradient(width, height):
    """Creates a canvas and paints a multi-color vertical sky gradient."""
    canvas = np.zeros((height, width, 3), dtype=np.uint8)

    # Define the key colors of our gradient from top to bottom
    colors = [
        (np.array([60, 50, 80]), 0.0),      # Dark Blue/Purple at the top
        (np.array([210, 80, 120]), 0.4),    # Pink in the middle
        (np.array([255, 120, 50]), 0.65),   # Bright Orange at the horizon
        (np.array([255, 180, 80]), 1.0)     # Lighter Orange lowest
    ]

    for y in range(height):
        # Determine overall progress down the canvas
        t = y / height

        # Find which two colors to interpolate between
        for i in range(len(colors) - 1):
            c1, p1 = colors[i]
            c2, p2 = colors[i+1]
            if p1 <= t < p2:
                # Create a local interpolation factor between the two current color points
                local_t = (t - p1) / (p2 - p1)
                final_color = c1 + (c2 - c1) * local_t
                canvas[y, :] = final_color.astype(np.uint8)
                break

    return canvas

def add_mountain_layer(canvas, base_height, amplitude, color, octaves, persistence, lacunarity, seed):
    """Generates and draws a single mountain layer onto the canvas."""
    width, height = canvas.shape[1], canvas.shape[0]

    # Draw the mountain on the canvas column by column
    for x in range(width):
        # Generate a noise value for the mountain's shape at this x position.
        # We use a seed so each mountain layer can be unique.
        n = noise.pnoise1(
            (x + seed) * 0.002, # Scale the input to get desired "waviness"
            octaves=octaves,
            persistence=persistence,
            lacunarity=lacunarity
        )

        # Map the noise value (-1 to 1) to a pixel height
        m_height = int(base_height + n * amplitude)

        # Fill all pixels below this height with the mountain color
        # Add simple shading: color gets slightly darker further down
        for y in range(m_height, height):
            shading = (y - m_height) * 0.08
            shaded_color = np.clip(np.array(color) - shading, 0, 255)
            canvas[y, x] = shaded_color.astype(np.uint8)

    return canvas

if __name__ == "__main__":
    # 1. Start with our sky
    main_canvas = create_sky_gradient(WIDTH, HEIGHT)

    # 2. Add a distant, faint mountain layer
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.6), 100, [80, 80, 110], 4, 0.5, 2.0, 100)

    # 3. Add a closer, darker mountain layer
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.65), 150, [50, 60, 80], 6, 0.5, 2.0, 500)

    # 4. Add a foreground hill
    main_canvas = add_mountain_layer(main_canvas, int(HEIGHT*0.75), 200, [35, 50, 55], 8, 0.5, 2.0, 25)

    img = Image.fromarray(main_canvas, 'RGB')
    img.save('procedural_sunset.png')
    print("Landscape saved to procedural_sunset.png")
