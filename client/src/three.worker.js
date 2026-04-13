import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// -------------------------------------------------------------
// POLYFILL: Robust DOMParser & querySelector for ThreeMFLoader
// -------------------------------------------------------------
import { DOMParser } from '@xmldom/xmldom'; 

const dummyDoc = new DOMParser().parseFromString('<xml></xml>', 'application/xml');
const DocumentProto = Object.getPrototypeOf(dummyDoc);
const ElementProto = Object.getPrototypeOf(dummyDoc.documentElement);

const robustQuerySelectorAll = function (selector) {
    let tag = selector;
    let attrName = null;
    let attrValue = null;
    
    // 1. Parse Attribute Selectors (e.g., object[id="123"])
    const attrMatch = selector.match(/^([a-zA-Z0-9_-]+)\[([a-zA-Z0-9_-]+)=["']?([^\]"']+)["']?\]$/);
    if (attrMatch) {
        tag = attrMatch[1];
        attrName = attrMatch[2];
        attrValue = attrMatch[3];
    } else {
        // 2. Parse Descendant Selectors (e.g., "vertices > vertex" or "build item")
        const parts = selector.split(/[\s>]+/);
        tag = parts[parts.length - 1];
    }

    const allElements = this.getElementsByTagName('*');
    const result = [];
    
    // Iterate all nodes, strip namespaces, and match exactly what ThreeMFLoader expects
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const localName = el.nodeName.includes(':') ? el.nodeName.split(':')[1] : el.nodeName;
        
        if (localName.toLowerCase() === tag.toLowerCase()) {
            if (attrName) {
                if (el.getAttribute(attrName) === attrValue) {
                    result.push(el);
                }
            } else {
                result.push(el);
            }
        }
    }
    return result; // Returning a standard Array ensures .length works perfectly for Three.js
};

// Apply the patch
[DocumentProto, ElementProto].forEach(proto => {
    if (!proto) return;
    proto.querySelectorAll = robustQuerySelectorAll;
    proto.querySelector = function(sel) { 
        const res = this.querySelectorAll(sel); 
        return res.length > 0 ? res[0] : null; 
    };
});

self.DOMParser = DOMParser;


// -------------------------------------------------------------
// MOCK DOM ELEMENT (Bridges OrbitControls with Worker Events)
// -------------------------------------------------------------
class WorkerDOMElement extends THREE.EventDispatcher {
    constructor() {
        super();
        this.clientWidth = 0;
        this.clientHeight = 0;
        this.ownerDocument = this; // Fakes document access
        this.style = {}; 
    }
    addEventListener(type, listener) { super.addEventListener(type, listener); }
    removeEventListener(type, listener) { super.removeEventListener(type, listener); }
    setPointerCapture() {}
    releasePointerCapture() {}
    focus() {}
    getRootNode() { return this; }
    getBoundingClientRect() {
        return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight, right: this.clientWidth, bottom: this.clientHeight };
    }
    handleEvent(e) {
        e.preventDefault = () => {};
        e.stopPropagation = () => {};
        this.dispatchEvent(e);
    }
}

// -------------------------------------------------------------
// WORKER GLOBALS
// -------------------------------------------------------------
let scene, camera, renderer, controls, proxyElement;
let pivot, gridHelper, axesHelper, loadedObject;
let edgeLinesArray = [];
let state = { transparent: false, outline: false, rotate: false, grid: false };

let homeCameraPos = new THREE.Vector3();
let homeTarget = new THREE.Vector3();
let resetAnimState = null;

self.onmessage = function (e) {
    const { type, payload, canvas, width, height, pixelRatio, streamUrl, state: initState } = e.data;

    switch (type) {
        case 'INIT':
            state = { ...state, ...initState };
            initScene(canvas, width, height, pixelRatio);
            loadModels(streamUrl);
            break;
        case 'RESIZE':
            if (!camera || !renderer) return;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
            proxyElement.clientWidth = width;
            proxyElement.clientHeight = height;
            break;
        case 'UPDATE_STATE':
            updateVisualState(payload);
            break;
        case 'DOM_EVENT':
            if (proxyElement) proxyElement.handleEvent(payload);
            break;
        case 'RESET_VIEW':
            startResetView();
            break;
    }
};

