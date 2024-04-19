import React from 'react';
import './Sidebar.css';

const Sidebar = ({printerList}) => {
    const handlePrinterClick = (printer) => {
        
    };
    
function getStatusColor (printerStatus) {
    switch (printerStatus) {
        case "available": return "#1ecb60";
        case "busy": return "yellow";
        case "broken": return "red";
        default: return "silver";
    } 
}
    
    return (
        <div className="sidebar">
            <div className="sidebtn">
                Sign-in
            </div>
            <div className="sidebtn">
                Open Print Menu
            </div>
            <div className="hdr">
                Printer List
            </div>
            <div style={{height: '5px'}}></div>
            <div className='lowerBar'>
                {printerList.map((printer, index) => {
                    return <div className='sidePrinter' 
                         key={index}
                         onClick={() => handlePrinterClick(printer)}
                         style={{backgroundColor: getStatusColor(printer.status)}}
                    >
                    {printer.printerName}: {printer.status}</div>
                })}
            </div>
            
        </div>
    );
};
export default Sidebar;
