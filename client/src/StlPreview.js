import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const StlPreview = ({ googleDriveLink, name, getDirectDownloadLink, serverURL }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Three.js setup
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x606060, 2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 5, 3);
    camera.add(directionalLight);
    scene.add(camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    let mesh = null;

    // Load STL file
    const stlResource = `${serverURL}/api/stream-stl?url=${encodeURIComponent(googleDriveLink)}`;
    const loader = new STLLoader();

    loader.load(
      stlResource,
      (geometry) => {
        geometry.center();
        const material = new THREE.MeshPhongMaterial({
          color: 0x88ff99,
          specular: 0x333333,
          shininess: 200,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Fit model to view
        geometry.computeBoundingSphere();
        const { center, radius } = geometry.boundingSphere;
        const fovInRadians = camera.fov * (Math.PI / 180);
        const cameraDistance = radius / Math.sin(fovInRadians / 2);

        camera.position.copy(center);
        camera.position.z += cameraDistance;
        camera.position.y -= cameraDistance;
        camera.position.x += cameraDistance / 4;

        camera.near = cameraDistance / 100;
        camera.far = cameraDistance * 100;
        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.update();
      },
      null,
      (error) => console.error('Error loading STL file:', error)
    );

    // Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup resources
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (controls) controls.dispose();

      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }

      scene.traverse((child) => {
        if (child.isMesh) {
          scene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current.domElement.remove();
        rendererRef.current = null;
      }
    };
  }, [googleDriveLink, serverURL]);

  return (
    <div>
      <span>{name}</span>
      <div ref={containerRef} style={{ width: '400px', height: '400px' }} />
      <button onClick={() => { window.location.href = getDirectDownloadLink(googleDriveLink) }} style={{ marginBottom: '2px' }}>Download</button>
    </div>
  );
};

export default StlPreview;