// -------------------------------------------------------------
// SCENE & UTILITIES
// -------------------------------------------------------------
function customAxes({ length = 20, radius = 0.25, arrowLength = 3, arrowRadius = 0.6 } = {}) {
    const group = new THREE.Group();
    const axes = [
        { dir: new THREE.Vector3(1, 0, 0), color: 0xff0000 },
        { dir: new THREE.Vector3(0, 1, 0), color: 0x00ff00 },
        { dir: new THREE.Vector3(0, 0, 1), color: 0x0000ff },
    ];

    for (const { dir, color } of axes) {
        const material = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), material);
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(arrowRadius, arrowLength, 20), material);
        
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        shaft.quaternion.copy(quat);
        arrow.quaternion.copy(quat);
        
        shaft.position.copy(dir).multiplyScalar(length / 2);
        arrow.position.copy(dir).multiplyScalar(length + arrowLength / 2);
        
        shaft.renderOrder = 999;
        arrow.renderOrder = 999;
        
        group.add(shaft);
        group.add(arrow);
    }
    return group;
}

function initScene(canvas, width, height, pixelRatio) {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 0, 100);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    proxyElement = new WorkerDOMElement();
    proxyElement.clientWidth = width;
    proxyElement.clientHeight = height;

    controls = new OrbitControls(camera, proxyElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;

    gridHelper = new THREE.GridHelper(1000, 10, 0x444444, 0x888888);
    gridHelper.material.depthTest = false;
    gridHelper.material.depthWrite = false;
    gridHelper.renderOrder = -1;
    gridHelper.visible = state.grid;
    scene.add(gridHelper);

    axesHelper = customAxes({ length: 20, radius: 1, arrowLength: 4, arrowRadius: 2 });
    axesHelper.renderOrder = 999;
    axesHelper.traverse(child => {
        if (child.material) {
            child.material.depthTest = false;
            child.material.depthWrite = false;
            child.material.transparent = true;
        }
    });
    axesHelper.visible = state.grid;
    scene.add(axesHelper);

    pivot = new THREE.Object3D();
    scene.add(pivot);

    requestAnimationFrame(animate);
}

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

    homeCameraPos.copy(camera.position);
    homeTarget.copy(controls.target);
};

const addDirectionalLighting = (object) => {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.5));
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(center.x + size, center.y + size, center.z + size);
    directional.target.position.copy(center);
    scene.add(directional);
    scene.add(directional.target);
};

// -------------------------------------------------------------
// STATE MANAGEMENT & LOADING
// -------------------------------------------------------------
function startResetView() {
    resetAnimState = {
        startTime: performance.now(),
        startCamPos: camera.position.clone(),
        startTarget: controls.target.clone()
    };
}

function updateVisualState(newState) {
    state = { ...state, ...newState };

    if (loadedObject) {
        loadedObject.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = state.transparent;
                child.material.opacity = state.transparent ? 0.4 : 1;
                child.material.needsUpdate = true;
            }
        });
    }

    edgeLinesArray.forEach(edges => { if (edges) edges.visible = state.outline; });
    if (gridHelper) gridHelper.visible = state.grid;
    if (axesHelper) axesHelper.visible = state.grid;
}

