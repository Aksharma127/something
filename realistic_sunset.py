# realistic_sunset.py
# -----------------------------------------------------
# Procedurally generated sunset landscape (v2)
# More realistic version resembling a photo
# -----------------------------------------------------

import numpy as np
import matplotlib.pyplot as plt
try:
    from noise import pnoise2  # Perlin noise for terrain and clouds
except ImportError:
    print("⚠️ 'noise' module not found, install it via 'pip install noise'")
    exit()

# --- CONFIGURATION ---
WIDTH, HEIGHT = 1280, 720
N_MOUNTAINS = 5
SUN_Y_RATIO = 0.75  # vertical sun position (0 = top, 1 = bottom)
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# --- IMAGE BASE ---
img = np.zeros((HEIGHT, WIDTH, 3), dtype=float)

# --- SKY GRADIENT ---
def lerp(a, b, t): return a * (1 - t) + b * t

top_color = np.array([0.02, 0.05, 0.08])   # upper bluish-grey
mid_color = np.array([0.5, 0.1, 0.05])     # mid red-orange
bottom_color = np.array([1.0, 0.4, 0.1])   # near-horizon glow

for y in range(HEIGHT):
    t = y / HEIGHT
    if t < 0.5:
        c = lerp(top_color, mid_color, t * 2)
    else:
        c = lerp(mid_color, bottom_color, (t - 0.5) * 2)
    img[y, :, :] = c

# --- SUN & GLOW ---
cx, cy = WIDTH // 2, int(HEIGHT * SUN_Y_RATIO)
sun_radius = 40
glow_sigma = 220

Y, X = np.mgrid[0:HEIGHT, 0:WIDTH]
dist = np.sqrt((X - cx)**2 + (Y - cy)**2)

# Sun core
sun_mask = dist < sun_radius
img[sun_mask] = np.array([1.0, 0.8, 0.3])

# Glow gradient
glow = np.exp(-dist**2 / (2 * glow_sigma**2))
img[:, :, 0] += 1.0 * glow  # red
img[:, :, 1] += 0.5 * glow  # orange
img[:, :, 2] += 0.1 * glow  # faint yellow

# --- CLOUDS ---
for y in range(HEIGHT):
    for x in range(WIDTH):
        n = pnoise2(x / 250, y / 180, octaves=5)
        if n > 0.1:
            fade = 0.8 - 0.2 * n
            img[y, x, :] *= fade

# --- MOUNTAIN LAYERS ---
for i in range(N_MOUNTAINS):
    layer_depth = i / N_MOUNTAINS
    scale = 0.0015 * (i + 1)
    offset = np.random.uniform(0, 1000)
    color_tint = np.array([0.1, 0.12, 0.1]) * (0.8 - layer_depth * 0.6)
    haze = 0.45 + 0.15 * layer_depth  # distance lightening

    for x in range(WIDTH):
        n = pnoise2(x * scale, offset, octaves=3)
        mountain_y = int(HEIGHT * (0.55 + 0.25 * n + 0.07 * layer_depth))
        img[mountain_y:, x, :] = img[mountain_y:, x, :] * haze + color_tint

# --- TONAL POLISH ---
img = np.clip(img, 0, 1)

# --- OUTPUT ---
plt.figure(figsize=(12.8, 7.2))
plt.imshow(img)
plt.axis('off')
plt.tight_layout()
plt.savefig("realistic_sunset.png", bbox_inches='tight', pad_inches=0, dpi=300)
plt.show()
