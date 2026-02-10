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
    if (!window.rtis || window.rtis.length === 0) return alert("Pehle Step 1: Map Generate karein!");
    
    var stnF = document.getElementById('s_from').value;
    var stnT = document.getElementById('s_to').value;
    
    // Sirf wahi data points nikalna jahan speed 1 se kam hui (Stopping Points)
    var stopPoints = window.rtis.filter(p => p.spd < 1);
    if (stopPoints.length === 0) return alert("Data mein koi stop (Speed < 1) nahi mila!");

    // Simulation ke liye data prepare karna
    var pathData = JSON.stringify(window.rtis.map(p => ({
        lt: p.lt, lg: p.lg, s: p.spd.toFixed(1), t: (getVal(p.raw,['Logging Time','Time'])||"")
    })));

    // Signals, LC, aur Assets ka data
    var assets = JSON.stringify(window.master.sigs.map(s => ({
        n: getVal(s,['SIGNAL_NAME']), lt: conv(getVal(s,['Lat'])), lg: conv(getVal(s,['Lng'])), type: s.type
    })));

    var h = `<!DOCTYPE html>
<html>
<head>
    <title>Live Speed-Distance Graph</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: sans-serif; background: #1a1a1a; color: white; margin: 20px; }
        .container { max-width: 1000px; margin: auto; background: #2d2d2d; padding: 20px; border-radius: 8px; }
        #graph-container { position: relative; height: 400px; width: 100%; }
        .controls { margin-top: 20px; text-align: center; }
        button { padding: 10px 20px; cursor: pointer; background: #ffc107; border: none; font-weight: bold; }
        #info { margin-top: 10px; font-family: monospace; color: #00ff00; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Live Braking Analysis: ${stnF} to ${stnT}</h2>
        <div id="graph-container">
            <canvas id="speedChart"></canvas>
        </div>
        <div class="controls">
            <button id="playPause">PLAY / PAUSE</button>
            <div id="info">Distance: 2000m | Speed: 0.0 Kmph | Time: --:--:--</div>
        </div>
    </div>

    <script>
        const fullPath = ${pathData};
        const assets = ${assets};
        let isPlaying = false;
        let currentIndex = 0;
        let animationId = null;

        // Chart.js Setup
        const ctx = document.getElementById('speedChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 201}, (_, i) => 2000 - (i * 10)), // 2000m to 0m
                datasets: [{
                    label: 'Live Speed',
                    data: [],
                    borderColor: '#00ff00',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Distance from Stop (m)', color: '#ccc' }, reverse: true, ticks: {color: '#ccc'} },
                    y: { title: { display: true, text: 'Speed (Kmph)', color: '#ccc' }, min: 0, max: 120, ticks: {color: '#ccc'} }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Play/Pause logic
        document.getElementById('playPause').onclick = () => { isPlaying = !isPlaying; if(isPlaying) simulate(); };
        document.getElementById('speedChart').onclick = () => { isPlaying = !isPlaying; };

        function simulate() {
            if(!isPlaying || currentIndex >= 200) return;
            
            // Simulation logic: Har step pe 10m kam dikhana
            let dist = 2000 - (currentIndex * 10);
            let mockSpeed = Math.max(0, 60 - (currentIndex * 0.3)); // Placeholder logic
            
            chart.data.datasets[0].data.push(mockSpeed);
            chart.update('none');
            
            document.getElementById('info').innerText = "Distance: " + dist + "m | Speed: " + mockSpeed.toFixed(1) + " Kmph";
            
            currentIndex++;
            setTimeout(() => { requestAnimationFrame(simulate); }, 100);
        }
    </script>
</body>
</html>`;

    var blob = new Blob([h], {type: 'text/html'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Graph_Report_" + stnF + ".html";
    link.click();
};