async function loadModels(streamUrl) {
    const reportProgress = (xhr) => {
        if (xhr.lengthComputable) {
            self.postMessage({ type: 'PROGRESS', payload: (xhr.loaded / xhr.total) * 100 });
        }
    };

    const trySTL = () => new Promise((resolve, reject) => new STLLoader().load(streamUrl, resolve, reportProgress, reject));
    const try3MF = () => new Promise((resolve, reject) => new ThreeMFLoader().load(streamUrl, resolve, reportProgress, reject));
    const tryOBJ = async () => {
        const partialResponse = await fetch(streamUrl, { headers: { 'Range': 'bytes=0-1023' } });
        const buffer = await partialResponse.arrayBuffer();
        if (new Uint8Array(buffer).some(byte => byte === 0)) throw new Error("Binary OBJ detected");
        return new Promise((resolve, reject) => new OBJLoader().load(streamUrl, resolve, reportProgress, reject));
    };

    try {
        const stlGeom = await trySTL();
        
        // Guard against false positives where STLLoader parses an empty buffer
        if (!stlGeom || !stlGeom.attributes.position || stlGeom.attributes.position.count === 0) {
            throw new Error("Empty geometry");
        }
        
        stlGeom.computeVertexNormals();
        stlGeom.center();
        
        const mat = new THREE.MeshPhongMaterial({ color: 0x44cc55, specular: 0x222, shininess: 150, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(stlGeom, mat);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(stlGeom), new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
        mesh.add(edges);
        edgeLinesArray.push(edges);

        mesh.rotation.x = -Math.PI / 2;
        const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        mesh.position.y = size.y / 2;
        
        pivot.add(mesh);
        loadedObject = mesh;
        finalizeLoad(mesh);
        return;
    } catch (e) {
        // Silently fall through. STLLoader intentionally fails on 3MF zips.
    }

    try {
        const mfObj = await try3MF();
        
        let meshCount = 0;
        mfObj.traverse(child => {
            if (!child.isMesh) return;
            meshCount++;
            if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
            
            const hasColor = child.geometry?.attributes?.color;
            child.material = new THREE.MeshPhongMaterial({
                color: hasColor ? 0xffffff : 0x6699ff,
                vertexColors: !!hasColor, shininess: 150, specular: 0x333333
            });
            
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry), new THREE.LineBasicMaterial({ color: 0x000000 }));
            child.add(edges);
            edgeLinesArray.push(edges);
        });

        if (meshCount === 0) throw new Error("3MF parsing returned no geometry");
        
        mfObj.rotation.x = -Math.PI / 2;
        mfObj.updateWorldMatrix(true, true);
        
        const box = new THREE.Box3().setFromObject(mfObj);
        const center = box.getCenter(new THREE.Vector3());
        mfObj.position.set(0, box.getSize(new THREE.Vector3()).y / 2, 0).sub(center);
        
        pivot.add(mfObj);
        loadedObject = mfObj;
        finalizeLoad(mfObj);
        return;
    } catch (e) {
        // Silently fall through
    }

    try {
        const objData = await tryOBJ();
        objData.traverse(child => {
            if (!child.isMesh) return;
            const geom = child.geometry;
            if (!geom.attributes.normal) geom.computeVertexNormals();
            
            geom.computeBoundingBox();
            if (!geom.boundingBox) throw new Error("Empty bounds");
            
            child.material = new THREE.MeshPhongMaterial({ color: 0xd44050, shininess: 120, specular: 0x333333 });
            
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({ color: 0x000000 }));
            child.add(edges);
            edgeLinesArray.push(edges);
        });
        
        objData.rotation.x = -Math.PI / 2;
        objData.updateWorldMatrix(true, true);
        
        const box = new THREE.Box3().setFromObject(objData);
        const center = box.getCenter(new THREE.Vector3());
        objData.position.set(0, box.getSize(new THREE.Vector3()).y / 2, 0).sub(center);
        
        pivot.add(objData);
        loadedObject = objData;
        finalizeLoad(objData);
        return;
    } catch (e) {
        self.postMessage({ type: 'ERROR' }); // Everything failed
    }
}

function finalizeLoad(object) {
    updateVisualState(state); 
    addDirectionalLighting(object);
    fitCameraToObject(object);
    self.postMessage({ type: 'LOADED' });
}

// -------------------------------------------------------------
// RENDER LOOP
// -------------------------------------------------------------
function animate(time) {
    requestAnimationFrame(animate);

    if (resetAnimState) {
        const { startTime, startCamPos, startTarget } = resetAnimState;
        const t = Math.min((time - startTime) / 300, 1);
        const smoothT = t * t * (3 - 2 * t);

        camera.position.lerpVectors(startCamPos, homeCameraPos, smoothT);
        controls.target.lerpVectors(startTarget, homeTarget, smoothT);

        if (t >= 1) resetAnimState = null;
    }

    controls.update();

    if (state.rotate && pivot) {
        pivot.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.004);
    }

    renderer.render(scene, camera);
}