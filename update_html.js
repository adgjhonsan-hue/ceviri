const fs = require('fs');

const data = JSON.parse(fs.readFileSync('analysis_results.json', 'utf8'));
const htmlPath = 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// V8 Connectivity Graph - Adana Ana Arter Bağlantıları
const connections = {
    'ÖZAL': ['MENDERES', 'KENAN EVREN', 'TÜRKMENBAŞI', 'ÇUKUROVA', 'OTOBAN'],
    'MENDERES': ['ÖZAL', 'BARAJ YOLU', 'SEYHAN'],
    'KENAN EVREN': ['ÖZAL', 'TÜRKMENBAŞI', 'MAVİ BULVAR'],
    'TÜRKMENBAŞI': ['ÖZAL', 'KENAN EVREN', 'OTOBAN', '80. YIL'],
    'BARAJ YOLU': ['MENDERES', 'GAZİPAŞA', 'İBO OSMAN', 'SEYHAN'],
    'ZİYAPAŞA': ['GAZİPAŞA', 'SEYHAN', 'E5 (D400)'],
    'GAZİPAŞA': ['ZİYAPAŞA', 'BARAJ YOLU'],
    'SEYHAN': ['BARAJ YOLU', 'ZİYAPAŞA', 'MENDERES', 'YÜREĞİR', 'E5 (D400)'],
    'E5 (D400)': ['ZİYAPAŞA', 'SEYHAN', 'KOZAN YOLU', 'KARATAŞ YOLU', 'OTOBAN'],
    'KOZAN YOLU': ['E5 (D400)', 'SARIÇAM', 'YÜREĞİR'],
    'KARATAŞ YOLU': ['E5 (D400)', 'YÜREĞİR'],
    'OTOBAN': ['ÖZAL', 'TÜRKMENBAŞI', 'E5 (D400)', 'SARIÇAM'],
    'SARIÇAM': ['KOZAN YOLU', 'OTOBAN'],
    'YÜREĞİR': ['SEYHAN', 'KOZAN YOLU', 'KARATAŞ YOLU'],
    'MAVİ BULVAR': ['KENAN EVREN', 'İBO OSMAN'],
    'İBO OSMAN': ['BARAJ YOLU', 'MAVİ BULVAR'],
    'ÇUKUROVA': ['ÖZAL'],
    '80. YIL': ['TÜRKMENBAŞI']
};

const coords = {
    'ÖZAL': [37.048, 35.284],
    'MENDERES': [37.059, 35.300],
    'ZİYAPAŞA': [36.995, 35.321],
    'GAZİPAŞA': [36.999, 35.326],
    'TÜRKMENBAŞI': [37.038, 35.273],
    'MAVİ BULVAR': [37.035, 35.305],
    'KENAN EVREN': [37.039, 35.304],
    'KOZAN YOLU': [37.015, 35.370],
    'KARATAŞ YOLU': [36.955, 35.335],
    'BARAJ YOLU': [37.017, 35.319],
    'OTOBAN': [37.042, 35.250],
    'E5 (D400)': [36.991, 35.295],
    'SARIÇAM': [37.045, 35.390],
    'SEYHAN': [36.985, 35.320],
    'YÜREĞİR': [36.985, 35.350],
    'ÇUKUROVA': [37.050, 35.280],
    '80. YIL': [37.035, 35.260],
    'İBO OSMAN': [37.010, 35.315]
};

const reportData = {
    hourly: data.hourly,
    locations: data.locations,
    heatMap: data.heatMap,
    coords: coords,
    connections: connections,
    totalMessages: data.totalMessages,
    validReports: data.validReports
};

html = html.replace(/const data = \{[\s\S]*?\};/, `const data = ${JSON.stringify(reportData, null, 2)};`);

