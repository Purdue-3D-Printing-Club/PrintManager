import React from 'react';
import './Sidebar.css';

const Sidebar = ({printerList, handlePrinterClick, selectedPrinter, handleOpenMenu, menuOpen, selectPrinter}) => {

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
                <div className="sidebtn" style={menuOpen ? {outline: "4px solid black"} : {}} >{/*onClick={() => handleOpenMenu()}>*/}
                    {/*menuOpen ? "Close Print Menu" : "Open Print Menu"*/}
                    Disabled
                </div>
            </div>
            <div className="hdr">
                Printer List
            </div>
            <div style={{height: '115px'}}></div>
            <div className='lowerBar'>
                    <div className={'sidePrinter'}
                         onClick={() => selectPrinter(null)}
                         style={{backgroundColor: 'rgb(118, 152, 255)'}}> Clear Selection </div>
                {printerList.map((printer, index) => {
                    return <div className={`sidePrinter ${(selectedPrinter && (selectedPrinter.printerName === printer.printerName)) ? 'selected' : ''}`}
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
