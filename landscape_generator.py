# landscape_generator.py

import numpy as np
from PIL import Image
import noise
import random
import argparse
import time

# --- CONFIGURATION ---
# Centralized configuration for easy tweaking. Change any value here.
CONFIG = {
    "width": 1920,
    "height": 1080,
    "output_filename": f"landscape_{int(time.time())}.png",

    "sky_colors": [
        {"color": [76, 42, 79], "pos": 0.0},
        {"color": [125, 38, 97], "pos": 0.2},
        {"color": [216, 69, 114], "pos": 0.45},
        {"color": [245, 126, 68], "pos": 0.65},
        {"color": [249, 158, 81], "pos": 0.8},
    ],
    "sun_glow": {
        "center_y_ratio": 0.7,
        "strength": 20,
        "radius_y_ratio": 0.25,
        "radius_x_ratio": 0.5,
        "color": [1.0, 0.5, 0.2] # Multiplier for orange-ish glow
    },
    "stars": {
        "count": 500,
        "sky_height_ratio": 0.5 # Only add stars in the top 50% of the sky
    },
    "mountain_layers": [
        {
            "base_height_ratio": 0.55, "amplitude": 120, "color": [56, 51, 68],
            "octaves": 6, "persistence": 0.55, "lacunarity": 2.2,
            "noise_scale_x": 0.002, "noise_scale_y": 0.8, "seed": 100
        },
        {
            "base_height_ratio": 0.62, "amplitude": 150, "color": [51, 48, 62],
            "octaves": 7, "persistence": 0.5, "lacunarity": 2.1,
            "noise_scale_x": 0.0025, "noise_scale_y": 1.0, "seed": 200
        },
        {
            "base_height_ratio": 0.75, "amplitude": 180, "color": [29, 37, 43],
            "octaves": 8, "persistence": 0.45, "lacunarity": 2.0,
            "noise_scale_x": 0.003, "noise_scale_y": 1.2, "seed": 300
        }
    ]
}


def create_sky_gradient_vectorized(config):
    """Creates a canvas and paints a vectorized vertical sky gradient."""
    width, height = config['width'], config['height']
    sky_conf = config['sky_colors']

    canvas = np.zeros((height, width, 3), dtype=np.uint8)

    color_positions = np.array([c['pos'] for c in sky_conf])
    colors_rgb = np.array([c['color'] for c in sky_conf])

    y_coords = np.linspace(0, 1, height)

    # Interpolate each color channel for all y-coordinates at once
    gradient_r = np.interp(y_coords, color_positions, colors_rgb[:, 0])
    gradient_g = np.interp(y_coords, color_positions, colors_rgb[:, 1])
    gradient_b = np.interp(y_coords, color_positions, colors_rgb[:, 2])

    # Assign the gradient to the canvas, broadcasting across the x-axis
    canvas[:, :, 0] = gradient_r[:, np.newaxis]
    canvas[:, :, 1] = gradient_g[:, np.newaxis]
    canvas[:, :, 2] = gradient_b[:, np.newaxis]

    return canvas

def add_sun_glow_vectorized(canvas, config):
    """Adds a vectorized sun glow effect to the canvas."""
    width, height = config['width'], config['height']
    glow_conf = config['sun_glow']

    center_y = height * glow_conf['center_y_ratio']
    radius_y = height * glow_conf['radius_y_ratio']
    radius_x = width * glow_conf['radius_x_ratio']

    # Create coordinate grids
    x_coords = np.arange(width)
    y_coords = np.arange(height)
    X, Y = np.meshgrid(x_coords, y_coords)

    # Calculate elliptical distance for all pixels at once
    dx = (X - width / 2) / radius_x
    dy = (Y - center_y) / radius_y
    distance_sq = dx**2 + dy**2

    # Create a mask for pixels within the glow ellipse
    glow_mask = distance_sq < 1.0

    # Calculate falloff only for pixels inside the mask
    falloff = (1 - np.sqrt(distance_sq[glow_mask]))**2

    # Apply the additive glow
    current_color = canvas[glow_mask].astype(float)
    glow_add = np.array(glow_conf['color']) * glow_conf['strength'] * falloff[:, np.newaxis]

    canvas[glow_mask] = np.clip(current_color + glow_add, 0, 255).astype(np.uint8)
    return canvas

def add_stars(canvas, config):
    """Adds random stars to the top portion of the canvas."""
    width, height = config['width'], config['height']
    star_conf = config['stars']

    sky_height = int(height * star_conf['sky_height_ratio'])
    num_stars = star_conf['count']

    star_x = np.random.randint(0, width, num_stars)
    star_y = np.random.randint(0, sky_height, num_stars)

    for i in range(num_stars):
        brightness = random.uniform(0.6, 1.0)
        color = (np.array([255, 255, 240]) * brightness).astype(np.uint8)
        canvas[star_y[i], star_x[i]] = color

    return canvas

def add_mountain_layer(canvas, **layer_params):
    """Generates and draws a single mountain layer onto the canvas."""
    width, height = canvas.shape[1], canvas.shape[0]
    base_height = int(height * layer_params['base_height_ratio'])
    color = np.array(layer_params['color'])
    seed = layer_params['seed']

    for x in range(width):
        n = noise.pnoise1(
            (x + seed) * layer_params['noise_scale_x'],
            octaves=layer_params['octaves'],
            persistence=layer_params['persistence'],
            lacunarity=layer_params['lacunarity'],
            base=seed
        )
        m_height = int(base_height + n * layer_params['amplitude'] * layer_params['noise_scale_y'])

        if m_height < 0: m_height = 0
        if m_height < height:
            canvas[m_height:height, x] = color

    return canvas

def main(config):
    """Main function to generate and save the landscape."""
    print("Generating sky gradient...")
    canvas = create_sky_gradient_vectorized(config)

    print("Adding sun glow...")
    canvas = add_sun_glow_vectorized(canvas, config)

    print("Adding stars...")
    canvas = add_stars(canvas, config)

    print("Generating mountain layers...")
    for i, layer_params in enumerate(config['mountain_layers']):
        print(f"  - Drawing layer {i+1}/{len(config['mountain_layers'])}")
        canvas = add_mountain_layer(canvas, **layer_params)

    img = Image.fromarray(canvas, 'RGB')
    img.save(config['output_filename'])
    print(f"\nLandscape saved to {config['output_filename']}")


if __name__ == "__main__":
    # Optional: Allow overriding config from command line
    parser = argparse.ArgumentParser(description="Procedurally generate a landscape image.")
    parser.add_argument('--width', type=int, help="Width of the image.")
    parser.add_argument('--height', type=int, help="Height of the image.")
    parser.add_argument('--output', type=str, help="Output filename.")
    args = parser.parse_args()

    # Update config with any command-line arguments provided
    if args.width: CONFIG['width'] = args.width
    if args.height: CONFIG['height'] = args.height
    if args.output: CONFIG['output_filename'] = args.output

    main(CONFIG)
