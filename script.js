// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const generateBtn = document.getElementById('generate-btn');
    const addLayerBtn = document.getElementById('add-layer-btn');
    const mountainLayersControls = document.getElementById('mountain-layers-controls');
    const resultImage = document.getElementById('result-image');
    const placeholder = document.querySelector('.placeholder');
    const loader = document.getElementById('loader');
    const starsCountInput = document.getElementById('stars-count');
    const starsCountValue = document.getElementById('stars-count-value');

    // --- INITIAL STATE & DEFAULT DATA ---
    let layerCount = 0;
    const initialLayers = [
        { base_height_ratio: 0.55, amplitude: 120, color: '#383344', octaves: 6, persistence: 0.55, lacunarity: 2.2, noise_scale_x: 0.002, noise_scale_y: 0.8, seed: 100 },
        { base_height_ratio: 0.62, amplitude: 150, color: '#33303e', octaves: 7, persistence: 0.5, lacunarity: 2.1, noise_scale_x: 0.0025, noise_scale_y: 1.0, seed: 200 },
        { base_height_ratio: 0.75, amplitude: 180, color: '#1d252b', octaves: 8, persistence: 0.45, lacunarity: 2.0, noise_scale_x: 0.003, noise_scale_y: 1.2, seed: 300 }
    ];

    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', handleGenerateClick);
    addLayerBtn.addEventListener('click', () => createLayerUI());
    starsCountInput.addEventListener('input', (e) => {
        starsCountValue.textContent = e.target.value;
    });

    // --- FUNCTIONS ---

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    }

    function createLayerUI(layerData = null) {
        layerCount++;
        const isDefault = layerData !== null;
        
        const card = document.createElement('div');
        card.className = 'layer-card';
        card.id = `layer-${layerCount}`;

        card.innerHTML = `
            <div class="layer-header">
                <h4>Layer ${layerCount}</h4>
                <button class="remove-layer-btn" data-target="layer-${layerCount}">Remove</button>
            </div>
            <div class="control">
                <label>Color</label>
                <input type="color" class="layer-color" value="${isDefault ? layerData.color : '#333333'}">
            </div>
            <div class="control">
                <label>Height Ratio</label>
                <input type="number" class="layer-base_height_ratio" step="0.01" value="${isDefault ? layerData.base_height_ratio : 0.7}">
            </div>
            <div class="control">
                <label>Amplitude</label>
                <input type="number" class="layer-amplitude" value="${isDefault ? layerData.amplitude : 100}">
            </div>
            <div class="control">
                <label>Detail (Octaves)</label>
                <input type="number" class="layer-octaves" value="${isDefault ? layerData.octaves : 6}">
            </div>
        `;
        mountainLayersControls.appendChild(card);
        
        card.querySelector('.remove-layer-btn').addEventListener('click', (e) => {
            document.getElementById(e.target.dataset.target).remove();
        });
    }

    async function handleGenerateClick() {
        placeholder.style.display = 'none';
        resultImage.style.display = 'none';
        loader.style.display = 'block';

        const mountain_layers = [];
        document.querySelectorAll('.layer-card').forEach(card => {
            mountain_layers.push({
                base_height_ratio: parseFloat(card.querySelector('.layer-base_height_ratio').value),
                amplitude: parseInt(card.querySelector('.layer-amplitude').value),
                color: hexToRgb(card.querySelector('.layer-color').value),
                octaves: parseInt(card.querySelector('.layer-octaves').value),
                // --- Add default values for other params for simplicity, could be exposed in UI ---
                persistence: 0.5,
                lacunarity: 2.0,
                noise_scale_x: 0.0025,
                noise_scale_y: 1.0,
                seed: Math.random() * 1000 // Random seed for each generation
            });
        });
        
        const config = {
            width: parseInt(document.getElementById('width').value),
            height: parseInt(document.getElementById('height').value),
            sky_colors: [
                { "color": [76, 42, 79], "pos": 0.0 }, { "color": [125, 38, 97], "pos": 0.2 },
                { "color": [216, 69, 114], "pos": 0.45 }, { "color": [245, 126, 68], "pos": 0.65 },
                { "color": [249, 158, 81], "pos": 0.8 }
            ],
            sun_glow: {
                "center_y_ratio": 0.7, "strength": 20, "radius_y_ratio": 0.25,
                "radius_x_ratio": 0.5, "color": [1.0, 0.5, 0.2]
            },
            stars: {
                count: parseInt(document.getElementById('stars-count').value),
                sky_height_ratio: 0.5
            },
            mountain_layers: mountain_layers
        };

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            resultImage.src = imageUrl;
            resultImage.style.display = 'block';

        } catch (error) {
            console.error("Error generating image:", error);
            placeholder.style.display = 'block';
            placeholder.innerHTML = `<h2>Generation Failed</h2><p>${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }
    
    // --- INITIALIZE UI ---
    initialLayers.forEach(layer => createLayerUI(layer));
});
