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
    var masterF = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnF; });
    var masterT = window.master.stns.find(function(s) { return getVal(s,['Station_Name']) === stnT; });
    var lg1 = conv(getVal(masterF,['Start_Lng'])), lg2 = conv(getVal(masterT,['Start_Lng']));
    var minLg = Math.min(lg1, lg2), maxLg = Math.max(lg1, lg2);
    var dir = (lg2 > lg1) ? "DN" : "UP";

    var reportSigs = [];
    window.master.sigs.forEach(function(sig) {
        var name = getVal(sig, ['SIGNAL_NAME']);
        var sLt = conv(getVal(sig, ['Lat'])), sLg = conv(getVal(sig, ['Lng']));
        if (!sig.type.startsWith(dir) || sLg < minLg || sLg > maxLg || name.includes("NS")) return;
        var match = window.rtis.filter(function(p) { return Math.sqrt(Math.pow(p.lt-sLt, 2) + Math.pow(p.lg-sLg, 2)) < 0.002; });
        if (match.length > 0) {
            match.sort(function(a,b) { return Math.sqrt(Math.pow(a.lt-sLt,2)+Math.pow(a.lg-sLg,2)) - Math.sqrt(Math.pow(b.lt-sLt,2)+Math.pow(b.lg-sLg,2)); });
            reportSigs.push({ n: name, s: match[0].spd.toFixed(1), t: getVal(match[0].raw, ['Logging Time','Time']) || "N/A", lt: sLt, lg: sLg, seq: window.rtis.indexOf(match[0]) });
        }
    });
    reportSigs.sort(function(a,b) { return a.seq - b.seq; });

    var pathData = JSON.stringify(window.rtis.map(function(p) { return {lt: p.lt, lg: p.lg, s: p.spd.toFixed(1), t: (getVal(p.raw,['Logging Time','Time'])||"")}; }));
    var listHtml = "";
    reportSigs.forEach(function(r) {
        listHtml += '<div class="item" onclick="flyToSig(' + r.lt + ',' + r.lg + ')"><b>' + r.n + '</b><span class="spd">' + r.s + ' Kmph</span><br><small>' + r.t + '</small></div>';
    });

    var h = '<!DOCTYPE html><html><head><title>Audit Report</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />';
    h += '<style>body{margin:0;display:flex;font-family:sans-serif;height:100vh;} #sidebar{width:320px;background:#002f6c;color:white;overflow-y:auto;padding:15px;} #map{flex-grow:1;} .item{background:rgba(255,255,255,0.1);padding:10px;margin-bottom:5px;border-radius:4px;cursor:pointer;border-left:4px solid #ffc107;} .spd{color:#00ff00;font-weight:bold;float:right;}</style></head><body>';
    h += '<div id="sidebar"><h3>Audit: ' + stnF + ' - ' + stnT + '</h3><hr>' + listHtml + '</div><div id="map"></div>';
    h += '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>';
    h += 'var m = L.map("map").setView([' + (reportSigs[0]?reportSigs[0].lt:21.1) + ',' + (reportSigs[0]?reportSigs[0].lg:79.1) + '], 13); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);';
    h += 'var fullPath = ' + pathData + '; var pLine = L.polyline(fullPath.map(function(d){return [d.lt,d.lg]}), {color:"#333", weight:4}).addTo(m); if(fullPath.length > 0) m.fitBounds(pLine.getBounds());';
    h += 'm.on("click", function(e){ var minDist=0.0005, p=null; fullPath.forEach(function(pt){ var d=Math.sqrt(Math.pow(pt.lt-e.latlng.lat,2)+Math.pow(pt.lg-e.latlng.lng,2)); if(d<minDist){minDist=d;p=pt;} }); if(p){ L.popup().setLatLng(e.latlng).setContent("Speed: "+p.s+" Kmph<br>Time: "+p.t).openOn(m); } });';
    h += 'var sigs = ' + JSON.stringify(reportSigs) + '; sigs.forEach(function(s){ L.circleMarker([s.lt, s.lg], {radius:7, color:"blue"}).addTo(m).bindTooltip(s.n+" ("+s.s+" Kmph)"); }); function flyToSig(lt, lg) { m.setView([lt, lg], 16); }</script></body></html>';

    var blob = new Blob([h], {type: 'text/html'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Audit_" + stnF + ".html";
    link.click();
};

window.saveLiveGraphReport = function() {
    let sIdx = document.getElementById('stopage_list').value;
    if (sIdx === "" || !window.stopages[sIdx]) return alert("Pehle Step 1 karein aur Stop chunein!");
    let stop = window.stopages[sIdx];

    function getDist(lat1, lon1, lat2, lon2) {
        let R = 6371000; let dLat = (lat2-lat1)*Math.PI/180; let dLon = (lon2-lon1)*Math.PI/180;
        let a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    let graphData = [];
    for (let i = stop.idx; i >= 0; i--) {
        let d = getDist(stop.lat, stop.lng, window.rtis[i].lt, window.rtis[i].lg);
        if (d > 2100) break;
        graphData.push({ d: Math.round(d), s: window.rtis[i].spd, t: getVal(window.rtis[i].raw, ['Logging Time','Time']) });
    }
    graphData.reverse();

    let assets = [];
    window.master.sigs.forEach(sig => {
        let d = getDist(stop.lat, stop.lng, conv(getVal(sig,['Lat'])), conv(getVal(sig,['Lng'])));
        if (d <= 2100) assets.push({ n: getVal(sig,['SIGNAL_NAME']), d: Math.round(d) });
    });

    var h = `<!DOCTYPE html><html><head><title>Braking Analysis</title><script src="https://cdn.jsdelivr.net/npm/chart.js"></script><style>
        body { background:#1a1a1a; color:#fff; font-family:sans-serif; padding:20px; text-align:center; }
        .container { max-width:1100px; margin:auto; background:#252525; padding:20px; border-radius:10px; border:1px solid #444; }
        #chart-wrap { height:450px; width:100%; position:relative; }
        button { padding:12px 30px; background:#ffc107; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-top:15px; }
        #info { font-family:monospace; color:#00ff00; font-size:18px; margin-bottom:15px; }
    </style></head><body><div class="container">
    <div id="info">Stop Time: ${stop.time} | Distance: 2000m | Speed: --</div>
    <div id="chart-wrap"><canvas id="chart"></canvas></div>
    <button onclick="play()">PLAY / PAUSE (Click Chart to Stop)</button>
    </div><script>
    const data = ${JSON.stringify(graphData)};
    const assets = ${JSON.stringify(assets)};
    let isPlaying = false, idx = 0;
    const ctx = document.getElementById('chart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line', data: { labels: Array.from({length:201}, (_,i)=>2000-(i*10)), datasets: [{ label:'Speed', data:[], borderColor:'#00ff00', borderWidth:2, fill:true, backgroundColor:'rgba(0,255,0,0.1)', pointRadius:0 }] },
        options: { responsive:true, maintainAspectRatio:false, 
            scales: { x:{ reverse:true, title:{display:true, text:'Distance to Stop (Meters)', color:'#fff'} }, y:{ min:0, max:120, color:'#fff' } },
            plugins: { legend:{display:false} }
        }
    });
    const originalDraw = chart.draw;
    chart.draw = function() {
        originalDraw.apply(this, arguments);
        let ctx = this.ctx;
        assets.forEach(a => {
            let x = this.scales.x.getPixelForValue(a.d);
            if(x >= this.scales.x.left && x <= this.scales.x.right) {
                ctx.strokeStyle = 'red'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x, this.scales.y.top); ctx.lineTo(x, this.scales.y.bottom); ctx.stroke();
                ctx.fillStyle = 'yellow'; ctx.save(); ctx.translate(x-2, this.scales.y.top + 10); ctx.rotate(-Math.PI/2); ctx.fillText(a.n, 0, 0); ctx.restore();
            }
        });
    };
    document.getElementById('chart').onclick = () => { isPlaying = !isPlaying; };
    function play() { isPlaying = !isPlaying; if(isPlaying) animate(); }
    function animate() {
        if(!isPlaying || idx >= data.length) return;
        let p = data[idx];
        chart.data.datasets[0].data.push({x: p.d, y: p.s}); chart.update('none');
        document.getElementById('info').innerText = "Distance: " + p.d + "m | Speed: " + p.s + " Kmph | Time: " + p.t;
        idx++; setTimeout(()=>requestAnimationFrame(animate), 50);
    }
    </script></body></html>`;

    var blob = new Blob([h], {type: 'text/html'});
    var a = document.createElement('a');
    a.download = "Braking_Graph_" + stop.time.replace(/:/g,'-') + ".html";
    a.href = URL.createObjectURL(blob); a.click();
};
