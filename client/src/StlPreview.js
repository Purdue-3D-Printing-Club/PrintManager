import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const StlPreview = ({ googleDriveLink, name, getDirectDownloadLink, serverURL }) => {
  const containerRef = useRef(null);
  //console.log('STLPREVIEW: ', googleDriveLink, name)

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x606060, 2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 5, 3);
    camera.add(directionalLight);
    scene.add(camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = -Infinity;
    controls.maxPolarAngle = Infinity;


    // Use the Node server's proxy endpoint to fetch the STL file
    const stlResource = `${serverURL}/api/stream-stl?url=${encodeURIComponent(googleDriveLink)}`;

    const loader = new STLLoader();

    loader.load(
      stlResource,
      (geometry) => {
        geometry.center();

        const material = new THREE.MeshPhongMaterial({
          color: 0x55ee88,
          specular: 0x333333,
          shininess: 200,
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);



        geometry.computeBoundingSphere();
        const sphere = geometry.boundingSphere;
        const center = sphere.center;
        const radius = sphere.radius;

        // Fit the model in the camera's view
        const fovInRadians = camera.fov * (Math.PI / 180);
        const cameraDistance = radius / Math.sin(fovInRadians / 2);

        camera.position.copy(center);
        camera.position.z += cameraDistance;
        camera.position.y -= cameraDistance;
        camera.position.x += cameraDistance / 4;


        // Adjust the near and far clipping planes relative to the camera distance
        camera.near = cameraDistance / 100;
        camera.far = cameraDistance * 100;
        camera.updateProjectionMatrix();

        // Update OrbitControls to center on the model
        controls.target.copy(center);
        controls.update();


      },
      (xhr) => {
        //console.log(`Loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
      },
      (error) => {
        console.error('Error loading STL file:', error);
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      // eslint-disable-next-line
      const container = containerRef.current;
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [googleDriveLink, serverURL]);


  return <>
    <div>
      <span>{name}</span>
      <div ref={containerRef} style={{ width: '400px', height: '400px' }} />
      <button onClick={() => { window.location.href = getDirectDownloadLink(googleDriveLink) }} style={{ marginBottom: '2px' }}>Download</button>
    </div>

  </>;
};

export default StlPreview;
