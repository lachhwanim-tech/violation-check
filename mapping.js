window.master = { stns: [], sigs: [] };
window.rtis = [];
window.stopages = [];

const map = L.map('map').setView([21.15, 79.12], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function conv(v) {
    if(!v) return null;
    let n = parseFloat(v.toString().replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : Math.floor(n/100) + ((n%100)/60);
}

function getVal(row, keys) {
    if(!row) return null;
    let foundKey = Object.keys(row).find(k => keys.some(key => k.trim().toLowerCase() === key.toLowerCase()));
    return foundKey ? row[foundKey] : null;
}

window.onload = function() {
    const ts = Date.now();
    Papa.parse("master/station.csv?v="+ts, {download:true, header:true, complete: r => {
        window.master.stns = r.data;
        let opt = r.data.map(s => '<option value="'+getVal(s,['Station_Name'])+'">'+getVal(s,['Station_Name'])+'</option>').sort().join('');
        document.getElementById('s_from').innerHTML = opt; document.getElementById('s_to').innerHTML = opt;
    }});
    const sigFiles = [{f:'up_signals.csv', t:'UP', c:'green'}, {f:'dn_signals.csv', t:'DN', c:'blue'}, {f:'up_mid_signals.csv', t:'UP_MID', c:'purple'}, {f:'dn_mid_signals.csv', t:'DN_MID', c:'red'}];
    sigFiles.forEach(cfg => {
        Papa.parse("master/"+cfg.f+"?v="+ts, {download:true, header:true, complete: r => {
            r.data.forEach(s => { s.clr = cfg.c; s.type = cfg.t; window.master.sigs.push(s); });
        }});
    });
};

function generateLiveMap() {
    const f = document.getElementById('csv_file').files[0];
    if(!f) return alert("Select RTIS CSV!");
    Papa.parse(f, {header:true, skipEmptyLines:true, complete: function(res) {
        window.rtis = []; window.stopages = []; let path = [];
        let isStopped = false;
        res.data.forEach((row, index) => {
            let lt = parseFloat(getVal(row,['Latitude','Lat'])), lg = parseFloat(getVal(row,['Longitude','Lng']));
            let spd = parseFloat(getVal(row,['Speed','Spd']));
            if(!isNaN(lt)) { 
                window.rtis.push({lt, lg, spd: spd, raw: row}); 
                path.push([lt, lg]); 
                if (spd < 1 && !isStopped) {
                    window.stopages.push({idx: window.rtis.length-1, time: getVal(row,['Logging Time','Time']), lat:lt, lng:lg});
                    isStopped = true;
                } else if (spd > 5) isStopped = false;
            }
        });
        L.polyline(path, {color: '#333', weight: 5}).addTo(map);
        map.fitBounds(path);
        let stopOpt = window.stopages.map((s, i) => `<option value="${i}">${s.time} | Stop</option>`).join('');
        document.getElementById('stopage_list').innerHTML = stopOpt || '<option>No Stops</option>';
        
        map.on('mousemove', function(e) {
            let minDist = 0.0003, speed = "0.0", time = "--:--:--"; 
            window.rtis.forEach(p => {
                let d = Math.sqrt(Math.pow(p.lt-e.latlng.lat, 2) + Math.pow(p.lg-e.latlng.lng, 2));
                if(d < minDist) { minDist = d; speed = p.spd.toFixed(1); let t = getVal(p.raw, ['Logging Time','Time']) || "--:--:--"; time = t.includes(' ') ? t.split(' ')[1] : t; }
            });
            document.getElementById('live-speed').innerText = speed;
            document.getElementById('live-time').innerText = time;
        });
        document.getElementById('log').innerText = "Map Ready.";
    }});
}
