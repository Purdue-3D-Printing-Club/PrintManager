import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import './stlPreview.css';

import homeIcon from '/images/home.svg'
import clearIcon from '/images/statusIcons/clear.svg'
import cubeIcon from '/images/cube.svg'
import rotateIcon from '/images/rotate.svg'
import gridIcon from '/images/grid.svg'



const StlPreview = ({ googleDriveLink, name, getDirectDownloadLink, serverURL, rotateInit }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const resetAnimRef = useRef(null);
    const [error, setError] = useState(false);
    const [transparent, setTransparent] = useState(false);
    const [outline, setOutline] = useState(false);
    const [rotate, setRotate] = useState(rotateInit);
    const [grid, setGrid] = useState(false);

    const [loadProgress, setLoadProgress] = useState(0);

    const homeCameraPos = useRef(new THREE.Vector3());
    const homeTarget = useRef(new THREE.Vector3());

    const objRef = useRef(null);
    const edgesRef = useRef(null);
    const gridRef = useRef(null);
    const axesRef = useRef(null);


    const rotateRef = useRef(rotate);

    useEffect(() => {
        rotateRef.current = rotate;
    }, [rotate]);


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
        const object = objRef.current;
        if (!object) return;

        object.traverse((child) => {
            if (!child.isMesh) return;      // only meshes
            if (!child.material) return;    // skip if no material

            child.material.transparent = transparent;
            child.material.opacity = transparent ? 0.4 : 1;
            child.material.needsUpdate = true;
        });
    }, [transparent]);

    useEffect(() => {
        const edges = edgesRef.current;
        if (!edges) return;

        if (Array.isArray(edges)) {
            edges.forEach((line) => {
                line.visible = outline;
            });
        } else {
            edges.visible = outline;
        }
    }, [outline]);

    useEffect(() => {
        if (!gridRef.current || !axesRef.current) return;
        gridRef.current.visible = grid;
        axesRef.current.visible = grid;
    }, [grid]);



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


        const grid = new THREE.GridHelper(1000, 10, 0x444444, 0x888888);
        grid.material.depthTest = false;
        grid.material.depthWrite = false;
        grid.renderOrder = -1;
        grid.visible = false;
        scene.add(grid);
        gridRef.current = grid;

        // const axes = new THREE.AxesHelper(50);
        const axes = customAxes({
            length: 20,
            radius: 1,
            arrowLength: 4,
            arrowRadius: 2
        });

        // add axes on top of everything
        axes.renderOrder = 999;
        axes.traverse((child) => {
            if (child.material) {
                child.material.depthTest = false;
                child.material.depthWrite = false;
                child.material.transparent = true;
            }
        });
        scene.add(axes);
        axes.visible = false;
        axesRef.current = axes;


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
            const hemi = new THREE.HemisphereLight(
                0xffffff,   // sky color
                0x222222,   // ground color
                0.5
            );
            scene.add(hemi);

            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());

            // First directional light
            const directional1 = new THREE.DirectionalLight(0xffffff, 1);
            directional1.position.set(center.x + size, center.y + size, center.z + size);
            directional1.target.position.copy(center);  // point at object center
            scene.add(directional1);
            scene.add(directional1.target);
        };

        let pivot = new THREE.Object3D();
        scene.add(pivot);

        // First attempt STL
        const tryLoadingSTL = () => {
            const stlLoader = new STLLoader();

            stlLoader.load(
                streamUrl,
                (geometry) => {
                    geometry.computeVertexNormals();
                    geometry.center();

                    const material = new THREE.MeshPhongMaterial({
                        color: 0x44cc55,
                        specular: 0x222,
                        shininess: 150,
                        side: THREE.DoubleSide,
                    });

                    geometry.computeBoundingBox();

                    const mesh = new THREE.Mesh(geometry, material);

                    // add edge lines
                    const edges = new THREE.EdgesGeometry(geometry);
                    const edgeLines = new THREE.LineSegments(
                        edges,
                        new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
                    );
                    mesh.add(edgeLines);
                    edgeLines.visible = outline;
                    edgesRef.current = edgeLines;

                    mesh.rotation.x = -Math.PI / 2;
                    loadedObject = mesh;
                    pivot.add(mesh);


                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();

                    box.getSize(size);
                    box.getCenter(center);

                    const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                    const boxMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff8800,
                        wireframe: true,
                        depthTest: false,
                        depthWrite: false
                    });
                    const bboxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                    bboxMesh.position.copy(center);
                    // scene.add(bboxMesh);
                    mesh.position.y = size.y / 2;



                    setError(false);
                    addDirectionalLighting(mesh)
                    fitCameraToObject(mesh);
                    setLoadProgress(100);

                    objRef.current = mesh;
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
                        // child.geometry.center();

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


                        // create edge lines for each mesh
                        const edges = new THREE.EdgesGeometry(child.geometry);
                        const edgeLines = new THREE.LineSegments(
                            edges,
                            new THREE.LineBasicMaterial({ color: 0x000000 })
                        );

                        child.add(edgeLines);
                        edgeLines.visible = outline;
                        edgesRef.current = edgesRef.current || [];
                        edgesRef.current.push(edgeLines);
                    });



                    object.rotation.x = -Math.PI / 2;
                    object.updateWorldMatrix(true, true);
                    pivot.add(object);


                    const box = new THREE.Box3().setFromObject(object);

                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();

                    box.getSize(size);
                    box.getCenter(center);

                    object.position.set(0, size.y / 2, 0);


                    // Move object so its center is at the world origin
                    object.position.sub(center);


                    loadedObject = object;

                    setError(false);
                    addDirectionalLighting(object)
                    fitCameraToObject(object);
                    setLoadProgress(100);

                    objRef.current = object;
                },
                (xhr) => trackProgress(xhr),
                () => {
                    tryLoadingOBJ();
                }
            );
        };

        const tryLoadingOBJ = async () => {

            // First check for binary data
            const partialResponse = await fetch(streamUrl, {
                headers: { 'Range': 'bytes=0-1023' }
            });
            const buffer = await partialResponse.arrayBuffer();
            const uint8 = new Uint8Array(buffer);

            let isBinary = false;
            for (let i = 0; i < uint8.length; i++) {
                if (uint8[i] === 0) {
                    isBinary = true;
                    break;
                }
            }

            if (isBinary) {
                console.error("Aborting: Binary data detected in OBJ header.");
                setError(true);
                setLoadProgress(100);
                return;
            }

            // data looks like ASCII (needed for OBJ file)
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

                        // create edge lines for each mesh
                        const edges = new THREE.EdgesGeometry(child.geometry);
                        const edgeLines = new THREE.LineSegments(
                            edges,
                            new THREE.LineBasicMaterial({ color: 0x000000 })
                        );

                        child.add(edgeLines);
                        edgeLines.visible = outline;
                        edgesRef.current = edgesRef.current || [];
                        edgesRef.current.push(edgeLines);
                    });



                    object.rotation.x = -Math.PI / 2;
                    object.updateWorldMatrix(true, true);
                    pivot.add(object);


                    const box = new THREE.Box3().setFromObject(object);

                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();

                    box.getSize(size);
                    box.getCenter(center);

                    object.position.set(0, size.y / 2, 0);

                    // Move object so its center is at the world origin
                    object.position.sub(center);

                    loadedObject = object;


                    setError(false);
                    addDirectionalLighting(object);
                    fitCameraToObject(object);
                    setLoadProgress(100);

                    objRef.current = object;
                },
                (xhr) => trackProgress(xhr),
                () => {
                    errorCallback();
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
            if (rotateRef.current && loadedObject) {
                // loadedObject.rotation.z += 0.005;
                const axis = new THREE.Vector3(0, 1, 0);
                // loadedObject.rotateOnWorldAxis(axis, 0.005);
                pivot.rotateOnWorldAxis(axis, 0.004)
            }
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




    function customAxes({
        length = 20,
        radius = 0.25,
        arrowLength = 3,
        arrowRadius = 0.6
    } = {}) {
        const group = new THREE.Group();

        const axes = [
            { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000 }, // X
            { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00 }, // Y
            { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff }, // Z
        ];

        for (const { dir, color } of axes) {
            const material = new THREE.MeshBasicMaterial({
                color,
                depthTest: false,
                depthWrite: false
            });

            // Shaft
            const shaftGeom = new THREE.CylinderGeometry(
                radius,
                radius,
                length,
                16
            );
            const shaft = new THREE.Mesh(shaftGeom, material);

            // Arrowhead
            const arrowGeom = new THREE.ConeGeometry(
                arrowRadius,
                arrowLength,
                20
            );
            const arrow = new THREE.Mesh(arrowGeom, material);

            // Orient along axis
            const quat = new THREE.Quaternion();
            quat.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                dir
            );

            shaft.quaternion.copy(quat);
            arrow.quaternion.copy(quat);

            // Position shaft
            shaft.position.copy(dir).multiplyScalar(length / 2);

            // Position arrow at the end
            arrow.position.copy(dir).multiplyScalar(length + arrowLength / 2);

            shaft.renderOrder = 999;
            arrow.renderOrder = 999;

            group.add(shaft);
            group.add(arrow);
        }

        return group;
    }


    return (
        <div>
            <span>{name}</span>
            <div ref={containerRef} style={{ width: '300px', height: '300px', position: 'relative', cursor: 'move' }}>

                {(loadProgress < 100) && <div className="loading">
                    <div>{`Loading file preview...`}</div>
                    <br />
                    <div className="progressBar" style={{
                        color: 'black', background:
                            `linear-gradient(to right, rgba(110, 200, 110, 1) ${loadProgress - 2}%, rgb(200,50,50) ${loadProgress}%, lightgray ${loadProgress + 1}%)`
                    }}>
                        {`${loadProgress?.toFixed(0)}%`}
                    </div>
                </div>}

                {error ?
                    <div className="error"> {'Unable to preview this file.\n\nSupported file types:\n .stl, .3mf, .obj'} </div>
                    :
                    <>
                        <img className='previewBtn homeBtn' src={homeIcon} onClick={() => {
                            resetView()
                        }}></img>
                        <img className={`previewBtn transpBtn ${transparent ? 'on' : ''}`} src={clearIcon}
                            style={{ top: '32px' }}
                            onClick={() => {
                                setTransparent(old => !old)
                            }}></img>
                        <img className={`previewBtn transpBtn ${outline ? 'on' : ''}`} src={cubeIcon}
                            style={{ top: '64px' }}
                            onClick={() => {
                                setOutline(old => !old)
                            }}></img>
                        <img className={`previewBtn transpBtn ${rotate ? 'on' : ''}`} src={rotateIcon}
                            style={{ top: '96px' }}
                            onClick={() => {
                                setRotate(old => !old)
                            }}></img>
                        <img className={`previewBtn transpBtn ${grid ? 'on' : ''}`} src={gridIcon}
                            style={{ top: '128px' }}
                            onClick={() => {
                                setGrid(old => !old)
                            }}></img>
                    </>

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
