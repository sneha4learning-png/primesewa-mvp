/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const OSMMap = ({ houseNo, area, address, latitude, longitude, height = "100%", width = "100%" }) => {
    const [osmBbox, setOsmBbox] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            const size = 0.002;
            Promise.resolve().then(() => {
                setOsmBbox(`${lon - size}%2C${lat - size}%2C${lon + size}%2C${lat + size}`);
                setLoading(false);
            });
            return;
        }

        const qStr = houseNo ? `${houseNo}, ${area}, Ahmedabad, India` : `${address}, Ahmedabad, India`;
        setLoading(true);
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(qStr)}&format=json&limit=1`)
            .then(r => r.json())
            .then(d => {
                if (d && d[0] && d[0].boundingbox) {
                    const [s, n, w, e] = d[0].boundingbox;
                    setOsmBbox(`${w}%2C${s}%2C${e}%2C${n}`);
                }
            }).catch(err => console.error("OSM BBOX Fetch Error:", err))
            .finally(() => setLoading(false));
    }, [houseNo, area, address, latitude, longitude]);

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
    );

    if (!osmBbox) return (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map Loading...</p>
        </div>
    );

    const markerLat = osmBbox.split('%2C')[1];
    const markerLon = osmBbox.split('%2C')[0];
    const mapUrl = `https://www.openstreetmap.org/?mlat=${markerLat}&mlon=${markerLon}#map=17/${markerLat}/${markerLon}`;

    return (
        <div className="relative w-full h-full">
            <iframe 
                width={width} 
                height={height} 
                frameBorder="0" 
                scrolling="no" 
                marginHeight="0" 
                marginWidth="0" 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${markerLat}%2C${markerLon}`}
                className="w-full h-full border-none contrast-[1.1] grayscale-[0.2]"
                title="OpenStreetMap"
            ></iframe>
            <a 
                href={mapUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="absolute inset-0 z-20 cursor-pointer"
                title="Open in OpenStreetMap for directions"
            ></a>
            <div className="absolute bottom-2 right-2 z-30 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5 opacity-80">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest">Click to Expand</span>
                </div>
            </div>
        </div>
    );
};

export default OSMMap;
