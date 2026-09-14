import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X } from 'lucide-react';

function makeMaterial(color, metalness = 0.7, roughness = 0.28) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

export default function LiveAssetModel({ asset, readings, onClose }) {
  const mountRef = useRef(null);
  const readingsRef = useRef(readings);

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071c2e');
    scene.fog = new THREE.Fog('#071c2e', 7, 14);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    // View the shaft/front face from an angle so the motor depth remains visible.
    camera.position.set(-4.8, 2.5, 4.6);
    camera.lookAt(-0.2, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.4;
    controls.maxDistance = 7;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#dff7ff', '#071827', 2.3));
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.5);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight('#28b9d4', 3, 8);
    rimLight.position.set(-3, 1.5, 2);
    scene.add(rimLight);

    const machine = new THREE.Group();
    scene.add(machine);

    const bodyMaterial = makeMaterial('#8faab7');
    const darkMetal = makeMaterial('#294d62');
    const brightMetal = makeMaterial('#d9e8ed', 0.85, 0.2);
    const copper = makeMaterial('#f1a33b', 0.75, 0.25);

    // Main cylindrical motor housing. Cylinder defaults to the Y axis, so rotate it onto X.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 2.7, 48), bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    machine.add(body);

    // Front and rear stepped end caps create real cylindrical depth.
    const frontCap = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 48), darkMetal);
    frontCap.rotation.z = Math.PI / 2;
    frontCap.position.x = -1.43;
    frontCap.castShadow = true;
    machine.add(frontCap);
    const rearCap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.16, 48), darkMetal);
    rearCap.rotation.z = Math.PI / 2;
    rearCap.position.x = 1.43;
    machine.add(rearCap);

    // Cooling ribs around the housing.
    for (let x = -1.05; x <= 1.05; x += 0.3) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.045, 8, 48), darkMetal);
      rib.rotation.y = Math.PI / 2;
      rib.position.x = x;
      machine.add(rib);
    }

    // Front shaft, bearing ring, and rotating fan/rotor.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.8, 32), brightMetal);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -1.88;
    shaft.castShadow = true;
    machine.add(shaft);
    const bearing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 12, 40), brightMetal);
    bearing.rotation.y = Math.PI / 2;
    bearing.position.x = -1.52;
    machine.add(bearing);

    const rotor = new THREE.Group();
    rotor.position.x = -2.03;
    machine.add(rotor);
    for (let index = 0; index < 6; index += 1) {
      const bladeAngle = (index * Math.PI * 2) / 6;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.18), copper);
      // The rotor is mounted on the X axis. Each blade sits in the YZ plane,
      // so rotation.x produces a true axle spin rather than a flat wobble.
      blade.position.y = Math.cos(bladeAngle) * 0.32;
      blade.position.z = Math.sin(bladeAngle) * 0.32;
      blade.rotation.x = -bladeAngle;
      blade.castShadow = true;
      rotor.add(blade);
    }
    const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 24), copper);
    rotorHub.rotation.z = Math.PI / 2;
    rotor.add(rotorHub);

    // Terminal box and mounting feet.
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.65), darkMetal);
    terminal.position.set(0.35, 0.98, 0);
    terminal.castShadow = true;
    machine.add(terminal);
    [-0.8, 0.8].forEach((x) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.72), darkMetal);
      foot.position.set(x, -0.95, 0);
      foot.castShadow = true;
      machine.add(foot);
    });

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5, 64),
      new THREE.MeshStandardMaterial({ color: '#0b263b', roughness: 0.8, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.05;
    floor.receiveShadow = true;
    scene.add(floor);

    const resize = () => {
      const width = mount.clientWidth || 800;
      const height = mount.clientHeight || 390;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let animationFrame;
    const animate = () => {
      const live = readingsRef.current || {};
      const rpm = Number(live.speed) || 1200;
      const temperature = Number(live.temperature) || 45;
      const vibration = Number(live.vibration) || 2;
      const heat = Math.max(0, Math.min(1, (temperature - 35) / 65));
      // Spin continuously around the physical axle; RPM controls the angular velocity.
      rotor.rotation.x = (rotor.rotation.x + Math.max(0.012, rpm / 44000)) % (Math.PI * 2);
      machine.position.y = Math.sin(performance.now() / 45) * Math.min(0.035, vibration / 180);
      rimLight.color.setHSL(0.04 - heat * 0.04, 0.8, 0.55);
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, [asset]);

  const live = readings || {};
  const rpm = Number(live.speed || 0).toFixed(0);
  const temperature = Number(live.temperature || 0).toFixed(1);
  const vibration = Number(live.vibration || 0).toFixed(1);

  return (
    <div className="bharat-live-model-card bharat-3d-only">
      <div className="bharat-3d-toolbar">
        <div><span className="bharat-eyebrow">LIVE 3D ASSET VIEW</span><strong>{asset?.name || 'Selected asset'}</strong></div>
        <button className="bharat-3d-close" onClick={onClose} aria-label="Close 3D model"><X size={17} /></button>
      </div>
      <div className="bharat-three-stage">
        <div ref={mountRef} className="bharat-three-canvas" />
        <div className="bharat-model-value top-left"><span>ASSET</span><strong>{asset?.id?.toUpperCase() || 'MACH_001'}</strong></div>
        <div className={`bharat-model-value top-right ${asset?.status || 'active'}`}><span>STATUS</span><strong>{asset?.status === 'critical' ? 'CRITICAL' : asset?.status === 'degraded' ? 'ATTENTION' : 'HEALTHY'}</strong></div>
        <div className="bharat-model-value bottom-left"><span>SHAFT SPEED</span><strong>{rpm} <em>RPM</em></strong></div>
        <div className="bharat-model-value bottom-right"><span>TEMPERATURE</span><strong>{temperature} <em>°C</em></strong><small>Vibration {vibration} mm/s</small></div>
      </div>
      <div className="bharat-3d-hint">Drag to orbit · Scroll to zoom · Live motor readings</div>
    </div>
  );
}
