import React from 'react';
import './Menu.css';

function Menu({ menuOpen, filamentList, handleFilamentClick, selectedFilament, selectedPrinter,
    handlegcode, gcode, handleFilamentUsage, filamentUsage, handleStartPrintClick }) {

    return (
        <div className='menu'>

            <div className='grid-wrapper'>

                <div style={{ height: '50px' }}></div>

                <div className={`grid-container ${menuOpen ? 'menuOpen' : ''}`}>

                    {filamentList.map(filament => {
                        return <div className={`filament-card ${selectedFilament === filament ? 'selected' : ''}`}
                            key={filament.filamentID}
                            onClick={() => { handleFilamentClick(filament) }}>
                            <div className='leftStripe' style={{ 'backgroundColor': filament.color }}></div>
                            <div style={{ "marginTop": "10px", width: "100%" }}>
                                <h1 className='filamentID'>ID: {filament.filamentID}</h1>
                                <div style={{ "borderTop": "3px solid black", width: "100%" }}></div>
                                <div className='filaText'>Material: {filament.material}</div>
                                <div className='filaText'>Brand: {filament.brand}</div>
                                <div className='filaText'>Remaining: {filament.amountLeft_g}g</div>
                            </div>

                        </div>

                    })}
                </div>

                <div style={{ height: '100px' }}></div>
                <div className='filament-header'>Filament List</div>
                <div className='printForm'>
                    <div className='topForm'> Gcode: <input value={gcode} onChange={handlegcode} style={{ 'fontSize': 'large' }}></input></div>
                    <div className='botForm'> Filament Usage: <input value={filamentUsage} type="text" onChange={handleFilamentUsage}
                        style={{ width: '40px', 'fontSize': 'large' }}></input> g</div>
                </div>
                <div className='filament-footer' onClick={handleStartPrintClick}>
                    Start print on printer&nbsp;
                    {selectedPrinter ? "\"" + selectedPrinter.printerName + "\"" : "[NOT SELECTED]"} w/ filament&nbsp;
                    {selectedFilament ? selectedFilament.filamentID : "[NOT SELECTED]"}</div>
            </div>


        </div>
    );
}

export default Menu;