// V8 Dijkstra Algorithm and Map Interaction
const v8Logic = `
    let map, routeLine, userMarker, startMarker, endMarker;
    let markers = {};
    let selectionState = 'START'; // 'START' or 'END'

    function initMap() {
        map = L.map('map').setView([37.01, 35.31], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        const routeStart = document.getElementById('routeStart');
        const routeEnd = document.getElementById('routeEnd');

        Object.keys(data.coords).forEach(loc => {
            const [lat, lng] = data.coords[loc];
            const circle = L.circle([lat, lng], {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.4,
                radius: 400
            }).addTo(map);
            
            markers[loc] = circle;

            let opt1 = document.createElement('option'); opt1.value = loc; opt1.innerText = loc;
            let opt2 = document.createElement('option'); opt2.value = loc; opt2.innerText = loc;
            routeStart.appendChild(opt1);
            routeEnd.appendChild(opt2);
        });

        // Set up Map Interaction
        map.on('click', onMapClick);

        document.getElementById('btnCheckRoute').onclick = checkRoute;
        hourSelect.addEventListener('change', updateMapMarkers);
        updateMapMarkers(); 

        // Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const userCoords = [pos.coords.latitude, pos.coords.longitude];
                userMarker = L.marker(userCoords, {icon: L.divIcon({className: 'user-icon', html: '📍', iconSize: [20, 20]})}).addTo(map);
                data.coords["USER_LOC"] = userCoords;
            });
        }
    }

    function onMapClick(e) {
        // Find closest hub
        let closest = null;
        let minDist = Infinity;
        
        Object.entries(data.coords).forEach(([name, coords]) => {
            const d = map.distance(e.latlng, coords);
            if (d < minDist) {
                minDist = d;
                closest = name;
            }
        });

        if (minDist > 3000) return; // Ignore if too far from any hub

        if (selectionState === 'START') {
            document.getElementById('routeStart').value = closest;
            if (startMarker) map.removeLayer(startMarker);
            startMarker = L.marker(data.coords[closest], {icon: L.divIcon({html: '🟢', className: ''})}).addTo(map).bindPopup("Başlangıç: " + closest).openPopup();
            selectionState = 'END';
        } else {
            document.getElementById('routeEnd').value = closest;
            if (endMarker) map.removeLayer(endMarker);
            endMarker = L.marker(data.coords[closest], {icon: L.divIcon({html: '🔴', className: ''})}).addTo(map).bindPopup("Hedef: " + closest).openPopup();
            selectionState = 'START';
            checkRoute(); // Auto pathfind
        }
    }

    function dijkstra(start, end, hour) {
        let dist = {};
        let prev = {};
        let queue = new Set();

        Object.keys(data.coords).forEach(node => {
            dist[node] = Infinity;
            prev[node] = null;
            queue.add(node);
        });

        dist[start] = 0;

        while (queue.size > 0) {
            let u = null;
            queue.forEach(node => {
                if (u === null || dist[node] < dist[u]) u = node;
            });

            if (u === end) break;
            queue.delete(u);

            const neighbors = data.connections[u] || [];
            neighbors.forEach(v => {
                if (!queue.has(v)) return;
                
                // Weight = Base Distance + Risk Penalty
                const hourStats = data.hourly[hour][v] || { pos: 0, total: 1 };
                const risk = (hourStats.pos / (hourStats.total || 1));
                const alt = dist[u] + 1 + (risk * 20); // Each unit of risk adds heavy "cost"
                
                if (alt < dist[v]) {
                    dist[v] = alt;
                    prev[v] = u;
                }
            });
        }

        let path = [];
        let curr = end;
        while (curr) {
            path.push(curr);
            curr = prev[curr];
        }
        return path.reverse();
    }

    function checkRoute() {
        const start = document.getElementById('routeStart').value;
        const end = document.getElementById('routeEnd').value;
        const resultDiv = document.getElementById('routeResult');
        const hour = parseInt(hourSelect.value);
        
        if (!start || !end || start === end) return;
        if (routeLine) map.removeLayer(routeLine);

        const safePath = dijkstra(start, end, hour);
        
        if (safePath.length < 2) {
             resultDiv.innerHTML = "❌ Üzgünüz, bu iki nokta arasında uygun bir rota bulamadık.";
             resultDiv.style.display = 'block';
             return;
        }

        const pathCoords = safePath.map(node => data.coords[node]);
        
        // Calculate path total risk for coloring
        let totalRisk = 0;
        safePath.forEach(node => {
             const s = data.hourly[hour][node] || {pos: 0, total: 1};
             totalRisk += (s.pos / s.total);
        });
        const avgRisk = totalRisk / safePath.length;
        const lineColor = avgRisk > 0.3 ? '#ef4444' : '#10b981';

        routeLine = L.polyline(pathCoords, {color: lineColor, weight: 8, opacity: 0.9, lineJoin: 'round'}).addTo(map);
        map.fitBounds(routeLine.getBounds());

        resultDiv.style.display = 'block';
        const guide = safePath.join(' → ');
        if (avgRisk > 0.3) {
            resultDiv.innerHTML = \`⚠️ <b>Dikkatli Olun:</b> En güvenli seçenek bile bu saatte risk barındırıyor.<br>📍 <b>Güzergah:</b> \${guide}<br>🚨 <b>Risk Nedeni:</b> Rota üzerindeki yoğun uygulama noktaları.\`;
            resultDiv.style.borderLeft = '4px solid var(--danger)';
        } else {
            resultDiv.innerHTML = \`✅ <b>Güvenli Rota Bulundu:</b> İstatistiksel olarak en temiz güzergah belirlendi.<br>📍 <b>Güzergah:</b> \${guide}<br>✨ <b>Tavsiye:</b> Bu yol şu an en sakin seçenek.\`;
            resultDiv.style.borderLeft = '4px solid var(--success)';
        }
    }

    function updateMapMarkers() {
        const hour = parseInt(hourSelect.value);
        Object.keys(markers).forEach(loc => {
            const hourStats = data.hourly[hour][loc] || { pos: 0, total: 1 };
            const risk = (hourStats.pos / (hourStats.total || 1));
            const color = risk > 0.6 ? '#ef4444' : (risk > 0.2 ? '#f59e0b' : '#3b82f6');
            markers[loc].setStyle({ color: color, fillColor: color });
            
            const riskType = (hourStats.radar > hourStats.alcohol) ? '📸 RADAR' : (hourStats.alcohol > 0 ? '🧪 ALKOL' : '🚨 ÇEVİRME');
            markers[loc].bindPopup(\`<b>\${loc}</b><br>Risk: %\${Math.round(risk*100)}<br>Tür: \${risk > 0 ? riskType : 'TEMİZ'}\`);
        });
    }
`;

html = html.replace(/let map, routeLine[\s\S]*?initMap\(\);/, v8Logic + '\n    initMap();');

// Add some CSS for the icons
const cssInjections = `
    .user-icon { background: var(--accent); border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border-radius: 50%; }
`;
if (!html.includes('.user-icon')) {
    html = html.replace('</style>', cssInjections + '\n    </style>');
}

fs.writeFileSync(htmlPath, html);
console.log('HTML Smart Routing v8 complete.');
