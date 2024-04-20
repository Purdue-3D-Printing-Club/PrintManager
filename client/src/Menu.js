import React from 'react';
import './Menu.css';

function Menu({ menuOpen, filamentList, handleFilamentClick, selectedFilament, selectedPrinter }) {

    return (
        <div className='menu'>

            <div className='grid-wrapper'>
                <div className='filament-header'>Filament List</div>
                <div style={{ height: '50px' }}></div>
                
                <div className={`grid-container ${menuOpen ? 'menuOpen' : ''}`}>
                    {filamentList.map(filament => {
                        return <div className={`filament-card ${selectedFilament === filament ? 'selected' : ''}`}
                            key={filament.filamentID}
                            onClick={() => { handleFilamentClick(filament) }}>
                            <h1>{filament.filamentID}</h1>
                        </div>
                    })}
                </div>
                
                <div style={{ height: '50px' }}></div>
                <div className='filament-footer'>Start print on printer&nbsp; 
                {selectedPrinter ? "\""+selectedPrinter.printerName+"\"": "[NOT SELECTED]"} with filament&nbsp;
                 {selectedFilament ? selectedFilament.filamentID : "[NOT SELECTED]"}</div>
            </div>


        </div>
    );
}

export default Menu;