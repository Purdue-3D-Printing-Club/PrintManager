import React from 'react';
import './Sidebar.css';

const Sidebar = ({printerList, handlePrinterClick, selectedPrinter, handleOpenMenu, menuOpen}) => {

function getStatusColor (printerStatus) {
    switch (printerStatus) {
        case "available": return "#1ecb60";
        case "busy": return "rgb(225, 225, 40)";
        case "broken": return "rgb(246, 97, 97)";
        default: return "silver";
    } 
}
    
    return (
        <div className="sidebar">
            <div className="mask">
            <div className="sidebtn">
                    Sign-in
                </div>
                <div className="sidebtn" onClick={() => handleOpenMenu()}>
                    {menuOpen ? "Close Print Menu" : "Open Print Menu"}
                </div>
            </div>
            <div className="hdr">
                Printer List
            </div>
            <div style={{height: '155px'}}></div>
            <div className='lowerBar'>
                {printerList.map((printer, index) => {
                    return <div className={`sidePrinter ${selectedPrinter === printer ? 'selected' : ''}`}
                         key={index}
                         onClick={() => handlePrinterClick(printer)}
                         style={{backgroundColor: getStatusColor(printer.status)}}
                    >
                    {printer.printerName} - {printer.status ? "["+printer.status+"]" : "[unknown]"}</div>
                })}
            </div>
        </div>
    );
};
export default Sidebar;
