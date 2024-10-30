import React from 'react';
import './Sidebar.css';

const Sidebar = ({ printerList, handlePrinterClick, selectedPrinter, handleOpenMenu, menuOpen, selectPrinter, width, getStatusColor }) => {


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
            </div>
            <div style={{ height: '115px' }}></div>
            <div className='lowerBar'>
                <div className={'sidePrinter'}
                    onClick={() => selectPrinter(null)}
                    style={{ backgroundColor: 'rgb(118, 152, 255)' }}> Home </div>
                {printerList.map((printer, index) => {
                    return <div className={`sidePrinter ${(selectedPrinter && (selectedPrinter.printerName === printer.printerName)) ? 'selected' : ''}`}
                        key={index}
                        onClick={() => handlePrinterClick(printer)}
                        style={{ backgroundColor: getStatusColor(printer.status) }}
                    >
                        {printer.printerName} - {printer.status ? "[" + printer.status + "]" : "[unknown]"}</div>
                })}
            </div>
        </div>
    );
};
export default Sidebar;
