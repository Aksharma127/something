// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const addLayerBtn = document.getElementById('add-layer-btn');
    const mountainLayersControls = document.getElementById('mountain-layers-controls');
    const resultCanvas = document.getElementById('result-canvas');
    const ctx = resultCanvas.getContext('2d');
    const placeholder = document.querySelector('.placeholder');
    const loader = document.getElementById('loader');
    const starsCountInput = document.getElementById('stars-count');
    const starsCountValue = document.getElementById('stars-count-value');

    // --- INITIAL STATE & DEFAULT DATA ---
    let layerCount = 0;
    const initialLayers = [
        { base_height_ratio: 0.55, amplitude: 120, color: '#383344', octaves: 6, persistence: 0.55, lacunarity: 2.2, noise_scale_x: 0.002, noise_scale_y: 0.8 },
        { base_height_ratio: 0.62, amplitude: 150, color: '#33303e', octaves: 7, persistence: 0.5, lacunarity: 2.1, noise_scale_x: 0.0025, noise_scale_y: 1.0 },
        { base_height_ratio: 0.75, amplitude: 180, color: '#1d252b', octaves: 8, persistence: 0.45, lacunarity: 2.0, noise_scale_x: 0.003, noise_scale_y: 1.2 }
    ];
    // Create a simplex noise instance
    const simplex = new SimplexNoise();

    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', handleGenerateClick);
    downloadBtn.addEventListener('click', downloadImage);
    addLayerBtn.addEventListener('click', () => createLayerUI());
    starsCountInput.addEventListener('input', (e) => { starsCountValue.textContent = e.target.value; });

    // --- HELPER FUNCTIONS ---
    const hexToRgb = (hex) => {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0,0,0];
    };
    const lerp = (a, b, t) => a + (b - a) * t;

    // --- UI FUNCTIONS ---
    function createLayerUI(layerData = null) {
        layerCount++;
        const isDefault = layerData !== null;
        const card = document.createElement('div');
        card.className = 'layer-card';
        card.id = `layer-${layerCount}`;
        card.innerHTML = `
            <div class="layer-header"><h4>Layer ${layerCount}</h4><button class="remove-layer-btn" data-target="layer-${layerCount}">Remove</button></div>
            <div class="control"><label>Color</label><input type="color" class="layer-color" value="${isDefault ? layerData.color : '#333333'}"></div>
            <div class="control"><label>Height Ratio</label><input type="number" class="layer-base_height_ratio" step="0.01" value="${isDefault ? layerData.base_height_ratio : 0.7}"></div>
            <div class="control"><label>Amplitude</label><input type="number" class="layer-amplitude" value="${isDefault ? layerData.amplitude : 100}"></div>
            <div class="control"><label>Detail (Octaves)</label><input type="number" class="layer-octaves" value="${isDefault ? layerData.octaves : 6}"></div>
        `;
        mountainLayersControls.appendChild(card);
        card.querySelector('.remove-layer-btn').addEventListener('click', (e) => {
            document.getElementById(e.target.dataset.target).remove();
        });
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.download = `landscape-${Date.now()}.png`;
        link.href = resultCanvas.toDataURL('image/png');
        link.click();
    }

    // --- IMAGE GENERATION LOGIC (JAVASCRIPT VERSION) ---

    function drawSky(config) {
        const { width, height, sky_colors } = config;
        for (let y = 0; y < height; y++) {
            const t = y / height;
            let c1, p1, c2, p2;
            for (let i = 0; i < sky_colors.length - 1; i++) {
                if (t >= sky_colors[i].pos && t < sky_colors[i+1].pos) {
                    [c1, p1] = [hexToRgb(sky_colors[i].color), sky_colors[i].pos];
                    [c2, p2] = [hexToRgb(sky_colors[i+1].color), sky_colors[i+1].pos];
                    break;
                }
            }
            if (!c1) { // Handle bottom edge case
                [c1, p1] = [hexToRgb(sky_colors[sky_colors.length - 1].color), 1];
                [c2, p2] = [c1, p1];
            }
            const local_t = (t - p1) / (p2 - p1);
            const r = Math.round(lerp(c1[0], c2[0], local_t));
            const g = Math.round(lerp(c1[1], c2[1], local_t));
            const b = Math.round(lerp(c1[2], c2[2], local_t));
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, y, width, 1);
        }
    }
    
    function drawStars(config) {
        const { width, height, stars } = config;
        const skyHeight = height * stars.sky_height_ratio;
        for (let i = 0; i < stars.count; i++) {
            const x = Math.random() * width;
            const y = Math.random() * skyHeight;
            const brightness = 150 + Math.random() * 105;
            ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    function drawMountainLayer(config, layerParams) {
        const { width, height } = config;
        const baseHeight = height * layerParams.base_height_ratio;
        ctx.fillStyle = layerParams.color;
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x < width; x++) {
            let noiseVal = 0;
            let frequency = 1;
            let amplitude = 1;
            for (let i = 0; i < layerParams.octaves; i++) {
                noiseVal += simplex.noise2D(x * frequency * layerParams.noise_scale_x, 0) * amplitude;
                amplitude *= layerParams.persistence;
                frequency *= layerParams.lacunarity;
            }
            const mHeight = baseHeight + noiseVal * layerParams.amplitude * layerParams.noise_scale_y;
            ctx.lineTo(x, mHeight);
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
    }
    
    // --- MAIN GENERATION CONTROLLER ---

    function handleGenerateClick() {
        placeholder.style.display = 'none';
        resultCanvas.style.display = 'none';
        downloadBtn.style.display = 'none';
        loader.style.display = 'block';

        // Collect config from UI
        const mountain_layers = [];
        document.querySelectorAll('.layer-card').forEach(card => {
            mountain_layers.push({
                base_height_ratio: parseFloat(card.querySelector('.layer-base_height_ratio').value),
                amplitude: parseInt(card.querySelector('.layer-amplitude').value),
                color: card.querySelector('.layer-color').value,
                octaves: parseInt(card.querySelector('.layer-octaves').value),
                persistence: 0.5, lacunarity: 2.0, noise_scale_x: 0.0025, noise_scale_y: 1.0,
            });
        });
        
        const config = {
            width: parseInt(document.getElementById('width').value),
            height: parseInt(document.getElementById('height').value),
            sky_colors: [
                { color: '#4c2a4f', pos: 0.0 }, { color: '#7d2661', pos: 0.2 },
                { color: '#d84572', pos: 0.45 }, { color: '#f57e44', pos: 0.65 },
                { color: '#f99e51', pos: 0.8 }
            ],
            stars: { count: parseInt(starsCountInput.value), sky_height_ratio: 0.6 },
            mountain_layers: mountain_layers
        };
        
        // Use setTimeout to allow the UI to update (show loader) before the heavy work starts
        setTimeout(() => {
            try {
                // Set canvas size
                resultCanvas.width = config.width;
                resultCanvas.height = config.height;
                
                // --- Start Drawing ---
                drawSky(config);
                if (config.stars.count > 0) drawStars(config);
                config.mountain_layers.forEach(layer => drawMountainLayer(config, layer));
                // --- End Drawing ---

                resultCanvas.style.display = 'block';
                downloadBtn.style.display = 'block';
            } catch (error) {
                console.error("Error generating image:", error);
                placeholder.style.display = 'block';
                placeholder.innerHTML = `<h2>Generation Failed</h2><p>${error.message}</p>`;
            } finally {
                loader.style.display = 'none';
            }
        }, 50); // A small delay is enough
    }
    
    // --- INITIALIZE UI ---
    initialLayers.forEach(layer => createLayerUI(layer));
});
