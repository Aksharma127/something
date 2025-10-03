// --- Imports & Setup ---
const {
    Scene, PerspectiveCamera, WebGLRenderer, Vector3, Group, Sprite,
    SpriteMaterial, CanvasTexture, AdditiveBlending, CatmullRomCurve3, TubeGeometry,
    MeshBasicMaterial, Mesh, Points, BufferGeometry, BufferAttribute, PointsMaterial, Raycaster, Vector2
} = THREE;

const { CSS3DRenderer, CSS3DObject } = THREE;
const { OrbitControls } = THREE;
const { EffectComposer } = THREE;
const { RenderPass } = THREE;
const { UnrealBloomPass } = THREE;
const { gsap } = window;

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
const cssRenderer = new CSS3DRenderer();
const controls = new OrbitControls(camera, cssRenderer.domElement);

const overviewBtn = document.getElementById('overview-btn');
const initialCameraPosition = new Vector3(0, 5, 40);

// --- Data Synthesis ---
// This data is the blueprint of your neural network, synthesized from your resume.
const neuralData = {
    "Akshit Sharma": { type: "Core Identity", description: "A Versatile Engineer and Computational Modeler obsessed with performance and system design.", position: new Vector3(0, 0, 0) },
    "Bahra University": { type: "Education", description: "B.Tech in Computer Science Engineering (Ongoing).", position: new Vector3(0, -6, 0) },
    "Python": { type: "Language", position: new Vector3(-10, 5, -5) },
    "C++": { type: "Language", position: new Vector3(-12, -5, -3) },
    "Julia": { type: "Language", position: new Vector3(15, 8, 0) },
    "Java": { type: "Language", position: new Vector3(8, -10, 5) },
    "React.js": { type: "Framework", position: new Vector3(5, 12, 2) },
    "Flask": { type: "Framework", position: new Vector3(-3, 14, -4) },
    "Deep Learning": { type: "Specialized Training", description: "Gained expertise in building and fine-tuning ML/DL models during training at IIITDM Jabalpur.", position: new Vector3(20, -8, -2) },
    "scikit-learn": { type: "Library", position: new Vector3(18, -13, 0) },
    "Google Cloud (GCP)": { type: "Cloud Platform", position: new Vector3(18, 0, 5) },
    "IBM Cloud": { type: "Cloud Platform", description: "Proficiency in deploying and scaling applications on IBM Cloud infrastructure.", position: new Vector3(22, -3, 8) },
    "OpenGL": { type: "Graphics API", position: new Vector3(-18, -12, 4) },
    "Civil Accident Sim": {
        type: "Project", description: "Architected a complex failure-mode simulation in Julia, leveraging GCP to analyze 100+ scenarios.",
        tech: ["Julia", "Google Cloud (GCP)"], position: new Vector3(20, 5, 2)
    },
    "C++ Game Engine Suite": {
        type: "Project", description: "Wrote and shipped over 15 mini-games via a custom, high-performance C++ engine with proprietary physics.",
        tech: ["C++", "OpenGL"], position: new Vector3(-15, -10, 0)
    },
    "GeoSmart Advisor": {
        type: "Project", description: "Pioneered an ML-integrated Flask web app using scikit-learn for real-time business opportunity suggestions.",
        tech: ["Python", "Flask", "scikit-learn"], position: new Vector3(-5, 18, -2)
    },
    "Contact": { 
        type: "Get in Touch", description: `Email: <a href="mailto:asharma53858@gmail.com">asharma53858@gmail.com</a><br>LinkedIn: <a href="https://linkedin.com/in/aksharma127" target="_blank">aksharma127</a><br>GitHub: <a href="https://github.com/Aksharma127" target="_blank">Aksharma127</a>`,
        position: new Vector3(0, 20, 0)
    }
};

const connections = [
    ["Akshit Sharma", "Bahra University"], ["Akshit Sharma", "Contact"],
    ["Akshit Sharma", "Python"], ["Akshit Sharma", "C++"], ["Akshit Sharma", "Julia"], ["Akshit Sharma", "React.js"], ["Akshit Sharma", "Deep Learning"], ["Akshit Sharma", "Google Cloud (GCP)"],
    ["Civil Accident Sim", "Julia"], ["Civil Accident Sim", "Google Cloud (GCP)"],
    ["C++ Game Engine Suite", "C++"], ["C++ Game Engine Suite", "OpenGL"],
    ["GeoSmart Advisor", "Python"], ["GeoSmart Advisor", "Flask"], ["GeoSmart Advisor", "scikit-learn"],
    ["Deep Learning", "scikit-learn"], ["Google Cloud (GCP)", "IBM Cloud"],
];

