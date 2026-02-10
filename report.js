window.downloadExcelAudit = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    var masterF = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnF; });
    var masterT = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnT; });
    var lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    var dir = (lg2 > lg1) ? "DN" : "UP";
    var minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);

    var csv = "Asset Type,Location Name,Crossing Speed,Crossing Time\n";
    var log = [];
    window.master.sigs.forEach(function(sig) {
        var name = getVal(sig, ['SIGNAL_NAME']);
        var sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        var match = window.rtis.filter(function(p) { return Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002; });
        if (match.length > 0) {
            match.sort(function(a,b) { return Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)); });
            log.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", seq: window.rtis.indexOf(match[0]) });
        }
    });
    log.sort(function(a,b) { return a.seq - b.seq; }).forEach(function(r) { csv += "SIGNAL," + r.n + "," + r.s + "," + r.t + "\n"; });
    var blob = new Blob([csv], {type: 'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Audit_Excel_" + stnF + ".csv";
    a.click();
};

window.saveInteractiveWebReport = function() {
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    var pathData = JSON.stringify(window.rtis.map(function(p) { return {lt: p.lt, lg: p.lg, s: p.spd.toFixed(1), t: (getVal(p.raw,['Logging Time','Time'])||"")}; }));
    
    // Header with Custom Name Tag
    var h = '<!DOCTYPE html><html><head><title>Audit: <M.lachhhwani/CLI/TELOC/BMY></title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />';
    h += '<style>body{margin:0;display:flex;height:100vh;flex-direction:column;} #header{background:#002f6c;color:white;padding:10px;text-align:center;font-weight:bold;} #map{flex-grow:1;}</style></head><body>';
    h += '<div id="header">SECR AUDIT REPORT - <M.lachhhwani/CLI/TELOC/BMY></div>';
    h += '<div id="map"></div>';
    h += '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>';
    h += 'var m = L.map("map").setView([21.15, 79.12], 13); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);';
    h += 'var fullPath = ' + pathData + '; var pLine = L.polyline(fullPath.map(function(d){return [d.lt,d.lg]}), {color:"#333", weight:4}).addTo(m); m.fitBounds(pLine.getBounds());</script></body></html>';
    
    var blob = new Blob([h], {type: 'text/html'});
    var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "Audit_" + stnF + ".html"; link.click();
};

window.saveLiveGraphReport = function() {
    let sIdx = document.getElementById('stopage_list').value;
    if (sIdx === "" || !window.stopages[sIdx]) return alert("Select a stopage first!");
    let stop = window.stopages[sIdx];

    function getDist(lat1, lon1, lat2, lon2) {
        let R = 6371000;
        let dLat = (lat2-lat1)*Math.PI/180; let dLon = (lon2-lon1)*Math.PI/180;
        let a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    let graphData = [];
    let lastMaxDist = 0;
    // Graph Data Creation
    for (let i = stop.idx; i >= 0; i--) {
        let d = getDist(stop.lat, stop.lng, window.rtis[i].lt, window.rtis[i].lg);
        if (d > 2050) break;
        if (d >= lastMaxDist) {
            graphData.push({ d: Math.round(d), s: window.rtis[i].spd, t: getVal(window.rtis[i].raw, ['Logging Time','Time']), lat: window.rtis[i].lt, lng: window.rtis[i].lg });
            lastMaxDist = d;
        }
    }
    graphData.reverse();

    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    var masterF = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnF; });
    var masterT = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnT; });
    var lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    var dir = (lg2 > lg1) ? "DN" : "UP";

    let assets = [];
    
    // --- UPDATED ASSET MAPPING LOGIC (Same as Web Report) ---
    window.master.sigs.forEach(function(sig) {
        var name = getVal(sig, ['SIGNAL_NAME']);
        var sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sLt || !name) return;
        
        // 1. Check Direction first
        if (!sig.type.startsWith(dir)) return;

        // 2. Check if this signal is near ANY point in our Graph Data (0-2000m range)
        // This replaces the direct "Distance from Stop" check which fails on curves
        let closestGraphPoint = null;
        let minGeoDist = 999;

        graphData.forEach(gp => {
            let geoDist = Math.sqrt(Math.pow(gp.lat - sLt, 2) + Math.pow(gp.lng - sLg, 2));
            if (geoDist < 0.002 && geoDist < minGeoDist) {
                minGeoDist = geoDist;
                closestGraphPoint = gp;
            }
        });

        // 3. If a match is found within 200m radius
        if (closestGraphPoint) {
             assets.push({ n: name, d: closestGraphPoint.d });
        }
    });
    // -------------------------------------------------------

    var h = `<!DOCTYPE html><html><head><title>Braking: <M.lachhhwani/CLI/TELOC/BMY></title><script src="https://cdn.jsdelivr.net/npm/chart.js"></script><style>
        body { background:#111; color:#fff; font-family:sans-serif; padding:20px; text-align:center; }
        .container { max-width:1100px; margin:auto; background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333; }
        #chart-wrap { height:500px; width:100%; margin-top:10px; }
        #info { font-family:monospace; color:#00ff00; font-size:20px; margin-bottom:15px; background:rgba(0,0,0,0.5); padding:10px; }
        .watermark { color: #555; font-size: 12px; margin-top: 5px; }
        button { padding:15px 40px; background:#ffc107; border:none; cursor:pointer; font-weight:bold; }
    </style></head><body><div class="container">
    <h3>Braking Analysis - <M.lachhhwani/CLI/TELOC/BMY></h3>
    <div id="info">Distance: 2000m | Speed: -- | Time: --</div>
    <div id="chart-wrap"><canvas id="chart"></canvas></div>
    <button onclick="play()">PLAY / PAUSE</button>
    <div class="watermark">Generated by SECR Audit Tool - <M.lachhhwani/CLI/TELOC/BMY></div>
    </div><script>
    const data = ${JSON.stringify(graphData)};
    const assets = ${JSON.stringify(assets)};
    let isPlaying = false, idx = 0;
    const chart = new Chart(document.getElementById('chart'), {
        type: 'line', 
        data: { datasets: [{ data:[], borderColor:'#00ff00', borderWidth:3, fill:true, backgroundColor:'rgba(0,255,0,0.05)', pointRadius:0, tension:0.1 }] },
        options: { responsive:true, maintainAspectRatio:false, 
            scales: { x:{ type:'linear', min:0, max:2000, reverse:true, title:{display:true, text:'Distance (M)', color:'#888'} }, y:{ min:0, max:120, title:{display:true, text:'Speed (Kmph)', color:'#888'} } },
            plugins: { legend:{display:false} }
        },
        plugins: [{
            id:'assetLines',
            afterDraw:(chart)=>{
                const {ctx, scales:{x, y}} = chart; ctx.save();
                assets.forEach(a=>{
                    let xP = x.getPixelForValue(a.d);
                    if(xP >= x.left && xP <= x.right){
                        ctx.strokeStyle='#ff4444'; ctx.setLineDash([6,4]); ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(xP, y.top); ctx.lineTo(xP, y.bottom); ctx.stroke();
                        ctx.fillStyle='#ffc107'; ctx.save(); ctx.translate(xP-5, y.top+10); ctx.rotate(-Math.PI/2);
                        ctx.font = 'bold 12px Arial'; ctx.fillText(a.n + " ("+a.d+"m)", 0,0); ctx.restore();
                    }
                }); ctx.restore();
            }
        }]
    });
    document.getElementById('chart').onclick = () => isPlaying = !isPlaying;
    function play() { isPlaying = !isPlaying; if(isPlaying) animate(); }
    function animate() {
        if(!isPlaying || idx >= data.length) return;
        let p = data[idx]; chart.data.datasets[0].data.push({x: p.d, y: p.s}); chart.update('none');
        document.getElementById('info').innerText = "Dist: " + p.d + "m | Speed: " + p.s + " Kmph | Time: " + p.t;
        idx++; setTimeout(()=>requestAnimationFrame(animate), 50);
    }
    </script></body></html>`;
    var blob = new Blob([h], {type: 'text/html'});
    var a = document.createElement('a'); a.download = "Braking_Analysis_" + stop.time.replace(/:/g,'-') + ".html";
    a.href = URL.createObjectURL(blob); a.click();
};
