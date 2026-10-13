/**
 * LifeBlood – High-Performance 3D Floating Erythrocytes (Red Blood Cells) Canvas
 * Optimized Three.js rendering with IntersectionObserver auto-pause & GPU-friendly shaders
 */

(function () {
  const canvas = document.getElementById('canvas-hero-3d');
  if (!canvas || typeof THREE === 'undefined') return;

  let scene, camera, renderer;
  let cells = [];
  let particleSystem;
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  let isMobile = window.innerWidth < 768;
  let isHeroVisible = true;
  let isAnimating = false;

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.002);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 45;

    // High performance renderer with clamped pixelRatio
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    // Balanced Lighting for Ruby Red Luster
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const redLight = new THREE.PointLight(0xe63946, 4, 70);
    redLight.position.set(15, 20, 25);
    scene.add(redLight);

    const cyanLight = new THREE.PointLight(0x00f5d4, 2.5, 60);
    cyanLight.position.set(-25, -15, 20);
    scene.add(cyanLight);

    const rimLight = new THREE.DirectionalLight(0xff4d6d, 1.5);
    rimLight.position.set(0, 30, -10);
    scene.add(rimLight);

    // Optimized Erythrocyte Geometry and Material
    const cellGeo = createErythrocyteGeometry();
    const cellMat = new THREE.MeshPhongMaterial({
      color: 0xcc001b,
      emissive: 0x330006,
      specular: 0xff4d6d,
      shininess: 70,
      flatShading: false
    });

    // 16 cells on desktop, 8 on mobile (silky smooth 60+ FPS)
    const cellCount = isMobile ? 8 : 16;
    for (let i = 0; i < cellCount; i++) {
      const mesh = new THREE.Mesh(cellGeo, cellMat);
      
      mesh.position.x = (Math.random() - 0.5) * 55;
      mesh.position.y = (Math.random() - 0.5) * 35;
      mesh.position.z = (Math.random() - 0.5) * 30;

      const scale = 0.85 + Math.random() * 1.2;
      mesh.scale.set(scale, scale, scale);

      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;

      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.012,
        rotSpeedY: (Math.random() - 0.5) * 0.016,
        rotSpeedZ: (Math.random() - 0.5) * 0.008,
        floatSpeed: 0.005 + Math.random() * 0.012,
        initialY: mesh.position.y,
        floatRange: 3 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2
      };

      scene.add(mesh);
      cells.push(mesh);
    }

    // Plasma Particles Field
    createParticleField();

    window.addEventListener('resize', onWindowResize, false);
    if (!isMobile) {
      document.addEventListener('mousemove', onDocumentMouseMove, { passive: true });
    }

    // Setup IntersectionObserver to freeze canvas when scrolled out of view
    setupIntersectionObserver();
  }

  function setupIntersectionObserver() {
    const heroSection = document.getElementById('hero');
    if ('IntersectionObserver' in window && heroSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isHeroVisible = entry.isIntersecting;
          if (isHeroVisible && !isAnimating) {
            isAnimating = true;
            requestAnimationFrame(animate);
          }
        });
      }, { threshold: 0.05 });
      observer.observe(heroSection);
    }
  }

  // Authentic biconcave disc profile (optimized segments)
  function createErythrocyteGeometry() {
    const points = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const r = u * 2.2;
      const y = 0.7 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.28 + 1.6 * u * u - 0.9 * Math.pow(u, 4));
      points.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(points, 24);
  }

  function createParticleField() {
    const count = isMobile ? 50 : 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      if (Math.random() > 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.35;
      } else {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.85;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
  }

  function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.015;
    mouseY = (event.clientY - windowHalfY) * 0.015;
  }

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    isMobile = window.innerWidth < 768;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }

  let clock = new THREE.Clock();

  function animate() {
    if (!isHeroVisible) {
      isAnimating = false;
      return;
    }
    isAnimating = true;
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Smooth camera parallax
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    camera.position.x = targetX * 0.5;
    camera.position.y = -targetY * 0.5;
    camera.lookAt(scene.position);

    // Animate Blood Cells
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      cell.rotation.x += cell.userData.rotSpeedX;
      cell.rotation.y += cell.userData.rotSpeedY;
      cell.rotation.z += cell.userData.rotSpeedZ;

      cell.position.y = cell.userData.initialY + Math.sin(elapsedTime * cell.userData.floatSpeed * 60 + cell.userData.phase) * cell.userData.floatRange;
    }

    // Subtle particle drift
    if (particleSystem) {
      particleSystem.rotation.y = elapsedTime * 0.015;
      particleSystem.rotation.x = elapsedTime * 0.008;
    }

    renderer.render(scene, camera);
  }

  try {
    init();
    isAnimating = true;
    animate();
  } catch (err) {
    console.warn('3D WebGL Canvas disabled or unsupported:', err);
  }
})();