// --- Initialization Function ---
function init() {
    // Basic Setup
    camera.position.copy(initialCameraPosition);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    document.getElementById('scene-container').appendChild(cssRenderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.enablePan = false;
    controls.target.set(0, 2, 0); // Look slightly above the origin

    // Post-Processing for Bloom Effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.0; // Bloom intensity
    bloomPass.radius = 0.2; // Bloom radius

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Object Creation
    createParticles();
    createNodesAndPanels();
    createSynapses();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('mousemove', onMouseMove);
    overviewBtn.addEventListener('click', returnToOverview);

    // Start sequence
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('intro-message').style.display = 'block';

    document.getElementById('enter-btn').addEventListener('click', () => {
        gsap.to('#intro-message', {
            duration: 0.5,
            opacity: 0,
            onComplete: () => {
                document.getElementById('intro-message').style.display = 'none';
                overviewBtn.classList.add('visible');
                animate(composer);
            }
        });
    }, { once: true });
}

// --- Object Creation Functions ---
const nodes = new Group();
const uiPanels = new Group();
const synapses = new Group();
const nodeBasePositions = new Map();

function createNodesAndPanels() {
    const spriteMaterial = new SpriteMaterial({
        map: new CanvasTexture(generateSprite()),
        blending: AdditiveBlending, color: 0x80ffff, transparent: true, opacity: 0.9, depthWrite: false
    });
    for (const key in neuralData) {
        const data = neuralData[key];
        const node = new Sprite(spriteMaterial.clone());
        node.position.copy(data.position);
        node.name = key;
        node.scale.set(1.5, 1.5, 1.5);
        nodes.add(node);
        nodeBasePositions.set(node, data.position.clone());

        const element = document.createElement('div');
        element.className = 'ui-panel';
        element.innerHTML = `<h2>${key}</h2><p class="type">${data.type}</p><p>${data.description || ''}</p>` +
            (data.tech ? `<div class="tech-stack">${data.tech.map(t => `<span>${t}</span>`).join('')}</div>` : '');
        const cssObject = new CSS3DObject(element);
        cssObject.position.copy(data.position);
        cssObject.name = key;
        cssObject.visible = false;
        uiPanels.add(cssObject);
    }
    scene.add(nodes);
    scene.add(uiPanels);
}

function createSynapses() {
    for (const conn of connections) {
        const startPos = neuralData[conn[0]]?.position;
        const endPos = neuralData[conn[1]]?.position;
        if (startPos && endPos) {
            const curve = new CatmullRomCurve3([startPos, endPos]);
            const geometry = new TubeGeometry(curve, 20, 0.05, 8, false);
            const material = new MeshBasicMaterial({ color: 0x00f6ff, transparent: true, opacity: 0.15 });
            const synapse = new Mesh(geometry, material);
            synapses.add(synapse);
        }
    }
    scene.add(synapses);
}

function createParticles() {
    const particleCount = 7000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 200;
    }
    const particles = new BufferGeometry();
    particles.setAttribute('position', new BufferAttribute(positions, 3));
    const particleMaterial = new PointsMaterial({ color: 0x00f6ff, size: 0.05, transparent: true, opacity: 0.2 });
    const particleSystem = new Points(particles, particleMaterial);
    scene.add(particleSystem);
}

function generateSprite() {
    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(200,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(0,246,255,1)');
    gradient.addColorStop(0.5, 'rgba(0,100,255,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 16, 16);
    return canvas;
}

// --- Interaction & Animation ---
const raycaster = new Raycaster();
const mouse = new Vector2();
let selectedNode = null;
let hoveredNode = null;

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event) {
    if (event.target.closest('.ui-panel')) return;
    if (hoveredNode) {
        selectNode(hoveredNode);
    } else {
        deselectNode();
    }
}

function selectNode(node) {
    selectedNode = node;
    const targetPosition = node.position.clone().add(new Vector3(0, 2, 12)); // "Golden Distance"
    gsap.to(camera.position, { duration: 1.5, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, ease: "power3.inOut" });
    gsap.to(controls.target, { duration: 1.5, x: node.position.x, y: node.position.y, z: node.position.z, ease: "power3.inOut" });

    uiPanels.children.forEach(p => {
        const isSelected = p.name === node.name;
        if (p.visible !== isSelected) {
            p.visible = isSelected;
            p.element.classList.toggle('visible', isSelected);
        }
    });
}

function deselectNode() {
    if (!selectedNode) return;
    selectedNode = null;
    uiPanels.children.forEach(p => {
        if (p.visible) {
            p.element.classList.remove('visible');
            setTimeout(() => p.visible = false, 500);
        }
    });
}

function returnToOverview() {
    deselectNode();
    gsap.to(camera.position, { duration: 1.5, x: initialCameraPosition.x, y: initialCameraPosition.y, z: initialCameraPosition.z, ease: "power3.inOut" });
    gsap.to(controls.target, { duration: 1.5, x: 0, y: 2, z: 0, ease: "power3.inOut" });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    // composer.setSize(window.innerWidth, window.innerHeight); // This line is important for bloom on resize
}

const clock = new THREE.Clock();
function animate(composer) {
    const elapsedTime = clock.getElapsedTime();
    
    // Hover check
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodes.children);
    const newHoveredNode = intersects.length > 0 ? intersects[0].object : null;

    if (newHoveredNode !== hoveredNode) {
        if (hoveredNode) gsap.to(hoveredNode.scale, { duration: 0.3, x: 1.5, y: 1.5, z: 1.5, ease: "power2.out" });
        if (newHoveredNode) gsap.to(newHoveredNode.scale, { duration: 0.3, x: 2.5, y: 2.5, z: 2.5, ease: "power2.out" });
        hoveredNode = newHoveredNode;
    }

    // Aetherial Drift & Breathing animation
    nodes.children.forEach(node => {
        const basePos = nodeBasePositions.get(node);
        node.position.y = basePos.y + Math.sin(elapsedTime * 0.5 + basePos.x) * 0.5; // Drift
        const scale = 1.5 + Math.sin(elapsedTime + basePos.y) * 0.1; // Breathing
        if (node !== hoveredNode) {
            node.scale.set(scale, scale, scale);
        }
    });

    controls.update();
    uiPanels.children.forEach(p => p.position.copy(nodes.children.find(n => n.name === p.name).position).add(new Vector3(2.5, 2.5, 0)));
    
    // Render the scene using the composer for post-processing effects
    composer.render();
    cssRenderer.render(scene, camera);
    
    requestAnimationFrame(() => animate(composer));
}

// --- Start ---
init();