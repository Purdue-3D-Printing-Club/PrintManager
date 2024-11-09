import React from 'react';
import './Sidebar.css';

const Sidebar = ({ printerList, handlePrinterClick, selectedPrinter, handleOpenMenu, menuOpen, selectPrinter, width,
     getStatusColor, printerSort, handlePrinterSort, printerRefs}) => {
        const getPrinterInfo = (printer) => {
            switch (printerSort) {
                case "Printer Model": return printer.model
                case "Filament Type": return printer.filamentType
                default: return printer.status
            }
        }
    return (
        <div className="sidebar" style={{ width: `${width}px` }}>
            <div className="mask" style={{ width: `${width}px` }}>
                <div className="sidebtn" style={menuOpen ? { outline: "4px solid black" } : {}} onClick={() => handleOpenMenu()}>{/*onClick={() => handleOpenMenu()}>*/}
                    {menuOpen ? "Close" : "Settings"}
                    {/* Disabled */}
                </div>
            </div>
            <div className="hdr" style={{ width: `${width}px` }}>
                Printer List
                <div style={{fontSize:'medium'}}>
                Sort:
                <select id="printerSort" value={printerSort} onChange={handlePrinterSort}>
                    <option value="Availability">Availability</option>
                    <option value="Printer Name">Printer Name</option>
                    <option value="Printer Model">Printer Model</option>
                    <option value="Filament Type">Filament Type</option>
                </select>
                </div>
                
            </div>
            <div style={{ height: '115px' }}></div>

            <div id='lowerBar'>
                <div className={'sidePrinter'}
                    onClick={() => handlePrinterClick(null)}
                    style={{ backgroundColor: 'rgb(118, 152, 255)' }}> Home </div>
                {printerList.map((printer, index) => {
                    return <div className={`sidePrinter ${(selectedPrinter && (selectedPrinter.printerName === printer.printerName)) ? 'selected' : ''}`}
                        key={index}
                        ref={printerRefs.current[index]}
                        onClick={() => handlePrinterClick(index)}
                        style={{ backgroundColor: getStatusColor(printer.status) }}
                    >
                        {printer.printerName} - {printer.status ? "[" + getPrinterInfo(printer) + "]" : "[unknown]"}</div>
                })}
            </div>
        </div>
    );
};
export default Sidebar;
