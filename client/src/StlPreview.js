import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import './stlPreview.css';

import homeIcon from '/images/home.svg'

const StlPreview = ({ googleDriveLink, name, getDirectDownloadLink, serverURL }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const resetAnimRef = useRef(null);
    const [error, setError] = useState(false);

    const [loadProgress, setLoadProgress] = useState(0);

    const homeCameraPos = useRef(new THREE.Vector3());
    const homeTarget = useRef(new THREE.Vector3());

    // resets the view to the home view with smooth interpolation
    const resetView = () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;

        const duration = 300; // ms
        const startTime = performance.now();

        const startCamPos = camera.position.clone();
        const startTarget = controls.target.clone();

        const endCamPos = homeCameraPos.current.clone();
        const endTarget = homeTarget.current.clone();

        // Cancel any existing reset animation
        resetAnimRef.current = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Smoothstep easing rather than linear interpolation
            const smoothT = t * t * (3 - 2 * t);

            camera.position.lerpVectors(startCamPos, endCamPos, smoothT);
            controls.target.lerpVectors(startTarget, endTarget, smoothT);
            controls.update();

            if (t < 1) {
                requestAnimationFrame(resetAnimRef.current);
            } else {
                resetAnimRef.current = null;
            }
        };

        requestAnimationFrame(resetAnimRef.current);
    };

    const trackProgress = (xhr) => {
        if (xhr.lengthComputable) {
            const progress = (xhr.loaded / xhr.total) * 100;
            setLoadProgress(progress);

        }
    }

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        setError(false);

        // Scene setup
        const scene = new THREE.Scene();
        const width = container.clientWidth;
        const height = container.clientHeight;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        camera.position.set(0, 0, 100);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambient);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.15;
        controlsRef.current = controls;

        let loadedObject = null;

        const streamUrl = `${serverURL}/api/stream-stl?url=${encodeURIComponent(googleDriveLink)}`;
        

        // Utility: fit camera to any Object3D
        const fitCameraToObject = (object) => {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());

            camera.near = size / 100;
            camera.far = size * 100;
            camera.updateProjectionMatrix();

            camera.position.copy(center);
            camera.position.x += size * 0.75;
            camera.position.y += size * 0.75;
            camera.position.z += size * 1.1;

            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();

            homeCameraPos.current.copy(camera.position);
            homeTarget.current.copy(controls.target);
        };

        const addDirectionalLighting = (object) => {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());

            // First directional light
            const directional1 = new THREE.DirectionalLight(0xffffff, 1);
            directional1.position.set(center.x + size, center.y + size, center.z + size);
            directional1.target.position.copy(center);  // point at object center
            scene.add(directional1);
            scene.add(directional1.target);

            // Second directional light on opposite side
            const directional2 = new THREE.DirectionalLight(0xffffff, 1);
            directional2.position.set(center.x - size, center.y - size, center.z + size);
            directional2.target.position.copy(center);
            scene.add(directional2);
            scene.add(directional2.target);
        };

        // First attempt STL
        const tryLoadingSTL = () => {
            const stlLoader = new STLLoader();

            stlLoader.load(
                streamUrl,
                (geometry) => {
                    geometry.center();

                    const material = new THREE.MeshPhongMaterial({
                        color: 0x55ee77,
                        specular: 0x333333,
                        shininess: 150,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    loadedObject = mesh;
                    scene.add(mesh);

                    addDirectionalLighting(mesh)
                    fitCameraToObject(mesh);
                    setLoadProgress(100);
                },
                (xhr) => trackProgress(xhr),
                () => {
                    // STL failed, try 3MF
                    tryLoading3MF();
                }
            );
        };

        // Then try loading the 3MF
        const tryLoading3MF = () => {
            const mfLoader = new ThreeMFLoader();

            mfLoader.load(
                streamUrl,
                (object) => {
                    object.traverse((child) => {
                        if (!child.isMesh) return;
                        if (!child.geometry.attributes.normal) {
                            child.geometry.computeVertexNormals();
                        }

                        const hasVertexColors =
                            child.geometry &&
                            child.geometry.attributes &&
                            child.geometry.attributes.color;

                        if (hasVertexColors) {
                            // Use vertex colors defined in the 3MF
                            child.material = new THREE.MeshPhongMaterial({
                                vertexColors: true,
                                shininess: 150,
                                specular: 0x333333,

                            });
                        } else {
                            // No colors in file, fallback to blue
                            child.material = new THREE.MeshPhongMaterial({
                                color: 0x6699ff,
                                shininess: 150,
                                specular: 0x333333,

                            });
                        }
                    });

                    loadedObject = object;
                    scene.add(object);

                    addDirectionalLighting(object)
                    fitCameraToObject(object);
                    setLoadProgress(100);
                },
                (xhr) => trackProgress(xhr),
                () => {
                    tryLoadingOBJ();
                }
            );
        };

        const tryLoadingOBJ = () => {
            const objLoader = new OBJLoader();
            let errorCallback = () => {
                setLoadProgress(100);
                setError(true);
            }
            objLoader.load(
                streamUrl,
                (object) => {
                    object.traverse((child) => {
                        if (!child.isMesh) return;

                        const geom = child.geometry;

                        // Ensure normals exist
                        if (!geom.attributes.normal) {
                            geom.computeVertexNormals();
                        }
                    
                        // check the bounding box to see if anything was loaded
                        geom.computeBoundingBox();
                        const box = geom.boundingBox;
                        if (!box) {
                            errorCallback();
                            return;
                        }
                        const size = new THREE.Vector3();
                        box.getSize(size);
                        const epsilon = 1e-6;
                        if ((size.x < epsilon && size.y < epsilon && size.z < epsilon) || 
                        !size.x || !size.y || !size.z) {
                            errorCallback();
                            return;
                        }          
                    
                            

                        // OBJ does not support vertex colors
                        child.material = new THREE.MeshPhongMaterial({
                            color: 0xd44050,
                            shininess: 120,
                            specular: 0x333333,
                        });
                    });

                    loadedObject = object;
                    scene.add(object);

                    addDirectionalLighting(object);
                    fitCameraToObject(object);
                    setLoadProgress(100);
                },
               (xhr) => trackProgress(xhr),
                () => {
                  errorCallback  
                }
            );
        };



        setLoadProgress(0);
        tryLoadingSTL();

        // Render loop
        let rafId;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize handling
        const onResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', onResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(rafId);

            if (controls) controls.dispose();

            if (loadedObject) {
                scene.remove(loadedObject);
                loadedObject.traverse?.((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose();
                        if (Array.isArray(child.material)) {
                            child.material.forEach((m) => m.dispose());
                        } else {
                            child.material?.dispose();
                        }
                    }
                });
            }

            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
            rendererRef.current = null;
        };
    }, [googleDriveLink, serverURL]);

    return (
        <div>
            <span>{name}</span>
            <div ref={containerRef} style={{ width: '300px', height: '300px', position: 'relative', cursor: 'move' }}>

                {(loadProgress < 100) && <div className="loading">
                    <div>{`Loading file preview...`}</div>
                    <br/>
                    <div className = "progressBar" style={{ color:'black', background: 
                        `linear-gradient(to right, rgba(110, 200, 110, 1) ${loadProgress - 2}%, rgb(200,50,50) ${loadProgress}%, lightgray ${loadProgress + 1}%)`}}>
                    {`${loadProgress?.toFixed(0)}%`}
                    </div>
                </div>}

                {error ?
                    <div className="error"> {'Unable to preview this file.\n\nSupported file types:\n .stl, .3mf, .obj'} </div>
                    :
                    <img className='homeBtn' src={homeIcon} onClick={() => {
                        resetView()
                    }}></img>
                }

            </div>
            <button
                onClick={() => {
                    window.location.href = getDirectDownloadLink(googleDriveLink);
                }} style={{ marginTop: '4px', marginBottom: '2px', cursor: 'pointer' }}>
                Download
            </button>
        </div>
    );
};

export default StlPreview;
