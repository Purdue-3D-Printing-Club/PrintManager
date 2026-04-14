import React, { useEffect, useRef, useState } from 'react';
import './stlPreview.css';

import homeIcon from '/images/home.svg'
import clearIcon from '/images/statusIcons/clear.svg'
import cubeIcon from '/images/cube.svg'
import rotateIcon from '/images/rotate.svg'
import gridIcon from '/images/grid.svg'

const StlPreview = ({ googleDriveLink, name, getDirectDownloadLink, serverURL, rotateInit, removeCallback, fileIndex }) => {
    const containerRef = useRef(null);
    const workerRef = useRef(null); // canvasRef is removed

    const [error, setError] = useState(false);
    const [transparent, setTransparent] = useState(false);
    const [outline, setOutline] = useState(false);
    const [rotate, setRotate] = useState(rotateInit);
    const [grid, setGrid] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Dynamically create a new canvas element and inject it into the container
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        containerRef.current.appendChild(canvas);

        // Initialization
        const worker = new Worker(new URL('./three.worker.js', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        const offscreen = canvas.transferControlToOffscreen();
        const streamUrl = `${serverURL}/api/stream-stl?url=${encodeURIComponent(googleDriveLink)}`;

        worker.postMessage({
            type: 'INIT',
            canvas: offscreen,
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            pixelRatio: window.devicePixelRatio,
            streamUrl,
            state: { transparent, outline, rotate, grid }
        }, [offscreen]);

        // Listen for progress/status events
        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'PROGRESS') setLoadProgress(payload);
            if (type === 'ERROR') setError(true);
            if (type === 'LOADED') setLoadProgress(100);
        };

        // Pass through events for orbit controls
        const forwardEvent = (e) => {
            e.preventDefault();

            if (e.type === 'pointerdown') {
                canvas.setPointerCapture(e.pointerId);
            } else if (e.type === 'pointerup' || e.type === 'pointercancel') {
                if (canvas.hasPointerCapture(e.pointerId)) {
                    canvas.releasePointerCapture(e.pointerId);
                }
            }

            const rect = canvas.getBoundingClientRect();
            worker.postMessage({
                type: 'DOM_EVENT',
                payload: {
                    type: e.type,
                    clientX: e.clientX - rect.left,
                    clientY: e.clientY - rect.top,
                    deltaY: e.deltaY,
                    button: e.button,
                    pointerId: e.pointerId,
                    pointerType: e.pointerType,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey,
                    shiftKey: e.shiftKey
                }
            });
        };

        const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'wheel', 'contextmenu'];
        events.forEach(eventName => canvas.addEventListener(eventName, forwardEvent, { passive: false }));

        // Handle container resizing
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                worker.postMessage({
                    type: 'RESIZE',
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            // Cleanup
            events.forEach(eventName => canvas.removeEventListener(eventName, forwardEvent));
            resizeObserver.disconnect();
            worker.terminate();
            if (containerRef.current?.contains(canvas)) {
                containerRef.current.removeChild(canvas);
            }
        };
    }, [googleDriveLink, serverURL]);

    // Synchronize React state with Worker state
    useEffect(() => {
        workerRef.current?.postMessage({
            type: 'UPDATE_STATE',
            payload: { transparent, outline, rotate, grid }
        });
    }, [transparent, outline, rotate, grid]);

    const resetView = () => workerRef.current?.postMessage({ type: 'RESET_VIEW' });

    return (
        <div>
            <span>{name}</span>
            <div ref={containerRef} style={{ width: '300px', height: '300px', position: 'relative', cursor: 'move', touchAction: 'none' }}>

                {/* The <canvas> will be automatically injected here by the useEffect */}

                {/* Loading Overlay */}
                {(loadProgress < 100) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        pointerEvents: 'none', //zIndex: 10
                    }}>
                        <div className="loading" style={{ textAlign: 'center' }}>
                            <div>{`Loading file preview...`}</div>
                            <br />
                            <div className="progressBar" style={{
                                color: 'black', background:
                                    `linear-gradient(to right, rgba(110, 200, 110, 1) ${loadProgress - 2}%, rgb(200,50,50) ${loadProgress}%, lightgray ${loadProgress + 1}%)`
                            }}>
                                {`${loadProgress?.toFixed(0)}%`}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {error && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        pointerEvents: 'none', //zIndex: 10
                    }}>
                        <div className="error" style={{ textAlign: 'center', whiteSpace: 'pre-wrap' }}>
                            {'Unable to preview this file.\n\nSupported file types:\n .stl, .3mf, .obj'}
                        </div>
                    </div>
                )}

                {/* Toolbar Buttons */}
                {!error && (
                    <>
                        <img draggable={false} className='previewBtn homeBtn' src={homeIcon} onClick={resetView} alt="Reset View" />
                        <img draggable={false} className={`previewBtn transpBtn ${transparent ? 'on' : ''}`} src={clearIcon} style={{ top: '32px' }} onClick={() => setTransparent(old => !old)} alt="Toggle Transparency" />
                        <img draggable={false} className={`previewBtn transpBtn ${outline ? 'on' : ''}`} src={cubeIcon} style={{ top: '64px' }} onClick={() => setOutline(old => !old)} alt="Toggle Outline" />
                        <img draggable={false} className={`previewBtn transpBtn ${rotate ? 'on' : ''}`} src={rotateIcon} style={{ top: '96px' }} onClick={() => setRotate(old => !old)} alt="Toggle Rotation" />
                        <img draggable={false} className={`previewBtn transpBtn ${grid ? 'on' : ''}`} src={gridIcon} style={{ top: '128px' }} onClick={() => setGrid(old => !old)} alt="Toggle Grid" />
                    </>
                )}
            </div>

            <button onClick={() => { window.location.href = getDirectDownloadLink(googleDriveLink); }} style={{ marginTop: '4px', marginBottom: '2px', cursor: 'pointer' }}>
                Download
            </button>
            {
                (fileIndex !== null) && (
                    <button onClick={() => { removeCallback(fileIndex) }} style={{ marginTop: '4px', marginLeft: '4px', marginBottom: '2px', cursor: 'pointer' }}>
                        Remove
                    </button>
                )
            }
        </div>
    );
};

export default StlPreview;